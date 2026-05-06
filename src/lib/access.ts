import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 統一的「user 對某 course 是否有 access」判斷 (audit T0-6)
 *
 * 兩種 course access 模型(看 courses.access_type):
 * - 'purchase' (預設,大師課):靠 course_access 表 — 永久回看,不關 pro_expires_at
 * - 'pro' (Pro 訂閱限定影片):靠 profile.tier='pro' + pro_expires_at 還沒過 — 過期就鎖
 *
 * Pro 訂閱 user 想看大師課:必須另外購買(大師課送 90 天 Pro,不是反過來)。
 * 大師課買斷者想看 Pro 限定影片:必須訂 Pro(差異化清楚)。
 */
export async function hasCourseAccess(
  supabase: SupabaseClient,
  profileId: string,
  courseId: string
): Promise<boolean> {
  // 嘗試讀 access_type — column 不存在(migration 前)會回 error,降級到 purchase 行為
  const { data: course } = await supabase
    .from("courses")
    .select("access_type")
    .eq("id", courseId)
    .maybeSingle();

  if (course?.access_type === "pro") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, pro_expires_at")
      .eq("id", profileId)
      .maybeSingle();
    if (!profile) return false;
    return hasActiveProSubscription(profile);
  }

  // 'purchase' / null / column 不存在:都走 course_access
  const { data } = await supabase
    .from("course_access")
    .select("id")
    .eq("user_id", profileId)
    .eq("course_id", courseId)
    .limit(1)
    .maybeSingle();
  return !!data;
}

/**
 * 對 Pro 訂閱限定的功能(Eyesy 深度模式、AI 對話 quota 加大)的 access 判斷。
 * 區別於 hasCourseAccess — 這是 tier-based,跟 course_access 無關。
 */
export function hasActiveProSubscription(profile: {
  tier: string | null;
  pro_expires_at: string | null;
}): boolean {
  if (profile.tier !== "pro") return false;
  if (!profile.pro_expires_at) return false;
  return new Date(profile.pro_expires_at) > new Date();
}
