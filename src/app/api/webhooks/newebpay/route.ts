import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay";
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
    const tradeSha = formData.get("TradeSha") as string;

    if (!tradeInfo || !tradeSha) {
      return NextResponse.json({ error: "Missing TradeInfo or TradeSha" }, { status: 400 });
    }

    // C2 fix: verify TradeSha before processing
    if (!verifyTradeSha(tradeInfo, tradeSha)) {
      console.error("TradeSha verification failed");
      return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
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

    // C3 fix: atomic idempotent update (only update if still pending)
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        newebpay_trade_no: TradeNo,
        paid_at: new Date().toISOString(),
      })
      .eq("merchant_order_no", MerchantOrderNo)
      .eq("status", "pending")
      .select("*")
      .single();

    if (updateError || !updatedOrder) {
      // Either order not found or already processed (idempotent)
      console.log("Order already processed or not found:", MerchantOrderNo);
      return NextResponse.json({ status: "ok" });
    }

    // I3 fix: check errors on mutations
    if (updatedOrder.order_type === "course" && updatedOrder.course_id) {
      const { error: accessError } = await supabase.from("course_access").upsert(
        {
          user_id: updatedOrder.user_id,
          course_id: updatedOrder.course_id,
          access_type: "purchased",
        },
        { onConflict: "user_id,course_id,access_type" }
      );
      if (accessError) {
        console.error("Grant course access failed:", accessError);
        return NextResponse.json({ error: "Failed to grant access" }, { status: 500 });
      }
    } else if (updatedOrder.order_type === "subscription") {
      const { error: tierError } = await supabase
        .from("profiles")
        .update({ tier: "pro" })
        .eq("id", updatedOrder.user_id);

      if (tierError) {
        console.error("Upgrade to Pro failed:", tierError);
        return NextResponse.json({ error: "Failed to upgrade" }, { status: 500 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("discord_id")
        .eq("id", updatedOrder.user_id)
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
