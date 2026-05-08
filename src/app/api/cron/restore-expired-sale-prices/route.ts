import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * 每天台灣 00:01(UTC 16:01)掃所有「sale_ends_at 已過 + price < original_price」的課程,
 * 把 price 改回 original_price、sale_ends_at 設 NULL。
 *
 * 嚴謹保險:
 * - idempotent guard:只動 price < original_price 的課,改完之後 price = original_price,
 *   下次跑 condition false 就跳過
 * - sale_ends_at 必須真的過期(NOW() > sale_ends_at)才動
 * - 雙保險:frontend 也加時間檢查,即使 cron 失敗特價 badge 自動消失
 *
 * 人工觸發:GET this URL with Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "service unconfigured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const nowIso = new Date().toISOString();

  // 找符合條件的課程:sale_ends_at 已過 + price < original_price
  const { data: candidates, error: queryErr } = await supabase
    .from("courses")
    .select("id, slug, title, price, original_price, sale_ends_at")
    .lt("sale_ends_at", nowIso)
    .not("sale_ends_at", "is", null)
    .not("original_price", "is", null);

  if (queryErr) {
    console.error("[restore-prices] query failed", queryErr);
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({
      checked: 0, restored: 0, message: "no expired sale to restore",
    });
  }

  // 篩 price < original_price (idempotent guard)
  const toRestore = candidates.filter(
    (c) => c.original_price && c.price < c.original_price,
  );

  if (toRestore.length === 0) {
    return NextResponse.json({
      checked: candidates.length, restored: 0,
      message: "all eligible courses already at original_price",
    });
  }

  const results: Array<{
    slug: string; ok: boolean; from: number; to: number; error?: string;
  }> = [];

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
        slug: c.slug, ok: false, from: c.price,
        to: c.original_price as number, error: updErr.message,
      });
    } else {
      console.log(
        `[restore-prices] ${c.slug} ${c.price} → ${c.original_price}`,
      );
      results.push({
        slug: c.slug, ok: true, from: c.price,
        to: c.original_price as number,
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
  });
}
