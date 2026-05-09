import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { hasCourseAccess } from "@/lib/access";

const COMPLETION_THRESHOLD = 0.9; // 看到 90% 視為完成
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/video/progress
 * Body: { chapterId, positionSeconds, durationSeconds? }
 *
 * 寫入 course_progress（upsert by user+chapter）
 * 完全靠 RLS 控管 — 不使用 service role,讓 DB 強制只能寫自己的進度
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  let body: {
    chapterId?: string;
    positionSeconds?: number;
    durationSeconds?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const { chapterId, positionSeconds, durationSeconds } = body;
  if (
    !chapterId ||
    !UUID_RE.test(chapterId) ||
    typeof positionSeconds !== "number" ||
    !isFinite(positionSeconds) ||
    positionSeconds < 0 ||
    positionSeconds > 86400
  ) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  // 拉章節（RLS:course_chapters select using true,任何人可讀）
  const { data: chapter } = await supabase
    .from("course_chapters")
    .select("id, course_id, is_free_preview, duration_seconds")
    .eq("id", chapterId)
    .maybeSingle();
  if (!chapter) {
    return NextResponse.json({ error: "chapter not found" }, { status: 404 });
  }

  // 拉自己的 profile（RLS 自動限定）
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  // 權限 gate:免費試看 OR (買斷 OR Pro 訂閱) — 走 hasCourseAccess
  if (!chapter.is_free_preview) {
    const ok = await hasCourseAccess(supabase, profile.id, chapter.course_id);
    if (!ok) {
      return NextResponse.json({ error: "no access" }, { status: 403 });
    }
  }

  // client 可能傳 float (e.g. 879.573333),DB column 是 integer → 必 floor
  // 否則 PG 22P02 invalid input syntax for type integer 整支 500
  const rawDuration = durationSeconds || chapter.duration_seconds || null;
  const finalDuration =
    typeof rawDuration === "number" && isFinite(rawDuration)
      ? Math.floor(rawDuration)
      : null;
  const newCompleted = !!(
    finalDuration && positionSeconds >= finalDuration * COMPLETION_THRESHOLD
  );

  // 先讀現有狀態 — 已 completed 就 sticky,不被往回拉歸零
  const { data: existing } = await supabase
    .from("course_progress")
    .select("completed, completed_at")
    .eq("user_id", profile.id)
    .eq("chapter_id", chapterId)
    .maybeSingle();

  const completed = existing?.completed || newCompleted;
  const completedAt =
    existing?.completed_at ||
    (newCompleted ? new Date().toISOString() : null);

  // upsert via user-scoped client — RLS 強制 user_id 必須對得上 auth.uid()
  const upsertPayload = {
    user_id: profile.id,
    course_id: chapter.course_id,
    chapter_id: chapterId,
    last_position_seconds: Math.floor(positionSeconds),
    duration_seconds: finalDuration,
    completed,
    completed_at: completedAt,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("course_progress")
    .upsert(upsertPayload, { onConflict: "user_id,chapter_id" });

  if (error) {
    // 移除原 service-role fallback (audit T0-10) — 等於 RLS 失效不安全
    // 完整 error 記下來給之後排查 (Vercel Pro 24h log retention)
    console.error("[video-progress] upsert failed (RLS or constraint)", {
      authUserId: user.id,
      profileId: profile.id,
      chapterId,
      courseId: chapter.course_id,
      err: { message: error.message, code: error.code, details: error.details, hint: error.hint },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // XP: 第一次完成這一章 → fire video_watched event(+10 XP via learning_events 計算)
  if (!existing?.completed && newCompleted) {
    await supabase.from("learning_events").insert({
      user_id: profile.id,
      course_id: chapter.course_id,
      event_type: "video_watched",
    });
  }

  return NextResponse.json({ ok: true, completed });
}

/**
 * GET /api/video/progress?courseId=xxx
 * 回傳該課程所有章節的進度（用於 learn page chapter list）
 * RLS 自動限定只回自己的 progress
 */
export async function GET(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const url = new URL(req.url);
  const courseId = url.searchParams.get("courseId");
  if (!courseId || !UUID_RE.test(courseId)) {
    return NextResponse.json({ error: "courseId required" }, { status: 400 });
  }

  // RLS 限定只能讀自己的 progress
  const { data } = await supabase
    .from("course_progress")
    .select("chapter_id, last_position_seconds, duration_seconds, completed, updated_at")
    .eq("course_id", courseId);

  return NextResponse.json({ progress: data || [] });
}
