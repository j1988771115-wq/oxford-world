import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay";
import { addProRole } from "@/lib/discord";
import { sendOrderConfirmation } from "@/lib/email";

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

    const { MerchantOrderNo, Amt, TradeNo } = result.Result;
    const supabase = getAdminClient();

    // P0 fix: 驗 Amt 與本地 order.amount 一致 — 防偽造 MerchantOrderNo + 挪用其他訂單簽章
    const { data: pendingOrder } = await supabase
      .from("orders")
      .select("amount, status")
      .eq("merchant_order_no", MerchantOrderNo)
      .single();
    if (!pendingOrder) {
      console.error("Webhook: order not found", MerchantOrderNo);
      return NextResponse.json({ status: "ok" }); // idempotent silent
    }
    if (pendingOrder.status === "paid") {
      console.log("Webhook: already paid", MerchantOrderNo);
      return NextResponse.json({ status: "ok" });
    }
    if (Number(Amt) !== Number(pendingOrder.amount)) {
      console.error(
        `Webhook AMOUNT MISMATCH: order=${pendingOrder.amount} payload=${Amt} merchant_order=${MerchantOrderNo}`
      );
      return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
    }

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

      // 課程附贈 Pro 邏輯：course.pro_bundle_days 有值就延長 profile.pro_expires_at
      const { data: course } = await supabase
        .from("courses")
        .select("pro_bundle_days")
        .eq("id", updatedOrder.course_id)
        .single();

      if (course?.pro_bundle_days && course.pro_bundle_days > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("pro_expires_at, discord_id")
          .eq("id", updatedOrder.user_id)
          .single();

        const now = new Date();
        const currentExpiry = profile?.pro_expires_at
          ? new Date(profile.pro_expires_at)
          : now;
        // 如果還有未過期的 Pro，從那天起再加；否則從今天起加
        const baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(
          baseDate.getTime() + course.pro_bundle_days * 86400000
        );

        const { error: tierError } = await supabase
          .from("profiles")
          .update({ tier: "pro", pro_expires_at: newExpiry.toISOString() })
          .eq("id", updatedOrder.user_id);
        if (tierError) {
          console.error("Bundle Pro grant failed:", tierError);
        }

        // Discord Pro 身分組（best-effort）
        if (profile?.discord_id) {
          await addProRole(profile.discord_id);
        }
        console.log(
          `Bundled Pro: +${course.pro_bundle_days} days, expires ${newExpiry.toISOString()}`
        );
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
        const roleAdded = await addProRole(profile.discord_id);
        if (!roleAdded) {
          console.warn("Discord role not assigned, enqueueing retry:", updatedOrder.user_id);
          await supabase
            .from("pending_discord_grants")
            .upsert(
              {
                user_id: updatedOrder.user_id,
                discord_id: profile.discord_id,
                reason: "webhook_grant_failed",
                attempts: 1,
                last_attempt_at: new Date().toISOString(),
                last_error: "addProRole returned false",
              },
              { onConflict: "user_id,discord_id" }
            );
        }
      }
    }

    // 寄購買確認信（best-effort，失敗不擋 webhook）
    try {
      const { data: profileEmail } = await supabase
        .from("profiles")
        .select("email, display_name")
        .eq("id", updatedOrder.user_id)
        .single();

      if (profileEmail?.email) {
        let itemTitle = "牛津視界";
        let proBundleDays: number | undefined;
        if (updatedOrder.order_type === "course" && updatedOrder.course_id) {
          const { data: c } = await supabase
            .from("courses")
            .select("title, pro_bundle_days")
            .eq("id", updatedOrder.course_id)
            .single();
          if (c?.title) itemTitle = c.title;
          if (c?.pro_bundle_days) proBundleDays = c.pro_bundle_days;
        } else if (updatedOrder.order_type === "subscription") {
          itemTitle = "Pro 訂閱";
        }

        await sendOrderConfirmation({
          to: profileEmail.email,
          orderType: updatedOrder.order_type as "course" | "subscription",
          itemTitle,
          amount: updatedOrder.amount,
          merchantOrderNo: MerchantOrderNo,
          proBundleDays,
        });
      }
    } catch (emailErr) {
      console.warn("Order confirmation email failed:", emailErr);
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
