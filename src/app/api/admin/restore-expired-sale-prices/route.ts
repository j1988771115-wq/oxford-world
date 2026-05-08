import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Admin 手動觸發 — 跟 /api/cron/restore-expired-sale-prices 同邏輯,
 * 但走 admin auth 不走 CRON_SECRET,讓 admin 後台按鈕直接 call。
 *
 * 用途:萬一 daily cron 沒跑或想立刻 trigger,可手動點 admin 按鈕。
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const nowIso = new Date().toISOString();

  const { data: candidates, error: queryErr } = await supabase
    .from("courses")
    .select("id, slug, title, price, original_price, sale_ends_at")
    .lt("sale_ends_at", nowIso)
    .not("sale_ends_at", "is", null)
    .not("original_price", "is", null);

  if (queryErr) {
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({
      checked: 0, restored: 0,
      message: "沒有過期特價需要還原",
    });
  }

  const toRestore = candidates.filter(
    (c) => c.original_price && c.price < c.original_price,
  );

  if (toRestore.length === 0) {
    return NextResponse.json({
      checked: candidates.length, restored: 0,
      message: "所有過期特價都已是原價,沒有需要還原",
    });
  }

  const results: Array<{
    slug: string; title: string; ok: boolean;
    from: number; to: number; error?: string;
  }> = [];

  for (const c of toRestore) {
    const { error: updErr } = await supabase
      .from("courses")
      .update({
        price: c.original_price,
        sale_ends_at: null,
      })
      .eq("id", c.id)
      .lt("price", c.original_price as number);
    if (updErr) {
      results.push({
        slug: c.slug, title: c.title, ok: false,
        from: c.price, to: c.original_price as number,
        error: updErr.message,
      });
    } else {
      results.push({
        slug: c.slug, title: c.title, ok: true,
        from: c.price, to: c.original_price as number,
      });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;
  return NextResponse.json({
    checked: candidates.length,
    eligible: toRestore.length,
    restored: succeeded,
    failed: toRestore.length - succeeded,
    results,
    message: `已還原 ${succeeded} 筆${toRestore.length - succeeded > 0 ? `,失敗 ${toRestore.length - succeeded}` : ""}`,
  });
}
