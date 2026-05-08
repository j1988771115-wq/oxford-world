import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { restoreExpiredSalePrices } from "@/lib/restore-expired-sale-prices";

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
 * 共用邏輯在 lib/restore-expired-sale-prices.ts;admin 手動觸發走同 lib。
 *
 * 嚴謹保險:
 * - idempotent guard:query filter + update WHERE 雙重(只動 price < original_price)
 * - frontend 也加時間檢查,即使 cron 失敗特價 badge 自動消失
 */
export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "service unconfigured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await restoreExpiredSalePrices(getAdminClient());
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
