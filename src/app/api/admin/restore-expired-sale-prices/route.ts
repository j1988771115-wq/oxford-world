import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";
import { restoreExpiredSalePrices } from "@/lib/restore-expired-sale-prices";

export const maxDuration = 60;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Admin 手動觸發 — 跟 /api/cron/restore-expired-sale-prices 同邏輯,
 * 但走 admin auth 不走 CRON_SECRET。共用邏輯在 lib/restore-expired-sale-prices.ts。
 *
 * 用途:萬一 daily cron 沒跑或想立刻 trigger,可手動點 admin 按鈕。
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await restoreExpiredSalePrices(getAdminClient());
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result);
}
