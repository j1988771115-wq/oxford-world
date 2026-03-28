import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptTradeInfo } from "@/lib/newebpay";
import { addProRole } from "@/lib/discord";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

    const { MerchantOrderNo, TradeNo } = result.Result;
    const supabase = getAdminClient();

    // Idempotency: check if already processed
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("*")
      .eq("merchant_order_no", MerchantOrderNo)
      .single();

    if (!existingOrder) {
      console.error("Order not found:", MerchantOrderNo);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existingOrder.status === "paid") {
      // Already processed, skip (idempotent)
      return NextResponse.json({ status: "ok" });
    }

    // Update order status
    await supabase
      .from("orders")
      .update({
        status: "paid",
        newebpay_trade_no: TradeNo,
        paid_at: new Date().toISOString(),
      })
      .eq("merchant_order_no", MerchantOrderNo);

    if (existingOrder.order_type === "course" && existingOrder.course_id) {
      // Grant course access
      await supabase.from("course_access").upsert(
        {
          user_id: existingOrder.user_id,
          course_id: existingOrder.course_id,
          access_type: "purchased",
        },
        { onConflict: "user_id,course_id,access_type" }
      );
    } else if (existingOrder.order_type === "subscription") {
      // Upgrade to Pro
      await supabase
        .from("profiles")
        .update({ tier: "pro" })
        .eq("id", existingOrder.user_id);

      // Grant Discord Pro role if connected
      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_id")
        .eq("id", existingOrder.user_id)
        .single();

      if (profile?.discord_id) {
        await addProRole(profile.discord_id);
      }
    }

    console.log("Payment processed:", MerchantOrderNo);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
