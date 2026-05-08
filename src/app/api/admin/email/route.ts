import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "@/lib/email";
import { isAdmin } from "@/lib/admin-auth";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — fetch email lists stats
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const [{ count: subscriberCount }, { count: memberCount }] = await Promise.all([
    supabase.from("email_subscribers").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    subscribers: subscriberCount || 0,
    members: memberCount || 0,
  });
}

// POST — send email blast
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { target?: string; subject?: string; html?: string; replyTo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { target, subject, html, replyTo } = body;

  if (!subject || !html) {
    return NextResponse.json({ error: "subject and html are required" }, { status: 400 });
  }
  // 簡單驗 replyTo 格式
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) {
    return NextResponse.json({ error: "replyTo email format invalid" }, { status: 400 });
  }

  const supabase = createAdminClient();
  let emails: string[] = [];

  if (target === "subscribers") {
    const { data } = await supabase.from("email_subscribers").select("email");
    emails = data?.map((d) => d.email) || [];
  } else if (target === "members") {
    const { data } = await supabase.from("profiles").select("email");
    emails = data?.map((d) => d.email) || [];
  } else if (target === "pro") {
    const { data } = await supabase.from("profiles").select("email").eq("tier", "pro");
    emails = data?.map((d) => d.email) || [];
  } else if (target === "all") {
    const [{ data: subs }, { data: members }] = await Promise.all([
      supabase.from("email_subscribers").select("email"),
      supabase.from("profiles").select("email"),
    ]);
    const allEmails = [
      ...(subs?.map((d) => d.email) || []),
      ...(members?.map((d) => d.email) || []),
    ];
    emails = [...new Set(allEmails)]; // deduplicate
  } else if (target?.startsWith("course:")) {
    // course:<slug> — 寄給該課程所有有 access 的學員(購買 / 贈與 / 試讀)
    const slug = target.slice("course:".length);
    const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).single();
    if (!course) {
      return NextResponse.json({ error: `course not found: ${slug}` }, { status: 400 });
    }
    const { data: access } = await supabase
      .from("course_access")
      .select("user_id")
      .eq("course_id", course.id);
    const uids = access?.map((a) => a.user_id) || [];
    if (uids.length === 0) {
      return NextResponse.json({ error: "此課程沒有 access 學員" }, { status: 400 });
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email")
      .in("id", uids);
    emails = (profiles || []).map((p) => p.email).filter(Boolean) as string[];
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "沒有收件人" }, { status: 400 });
  }

  const result = await sendBatchEmails({ emails, subject, html, replyTo });

  return NextResponse.json({
    ...result,
    total: emails.length,
    message: `已發送 ${result.sent} 封，失敗 ${result.failed} 封`,
  });
}
