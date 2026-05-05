import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getChatQuota, TOPUP_PRICE_NTD, SONNET_TOPUP_PACKAGE_TOKENS } from "@/lib/chat-quota";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "no profile" }, { status: 404 });
  }

  const quota = await getChatQuota(profile.id);
  if (!quota) {
    return NextResponse.json({ error: "quota fetch failed" }, { status: 500 });
  }
  return NextResponse.json({
    inQ1: quota.inQ1,
    q1EndsAt: quota.q1EndsAt?.toISOString() || null,
    monthlyMax: quota.monthlyMax,
    monthlyRemaining: quota.monthlyRemaining,
    topupBalance: quota.topupBalance,
    totalSonnetAvailable: quota.totalSonnetAvailable,
    haikuUsedMonth: quota.haikuUsedMonth,
    yearMonth: quota.yearMonth,
    resetsAt: quota.resetsAt.toISOString(),
    topup: {
      priceNtd: TOPUP_PRICE_NTD,
      tokensPerPackage: SONNET_TOPUP_PACKAGE_TOKENS,
    },
  });
}
