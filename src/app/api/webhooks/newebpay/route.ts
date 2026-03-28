import { NextRequest, NextResponse } from "next/server";
import { decryptTradeInfo } from "@/lib/newebpay";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const tradeInfo = formData.get("TradeInfo") as string;

    if (!tradeInfo) {
      return NextResponse.json({ error: "Missing TradeInfo" }, { status: 400 });
    }

    const result = decryptTradeInfo(tradeInfo) as {
      Status: string;
      Result: {
        MerchantOrderNo: string;
        Amt: number;
        TradeNo: string;
      };
    };

    if (result.Status !== "SUCCESS") {
      console.error("Payment failed:", result);
      return NextResponse.json({ error: "Payment failed" }, { status: 400 });
    }

    const { MerchantOrderNo, Amt, TradeNo } = result.Result;

    // TODO: Update user access in Supabase
    // 1. Find order by MerchantOrderNo
    // 2. Grant course access or update subscription tier
    // 3. Trigger Discord bot to add user to channel
    console.log("Payment success:", { MerchantOrderNo, Amt, TradeNo });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
