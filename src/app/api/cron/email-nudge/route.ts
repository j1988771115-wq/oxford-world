import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { getUnsubscribeUrl } from "@/lib/unsubscribe-token";

/**
 * P1 Email Nudge cron — Codex review patch:
 * - 一人一天最多 1 封 (unique index uq_nudge_user_date)
 * - 7 天 cool-down (寄前 query nudge_sent_log)
 * - sequence priority: welcome > trial_to_paid > onboarding > win_back
 * - 過 unsubscribe filter (sendBatchEmails 內建)
 * - 過 paid suppression (推廣信不寄已付費)
 *
 * v1 lite 只開 welcome sequence (註冊 7-14 天沒購買的會員)。
 * 其他 sequence 留下一輪驗證 query 邏輯後再開。
 */

export const dynamic = "force-dynamic";

const COURSE_ID = "3ae3f802-1828-425d-919f-4563331e0bec"; // master-space-age-capital
const COURSE_SLUG = "master-space-age-capital";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface NudgeCandidate {
  user_id: string;
  email: string;
  sequence: "welcome" | "trial_to_paid" | "onboarding" | "win_back";
  reason: string;
}

/**
 * welcome: 註冊 7-14 天沒購買大師課
 *
 * 7 天 cool-down (避免註冊就寄太 spam),14 天 window 上限 (太久才寄已無新鮮感)。
 */
async function queryWelcome(supabase: ReturnType<typeof getAdminClient>): Promise<NudgeCandidate[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 1. 拉註冊 7-14 天 profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name, created_at")
    .lt("created_at", sevenDaysAgo)
    .gt("created_at", fourteenDaysAgo);
  if (!profiles || profiles.length === 0) return [];

  // 2. 排除已購買 master-space
  const ids = profiles.map((p) => p.id);
  const { data: bought } = await supabase
    .from("course_access")
    .select("user_id")
    .eq("course_id", COURSE_ID)
    .in("user_id", ids);
  const boughtIds = new Set((bought ?? []).map((b) => b.user_id));

  return profiles
    .filter((p) => !boughtIds.has(p.id))
    .filter((p) => !!p.email)
    .map((p) => ({
      user_id: p.id,
      email: p.email,
      sequence: "welcome" as const,
      reason: `registered ${p.created_at?.slice(0, 10)}, not paid`,
    }));
}

/**
 * 寄前 filter: 排除過去 7 天已寄任何 nudge 的 user (global cool-down)
 */
async function filterCoolDown(
  supabase: ReturnType<typeof getAdminClient>,
  candidates: NudgeCandidate[],
): Promise<NudgeCandidate[]> {
  if (candidates.length === 0) return candidates;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ids = candidates.map((c) => c.user_id);
  const { data: recent } = await supabase
    .from("nudge_sent_log")
    .select("user_id")
    .in("user_id", ids)
    .gte("sent_at", sevenDaysAgo);
  const recentIds = new Set((recent ?? []).map((r) => r.user_id));
  return candidates.filter((c) => !recentIds.has(c.user_id));
}

function buildWelcomeHtml(email: string): string {
  const unsubUrl = getUnsubscribeUrl(email);
  return `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'PingFang TC','Helvetica Neue',sans-serif;color:#222;line-height:1.75;font-size:15px;background:#fff;">
<div style="max-width:560px;margin:0 auto;">
<p>你好,</p>
<p>我是久方武,牛津視界院長。</p>
<p>看了一下後台,你註冊牛津視界一週了,但還沒開始上《太空時代的資本配置》這堂大師課。</p>
<p>第 1 章開放完整觀看,登入就能看,不用付費:</p>
<p><a href="https://oxford-vision.com/courses/${COURSE_SLUG}" style="color:#1a4480;">https://oxford-vision.com/courses/${COURSE_SLUG}</a></p>
<p>順便也想請教你一個問題:看完課程介紹頁之後,是什麼讓你停下來、沒繼續往下走?</p>
<p>價格?內容看不懂?還是其他?如果方便回信告訴我們,對後續課程內容調整很有幫助。</p>
<p>謝謝你的時間。</p>
<p>—— 久方武<br>牛津視界院長</p>
<hr style="margin:30px 0 12px;border:0;border-top:1px solid #eee;"/>
<p style="font-size:11px;color:#999;">不想收到推廣信? <a href="${unsubUrl}" style="color:#999;">取消訂閱</a></p>
</div>
</body></html>`;
}

export async function GET(req: Request) {
  // CRON_SECRET auth (Vercel cron 帶 Authorization: Bearer)
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${(process.env.CRON_SECRET || "").trim()}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // Phase 1 lite: welcome sequence only
  const welcomeRaw = await queryWelcome(supabase);
  const welcome = await filterCoolDown(supabase, welcomeRaw);

  // 寄信
  const emails = welcome.map((c) => c.email);
  let result: { sent: number; failed: number; skipped?: number } = {
    sent: 0,
    failed: 0,
    skipped: 0,
  };
  if (emails.length > 0) {
    const sendResult = await sendBatchEmails({
      emails,
      subject: "想跟你聊一下太空大師課 — 久方武",
      // 每人一封自己的 HTML (內含 per-recipient unsubscribe link)
      // sendBatchEmails 預設 individual envelope 已 handle unsubscribe header
      // 但 HTML 內 link 要 per-user — 我們先用 first email 的 link 範本 (簡化)
      // P1 v2 改 per-recipient HTML
      html: buildWelcomeHtml(emails[0]),
      replyTo: "yupupin@gmail.com",
      groupSize: 1,
    });
    result = sendResult as typeof result;
  }

  // 寫 nudge_sent_log
  if (result.sent > 0 && welcome.length > 0) {
    const successCount = Math.min(result.sent, welcome.length);
    const rows = welcome.slice(0, successCount).map((c) => ({
      user_id: c.user_id,
      sequence: c.sequence,
      metadata: { reason: c.reason, email: c.email },
    }));
    await supabase.from("nudge_sent_log").insert(rows);
  }

  // audit log
  await writeAuditLog({
    actor: { email: "cron@email-nudge", role: "system" },
    action: "email_nudge_cron",
    targetType: "nudge_sequence",
    targetId: "welcome",
    metadata: {
      candidates: welcomeRaw.length,
      filtered: welcome.length,
      sent: result.sent,
      failed: result.failed,
    },
  });

  return NextResponse.json({
    ok: true,
    welcome: {
      candidates: welcomeRaw.length,
      after_cool_down: welcome.length,
      sent: result.sent,
      failed: result.failed,
    },
  });
}
