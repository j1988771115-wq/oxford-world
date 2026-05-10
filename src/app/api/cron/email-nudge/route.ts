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

// Sequence priority: 同一 user 同天命中多個 → pick 最高 priority 一個
const SEQUENCE_PRIORITY: Record<NudgeCandidate["sequence"], number> = {
  trial_to_paid: 3, // 看過試看的最熱 lead,優先 nudge
  welcome: 2,
  onboarding: 1,
  win_back: 0,
};

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
 * trial_to_paid: 看過 ch1 免費試看 (last_position > 60s) 過去 24-72h 沒回來看 + 沒買
 *
 * 「熱 lead」— 已看過試看內容但沒下單,可能還在猶豫。
 * 24h cool-off 避免太急,72h 上限避免冷掉太久。
 */
async function queryTrialToPaid(supabase: ReturnType<typeof getAdminClient>): Promise<NudgeCandidate[]> {
  // 1. 找 ch1 (sort_order=1 — 免費試看)
  const { data: ch1 } = await supabase
    .from("course_chapters")
    .select("id")
    .eq("course_id", COURSE_ID)
    .eq("sort_order", 1)
    .maybeSingle();
  if (!ch1) return [];

  // 2. 看過 ch1 (last_position_seconds > 60),updated_at 在 24-72h 區間
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: progress } = await supabase
    .from("course_progress")
    .select("user_id, updated_at, last_position_seconds")
    .eq("chapter_id", ch1.id)
    .gt("last_position_seconds", 60)
    .lt("updated_at", dayAgo)
    .gt("updated_at", threeDaysAgo);
  if (!progress || progress.length === 0) return [];

  const watcherIds = [...new Set(progress.map((p) => p.user_id))];

  // 3. 排除已買
  const { data: bought } = await supabase
    .from("course_access")
    .select("user_id")
    .eq("course_id", COURSE_ID)
    .in("user_id", watcherIds);
  const boughtIds = new Set((bought ?? []).map((b) => b.user_id));

  // 4. 拉 email
  const candidateIds = watcherIds.filter((id) => !boughtIds.has(id));
  if (candidateIds.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", candidateIds);

  return (profiles ?? [])
    .filter((p) => !!p.email)
    .map((p) => ({
      user_id: p.id,
      email: p.email,
      sequence: "trial_to_paid" as const,
      reason: "watched ch1 free preview, 24-72h ago, not bought",
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

function buildTrialToPaidHtml(email: string): string {
  const unsubUrl = getUnsubscribeUrl(email);
  return `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'PingFang TC','Helvetica Neue',sans-serif;color:#222;line-height:1.75;font-size:15px;background:#fff;">
<div style="max-width:560px;margin:0 auto;">
<p>你好,</p>
<p>看了後台,你前天看完了《太空時代的資本配置》第 1 章免費試看。</p>
<p>想問你:</p>
<p style="padding:14px 18px;background:#f6f6f6;border-left:3px solid #888;margin:18px 0;">
<strong>看完第 1 章之後,是什麼讓你停下來、沒繼續往下走?</strong>
</p>
<p>價格?內容看不懂?還是其他?如果方便直接回信,我們會把你的回應讀完。</p>
<p>如果你還在猶豫,提醒你 5/18 之前是限時特價 NT\$24,900 (原價 NT\$30,000),省 NT\$5,100。5/18 之後自動回原價。</p>
<p><a href="https://oxford-vision.com/courses/${COURSE_SLUG}" style="color:#1a4480;">https://oxford-vision.com/courses/${COURSE_SLUG}</a></p>
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

  // 拉所有 sequence candidates
  const [welcomeRaw, trialToPaidRaw] = await Promise.all([
    queryWelcome(supabase),
    queryTrialToPaid(supabase),
  ]);

  // 同 user 命中多 sequence → pick 最高 priority
  const byUser = new Map<string, NudgeCandidate>();
  for (const c of [...welcomeRaw, ...trialToPaidRaw]) {
    const existing = byUser.get(c.user_id);
    if (!existing || SEQUENCE_PRIORITY[c.sequence] > SEQUENCE_PRIORITY[existing.sequence]) {
      byUser.set(c.user_id, c);
    }
  }
  const dedupedCandidates = Array.from(byUser.values());

  // global 7-day cool-down
  const filtered = await filterCoolDown(supabase, dedupedCandidates);

  // 按 sequence 分組,各別寄信 (subject + HTML 不同)
  type SeqResult = { sent: number; failed: number };
  const perSequence: Record<string, SeqResult> = {};

  for (const seq of ["trial_to_paid", "welcome"] as const) {
    const subset = filtered.filter((c) => c.sequence === seq);
    if (subset.length === 0) continue;
    const emails = subset.map((c) => c.email);
    const sendResult = await sendBatchEmails({
      emails,
      subject:
        seq === "trial_to_paid"
          ? "看完第 1 章了 — 久方武想問你"
          : "想跟你聊一下太空大師課 — 久方武",
      html:
        seq === "trial_to_paid"
          ? buildTrialToPaidHtml(emails[0])
          : buildWelcomeHtml(emails[0]),
      replyTo: "yupupin@gmail.com",
      groupSize: 1,
    });
    perSequence[seq] = {
      sent: sendResult.sent ?? 0,
      failed: sendResult.failed ?? 0,
    };

    // 寫 nudge_sent_log
    if (sendResult.sent && sendResult.sent > 0) {
      const successCount = Math.min(sendResult.sent, subset.length);
      const rows = subset.slice(0, successCount).map((c) => ({
        user_id: c.user_id,
        sequence: c.sequence,
        metadata: { reason: c.reason, email: c.email },
      }));
      await supabase.from("nudge_sent_log").insert(rows);
    }
  }

  // audit log
  await writeAuditLog({
    actor: { email: "cron@email-nudge", role: "system" },
    action: "email_nudge_cron",
    targetType: "nudge_sequence",
    targetId: "batch",
    metadata: {
      welcome_candidates: welcomeRaw.length,
      trial_candidates: trialToPaidRaw.length,
      after_cool_down: filtered.length,
      per_sequence: perSequence,
    },
  });

  return NextResponse.json({
    ok: true,
    candidates: {
      welcome: welcomeRaw.length,
      trial_to_paid: trialToPaidRaw.length,
    },
    after_cool_down: filtered.length,
    per_sequence: perSequence,
  });
}
