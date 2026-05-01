import { createClient } from "@supabase/supabase-js";

export interface ChatUsageRow {
  user_id: string;
  year_month: string;
  sonnet_monthly_remaining: number;
  sonnet_topup_balance: number;
  haiku_tokens_used_month: number;
  q1_started_at: string | null;
  sonnet_tokens_used_total: number;
}

export interface QuotaSnapshot {
  inQ1: boolean;
  q1EndsAt: Date | null;
  monthlyRemaining: number;
  monthlyMax: number;
  topupBalance: number;
  totalSonnetAvailable: number;
  haikuUsedMonth: number;
  yearMonth: string;
  resetsAt: Date;
}

const MONTHLY_GRANT = 1_000_000;
const TOPUP_PACKAGE_TOKENS = 500_000;
export const TOPUP_PRICE_NTD = 149;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function nextMonthFirstDayTaipei(): Date {
  const now = new Date();
  // 簡化:取下月 1 號 00:00 UTC+8
  const utcMs = now.getTime();
  const taipei = new Date(utcMs + 8 * 60 * 60 * 1000);
  const next = new Date(
    Date.UTC(taipei.getUTCFullYear(), taipei.getUTCMonth() + 1, 1, 0, 0, 0)
  );
  return new Date(next.getTime() - 8 * 60 * 60 * 1000);
}

export async function getChatQuota(userId: string): Promise<QuotaSnapshot | null> {
  const admin = getAdmin();
  const { data, error } = await admin.rpc("refresh_chat_usage", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[chat-quota] refresh failed:", error.message);
    return null;
  }
  const row = data as ChatUsageRow;
  if (!row) return null;
  const q1Start = row.q1_started_at ? new Date(row.q1_started_at) : null;
  const q1End = q1Start
    ? new Date(q1Start.getTime() + 90 * 86400_000)
    : null;
  const inQ1 = !!q1End && q1End.getTime() >= Date.now();
  return {
    inQ1,
    q1EndsAt: q1End,
    monthlyRemaining: row.sonnet_monthly_remaining,
    monthlyMax: inQ1 ? MONTHLY_GRANT : 0,
    topupBalance: row.sonnet_topup_balance,
    totalSonnetAvailable: row.sonnet_monthly_remaining + row.sonnet_topup_balance,
    haikuUsedMonth: row.haiku_tokens_used_month,
    yearMonth: row.year_month,
    resetsAt: nextMonthFirstDayTaipei(),
  };
}

/** 扣 Sonnet token usage(先扣月度 grant, 再扣加購池) */
export async function consumeSonnetTokens(userId: string, tokens: number) {
  if (tokens <= 0) return;
  const admin = getAdmin();
  const { error } = await admin.rpc("consume_sonnet_tokens", {
    p_user_id: userId,
    p_tokens: tokens,
  });
  if (error) {
    console.error("[chat-quota] consume_sonnet failed:", error.message);
  }
}

export async function addHaikuUsage(userId: string, tokens: number) {
  if (tokens <= 0) return;
  const admin = getAdmin();
  await admin
    .rpc("add_haiku_usage", { p_user_id: userId, p_tokens: tokens })
    .then(({ error }) => {
      if (error) console.warn("[chat-quota] haiku usage failed:", error.message);
    });
}

/** 加購完成後加 Sonnet topup balance */
export async function addSonnetTopup(userId: string, packages: number = 1) {
  const admin = getAdmin();
  const tokens = TOPUP_PACKAGE_TOKENS * packages;
  const { error } = await admin.rpc("add_sonnet_topup", {
    p_user_id: userId,
    p_tokens: tokens,
  });
  if (error) {
    console.error("[chat-quota] add_topup failed:", error.message);
    throw error;
  }
}

export const SONNET_TOPUP_PACKAGE_TOKENS = TOPUP_PACKAGE_TOKENS;
