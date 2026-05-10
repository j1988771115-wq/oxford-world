import { createClient } from "@supabase/supabase-js";

/**
 * 簡單 db-backed rate limit (Codex review patch for reveal-email)。
 *
 * 用 admin_audit_logs 當 source of truth: count actor_email + action 在時間窗內次數。
 * 不另建 table 簡化。
 */

export async function checkRateLimit(params: {
  actorEmail: string;
  action: string;
  windowMinutes: number;
  maxCount: number;
}): Promise<{ allowed: boolean; current: number; max: number }> {
  const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sk) return { allowed: true, current: 0, max: params.maxCount };
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    sk,
    { auth: { persistSession: false } },
  );
  const since = new Date(Date.now() - params.windowMinutes * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("admin_audit_logs")
    .select("*", { count: "exact", head: true })
    .eq("actor_email", params.actorEmail)
    .eq("action", params.action)
    .gte("created_at", since);
  const current = count ?? 0;
  return {
    allowed: current < params.maxCount,
    current,
    max: params.maxCount,
  };
}
