import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { sendBatchEmails } from "@/lib/email";
import { isAdmin } from "@/lib/admin-auth";

const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000; // 5 分鐘 lock

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
  } else if (target?.startsWith("prospects:")) {
    // prospects:<slug> — 寄給「註冊會員但還沒買該課程」的人,推廣信用。
    //
    // 排除規則(避免雙帳號重複轟炸):
    // 1. 直接已買的 user_id 排除
    // 2. 同 display_name 也排除(處理「同一個人有多個帳號」的 case ─
    //    例如 j1988771115@gmail.com 跟 jd@onlymusic.tw 都叫黃建東,
    //    其中一個買了大師課,另一個就不該再被推廣)
    const slug = target.slice("prospects:".length);
    const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).single();
    if (!course) {
      return NextResponse.json({ error: `course not found: ${slug}` }, { status: 400 });
    }
    const { data: bought } = await supabase
      .from("course_access")
      .select("user_id")
      .eq("course_id", course.id);
    const boughtIds = new Set((bought || []).map((b) => b.user_id));
    // 抓已買學員的 display_name(去 trim,排空字串)
    let boughtNames = new Set<string>();
    if (boughtIds.size > 0) {
      const { data: boughtProfiles } = await supabase
        .from("profiles")
        .select("display_name")
        .in("id", [...boughtIds]);
      boughtNames = new Set(
        (boughtProfiles || [])
          .map((p) => p.display_name?.trim())
          .filter((n): n is string => !!n),
      );
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name");
    emails = (profiles || [])
      .filter((p) => {
        if (boughtIds.has(p.id)) return false;
        // 同名也排除(雙帳號保險)
        const name = p.display_name?.trim();
        if (name && boughtNames.has(name)) return false;
        return !!p.email;
      })
      .map((p) => p.email) as string[];
  }

  if (emails.length === 0) {
    return NextResponse.json({ error: "沒有收件人" }, { status: 400 });
  }

  // 監控收件人:不論什麼 target,JD 跟久老師都收到一份
  // 用途:看信件實際長相、是否進垃圾匣、寄出真的成功
  const MONITORING_EMAILS = ["j1988771115@gmail.com", "yupupin@gmail.com"];
  emails = [...new Set([...emails, ...MONITORING_EMAILS])];

  // === Idempotency lock (P0 防重複寄) ===
  // 5 分鐘內同 (target + subject) 視為重複,拒(429)。網路 timeout 後 refresh 再點
  // 不會重發。subject_hash 比對 — short hash 快、輕微 typo 算新一封。
  const subjectHash = createHash("sha256")
    .update(`${target}::${subject}`)
    .digest("hex")
    .slice(0, 32);
  const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("email_send_log")
    .select("id, sent_at, sent_count")
    .eq("subject_hash", subjectHash)
    .gte("sent_at", since)
    .limit(1);
  if (recent && recent.length > 0) {
    const r = recent[0];
    return NextResponse.json(
      {
        error: `5 分鐘內已寄過同主旨同對象(${r.sent_count} 封),拒重複寄。要重寄請改主旨或等 5 分鐘`,
        last_sent_at: r.sent_at,
      },
      { status: 429 },
    );
  }

  const result = await sendBatchEmails({ emails, subject, html, replyTo });

  // 寫 log(寄完才 insert,失敗也記但 sent_count=0)
  await supabase.from("email_send_log").insert({
    target: target ?? "all",
    subject,
    subject_hash: subjectHash,
    recipient_count: emails.length,
    sent_count: result.sent ?? 0,
    failed_count: result.failed ?? 0,
  });

  return NextResponse.json({
    ...result,
    total: emails.length,
    message: `已發送 ${result.sent} 封,失敗 ${result.failed} 封`,
  });
}
