import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminActor } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Reveal full email for a specific target (order / profile / course_access)。
 *
 * Codex review patch:
 * - 列表預設 masked,要看完整必須走此 endpoint
 * - 每次 audit log
 * - rate limit: instructor 50/day, admin 200/day
 * - 禁 bulk reveal: 一次只回一個 email
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { targetType?: string; targetId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { targetType, targetId } = body;
  if (!targetType || !targetId) {
    return NextResponse.json(
      { error: "targetType + targetId required" },
      { status: 400 },
    );
  }
  if (!["order", "profile", "course_access"].includes(targetType)) {
    return NextResponse.json({ error: "invalid targetType" }, { status: 400 });
  }

  // rate limit
  const maxPerDay = actor.role === "superadmin" || actor.role === "admin" ? 200 : 50;
  const rl = await checkRateLimit({
    actorEmail: actor.email ?? "legacy",
    action: "reveal_email",
    windowMinutes: 24 * 60,
    maxCount: maxPerDay,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `rate limit exceeded: ${rl.current}/${rl.max} per day` },
      { status: 429 },
    );
  }

  // service role 拿真實 email
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    sk,
    { auth: { persistSession: false } },
  );

  let email: string | null = null;
  let courseId: string | null = null;

  if (targetType === "order") {
    const { data } = await supabase
      .from("orders")
      .select("user_id, course_id")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "order not found" }, { status: 404 });
    courseId = data.course_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", data.user_id)
      .maybeSingle();
    email = profile?.email ?? null;
  } else if (targetType === "profile") {
    const { data } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", targetId)
      .maybeSingle();
    email = data?.email ?? null;
  } else if (targetType === "course_access") {
    const { data } = await supabase
      .from("course_access")
      .select("user_id, course_id")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    courseId = data.course_id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", data.user_id)
      .maybeSingle();
    email = profile?.email ?? null;
  }

  if (!email) {
    return NextResponse.json({ error: "email not found" }, { status: 404 });
  }

  // instructor 必須對該 course 有 permission
  if (actor.role === "instructor") {
    if (!courseId) {
      return NextResponse.json(
        { error: "instructor cannot reveal email without course context" },
        { status: 403 },
      );
    }
    const { data: perm } = await supabase
      .from("course_permissions")
      .select("permission")
      .eq("course_id", courseId)
      .eq("user_id", actor.profileId)
      .maybeSingle();
    if (!perm) {
      return NextResponse.json(
        { error: "no permission for this course" },
        { status: 403 },
      );
    }
  }

  // audit log (PII whitelist auto sanitize)
  await writeAuditLog({
    actor,
    action: "reveal_email",
    targetType,
    targetId,
    metadata: { revealed_email: email, course_id: courseId },
    request: req,
  });

  return NextResponse.json({
    email,
    rate_limit: { remaining: rl.max - rl.current - 1, max: rl.max },
  });
}
