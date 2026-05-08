/**
 * 共用邏輯:掃 sale_ends_at 已過 + price < original_price 的課程,
 * 把 price 改回 original_price、sale_ends_at 設 NULL。
 *
 * cron (/api/cron/restore-expired-sale-prices) + admin 手動觸發
 * (/api/admin/restore-expired-sale-prices) 都 call 這個 function。
 *
 * Idempotent:query filter + update WHERE 雙重 guard,改完條件不符下次跳過。
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RestoreResult {
  slug: string;
  title: string;
  ok: boolean;
  from: number;
  to: number;
  error?: string;
}

export interface RestoreSummary {
  checked: number;
  eligible: number;
  restored: number;
  failed: number;
  results: RestoreResult[];
  message: string;
}

export async function restoreExpiredSalePrices(
  supabase: SupabaseClient,
): Promise<RestoreSummary | { error: string }> {
  const nowIso = new Date().toISOString();

  const { data: candidates, error: queryErr } = await supabase
    .from("courses")
    .select("id, slug, title, price, original_price, sale_ends_at")
    .lt("sale_ends_at", nowIso)
    .not("sale_ends_at", "is", null)
    .not("original_price", "is", null);

  if (queryErr) {
    console.error("[restore-prices] query failed", queryErr);
    return { error: queryErr.message };
  }

  if (!candidates || candidates.length === 0) {
    return {
      checked: 0,
      eligible: 0,
      restored: 0,
      failed: 0,
      results: [],
      message: "沒有過期特價需要還原",
    };
  }

  // 篩 price < original_price (idempotent guard)
  const toRestore = candidates.filter(
    (c) => c.original_price && c.price < c.original_price,
  );

  if (toRestore.length === 0) {
    return {
      checked: candidates.length,
      eligible: 0,
      restored: 0,
      failed: 0,
      results: [],
      message: "所有過期特價都已是原價,沒有需要還原",
    };
  }

  const results: RestoreResult[] = [];
  for (const c of toRestore) {
    const { error: updErr } = await supabase
      .from("courses")
      .update({
        price: c.original_price,
        sale_ends_at: null,
      })
      .eq("id", c.id)
      .lt("price", c.original_price as number); // double guard

    if (updErr) {
      console.error(`[restore-prices] ${c.slug} update failed`, updErr);
      results.push({
        slug: c.slug,
        title: c.title,
        ok: false,
        from: c.price,
        to: c.original_price as number,
        error: updErr.message,
      });
    } else {
      console.log(
        `[restore-prices] ${c.slug} ${c.price} → ${c.original_price}`,
      );
      results.push({
        slug: c.slug,
        title: c.title,
        ok: true,
        from: c.price,
        to: c.original_price as number,
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  return {
    checked: candidates.length,
    eligible: toRestore.length,
    restored: succeeded,
    failed: toRestore.length - succeeded,
    results,
    message: `已還原 ${succeeded} 筆${toRestore.length - succeeded > 0 ? `,失敗 ${toRestore.length - succeeded}` : ""}`,
  };
}
