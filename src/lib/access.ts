import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 統一的「user 對某 course 是否有 access」判斷 (audit T0-6)
 *
 * 設計原則:
 * - 只看 course_access 表 — UI 寫「Pro 訂閱不含大師課,需另購」,所以 tier='pro' 不該
 *   隱含放行所有課程
 * - course_access 不關 pro_expires_at,user 已買的課就是已買的(永久回看)
 * - Pro 訂閱實際給的是 chat quota / Eyesy 深度模式等,不是「免費看付費課程」
 *
 * 解決 audit 問題:
 * - learn/[courseId]/page.tsx 之前用 tier === 'pro' 放行 → Pro 過期還能看,且 Pro 訂閱
 *   沒買大師課也能看(跟 UI 矛盾)
 * - signed-token / video/progress 已經是用 course_access,跟此函數一致
 *
 * Pro 訂閱 user 想看大師課:必須另外購買 (UI 寫明)
 */
export async function hasCourseAccess(
  supabase: SupabaseClient,
  profileId: string,
  courseId: string
): Promise<boolean> {
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
