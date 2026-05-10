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

  let body: { target?: string; subject?: string; html?: string; replyTo?: string; groupSize?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { target, subject, html, replyTo } = body;
  // groupSize:1 = 個別寄送(預設,個資安全但 Gmail 易進 Promotions)
  //           5+ = N 人 BCC 一封,個資仍安全 + envelope 少 → Primary inbox 機率高
  const groupSize = Math.max(1, Math.min(50, body.groupSize ?? 1));

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

  // === Idempotency lock (atomic, race-safe) ===
  // 改 hash content 不 hash subject(subject 微改容易繞過,5/10 incident 主因之一)。
  // 用 supabase RPC acquire_email_send_lock 走 pg_try_advisory_xact_lock + atomic
  // INSERT placeholder,擋並行請求(A+B 同時進場 race condition,Gemini review 抓到)。
  const normalizedHtml = (html ?? "").replace(/\s+/g, " ").trim();
  const contentHash = createHash("sha256")
    .update(`${target}::${replyTo ?? ""}::${normalizedHtml}`)
    .digest("hex")
    .slice(0, 32);
  const { data: lockOk, error: lockErr } = await supabase.rpc(
    "acquire_email_send_lock",
    {
      p_hash: contentHash,
      p_window_minutes: 5,
    },
  );
  if (lockErr) {
    console.error("[admin/email] acquire lock failed:", lockErr);
    return NextResponse.json(
      { error: "lock check failed: " + lockErr.message },
      { status: 500 },
    );
  }
  if (!lockOk) {
    return NextResponse.json(
      {
        error: "5 分鐘內已寄過同內容信件 OR 並行請求處理中,拒重複寄。等 5 分鐘 OR 真改信件內容",
      },
      { status: 429 },
    );
  }

  // === Daily quota check (Resend free tier 100/day) ===
  // 5/10 incident:Music King + Oxford 共用 Resend account 100/day quota,
  // 凌晨 219 封超 quota → Resend throttle delivery ~10hr → 學員下午才收到 +
  // 含 30 to 暴露版兩封。
  //
  // 修法:
  // 1. 兩 project 應分開 Resend account (long-term)
  // 2. 寄前 check 今天 oxford 自己已寄量 + 預估 + 其他 project buffer
  // 3. 爆 cap 直接 429 拒,不 throttle
  //
  // RESEND_OTHER_PROJECTS_DAILY env 控制其他 project (e.g. Music King) 預估每日量,
  // 若 oxford / Music King 分開 Resend account 後設 0 解除 buffer。
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { data: todayLog } = await supabase
    .from("email_send_log")
    .select("sent_count")
    .gte("sent_at", dayStart.toISOString());
  const todaySent = (todayLog ?? []).reduce(
    (sum, r) => sum + (r.sent_count ?? 0),
    0,
  );
  const RESEND_DAILY_CAP = parseInt(process.env.RESEND_DAILY_CAP || "100", 10);
  const otherProjectsDaily = parseInt(
    process.env.RESEND_OTHER_PROJECTS_DAILY || "0",
    10,
  );
  const projectedTotal = todaySent + emails.length + otherProjectsDaily;
  if (projectedTotal > RESEND_DAILY_CAP) {
    return NextResponse.json(
      {
        error: `Resend daily quota 預估爆: 今日 oxford 已寄 ${todaySent} 封 + 其他 project buffer ${otherProjectsDaily} 封 + 此次 ${emails.length} 封 = ${projectedTotal} > ${RESEND_DAILY_CAP}/day。爆 quota 會延遲 ~10 hr deliver。請等明天 UTC 重置或升 Resend Pro`,
        today_sent: todaySent,
        projected_total: projectedTotal,
        cap: RESEND_DAILY_CAP,
      },
      { status: 429 },
    );
  }

  const result = await sendBatchEmails({ emails, subject, html, replyTo, groupSize });

  // acquire_email_send_lock RPC 已 INSERT placeholder row(target=PENDING),寄完
  // UPDATE 該 row 補真實 target/subject/counts。subject_hash 同。
  await supabase
    .from("email_send_log")
    .update({
      target: target ?? "all",
      subject,
      recipient_count: emails.length,
      sent_count: result.sent ?? 0,
      failed_count: result.failed ?? 0,
    })
    .eq("subject_hash", contentHash)
    .eq("target", "PENDING")
    .gte(
      "sent_at",
      new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString(),
    );

  return NextResponse.json({
    ...result,
    total: emails.length,
    message: `已發送 ${result.sent} 封,失敗 ${result.failed} 封`,
  });
}
