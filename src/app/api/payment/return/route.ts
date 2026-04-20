import { NextRequest, NextResponse } from "next/server";

// NewebPay ReturnURL — receives POST with form data after payment
// Redirects the user's browser to the success page with encrypted params
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const tradeInfo = formData.get("TradeInfo") as string | null;
  const tradeSha = formData.get("TradeSha") as string | null;

  const params = new URLSearchParams();
  if (tradeInfo) params.set("TradeInfo", tradeInfo);
  if (tradeSha) params.set("TradeSha", tradeSha);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oxford-vision.com";
  return NextResponse.redirect(`${baseUrl}/payment/success?${params.toString()}`, 303);
}
