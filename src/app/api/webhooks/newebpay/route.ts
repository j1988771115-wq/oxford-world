import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay";
import { addProRole } from "@/lib/discord";
import { sendOrderConfirmation } from "@/lib/email";
import { sendCoursePurchaseAlert } from "@/lib/donate-alert";
import { addSonnetTopup } from "@/lib/chat-quota";
import { issueInvoice } from "@/lib/ezpay-invoice";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  // 即使內部錯也回 200,避免 NewebPay retry storm 把錯誤訊號淹沒
  // 真實狀況靠 log + 後台補單
  try {
    const formData = await req.formData();
    const tradeInfo = formData.get("TradeInfo") as string;
    const tradeSha = formData.get("TradeSha") as string;
    const formMerchantOrderNo = formData.get("MerchantOrderNo") as string | null;

    console.log("[newebpay-webhook] received", {
      hasTradeInfo: !!tradeInfo,
      tradeInfoLen: tradeInfo?.length,
      hasTradeSha: !!tradeSha,
      tradeShaLen: tradeSha?.length,
      formMerchantOrderNo,
    });

    if (!tradeInfo || !tradeSha) {
      console.error("[newebpay-webhook] missing TradeInfo/TradeSha");
      return NextResponse.json({ status: "ok" });
    }

    const shaOk = verifyTradeSha(tradeInfo, tradeSha);
    if (!shaOk) {
      console.error("[newebpay-webhook] TradeSha verification failed", {
        tradeInfo: tradeInfo.slice(0, 100),
      });
      return NextResponse.json({ status: "ok" });
    }

    type NewebPayResult = {
      Status: string;
      Result: { MerchantOrderNo: string; Amt: number; TradeNo: string };
    };
    let result: NewebPayResult | null = null;
    try {
      result = decryptTradeInfo(tradeInfo) as unknown as NewebPayResult;
    } catch (decErr) {
      // 解密失敗:log 完整內容,但回 200 避免 retry storm
      console.error("[newebpay-webhook] decrypt failed, but SHA verified — env key/IV mismatch?", {
        err: decErr instanceof Error ? decErr.message : String(decErr),
        tradeInfo,
      });
      return NextResponse.json({ status: "ok", note: "decrypt failed, manual fulfillment required" });
    }

    if (!result || result.Status !== "SUCCESS") {
      console.error("[newebpay-webhook] payment not success:", result);
      return NextResponse.json({ status: "ok" });
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
        `[CRITICAL] Webhook AMOUNT MISMATCH: order=${pendingOrder.amount} payload=${Amt} merchant_order=${MerchantOrderNo}`
      );
      // 回 200 避免 retry storm,人工調查走 log
      return NextResponse.json({ status: "ok", note: "amount mismatch logged" });
    }

    // C3 fix: atomic idempotent update (only update if still pending)
    const { data: justUpdated } = await supabase
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

    // codex P0 fix: 即使 justUpdated 為 null(已 paid 或重試),仍要 re-fetch 並補 fulfillment
    // 避免「先 mark paid 後 grant 失敗」造成永久缺 access 的情況
    let updatedOrder = justUpdated;
    if (!updatedOrder) {
      const { data: existing } = await supabase
        .from("orders")
        .select("*")
        .eq("merchant_order_no", MerchantOrderNo)
        .single();
      updatedOrder = existing;
    }
    if (!updatedOrder) {
      console.error("Webhook: order vanished?", MerchantOrderNo);
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
    } else if (updatedOrder.order_type === "chat_topup_149") {
      // Eyesy 深度模式加購:+500k Sonnet tokens(永不過期)
      try {
        await addSonnetTopup(updatedOrder.user_id, 1);
        console.log("Chat topup granted +500k Sonnet tokens to", updatedOrder.user_id);
      } catch (e) {
        console.error("Chat topup grant failed:", e);
        // 不回 500,避免 retry storm — log 給人工 catch
        return NextResponse.json({ status: "ok", note: "topup grant failed, manual followup" });
      }
    } else if (updatedOrder.order_type === "subscription") {
      // 訂閱設 30 天到期(月繳一次性,下個月需要再下單)
      const proExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      const { error: tierError } = await supabase
        .from("profiles")
        .update({ tier: "pro", pro_expires_at: proExpiresAt })
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
        } else if (updatedOrder.order_type === "chat_topup_149") {
          itemTitle = "Eyesy 深度模式加購（+500k Sonnet tokens）";
        }

        // 三種 order_type 都寄信:course / subscription / chat_topup_149
        await sendOrderConfirmation({
          to: profileEmail.email,
          orderType:
            updatedOrder.order_type === "chat_topup_149"
              ? "course"
              : (updatedOrder.order_type as "course" | "subscription"),
          itemTitle,
          amount: updatedOrder.amount,
          merchantOrderNo: MerchantOrderNo,
          proBundleDays,
        });

        // 推送 alert 到 drtalk01 OBS overlay (best-effort, 失敗不擋)
        if (updatedOrder.order_type === "course") {
          let courseSlug: string | undefined;
          if (updatedOrder.course_id) {
            const { data: c2 } = await supabase
              .from("courses")
              .select("slug")
              .eq("id", updatedOrder.course_id)
              .single();
            courseSlug = c2?.slug;
          }
          await sendCoursePurchaseAlert({
            donorName: profileEmail.display_name,
            donorEmail: profileEmail.email,
            amount: updatedOrder.amount,
            courseTitle: itemTitle,
            courseSlug,
          });
        }

        // 自動開立電子發票(best-effort,失敗 log + 上 admin/orders 補開)
        // 品名統一「線上教學服務」(會計報稅最穩),課程細節在備註
        try {
          const inv = await issueInvoice({
            merchantOrderNo: MerchantOrderNo,
            category: "B2C",
            buyerName: profileEmail.display_name || "牛津視界學員",
            buyerEmail: profileEmail.email,
            itemName: "線上教學服務",
            itemCount: 1,
            itemPrice: updatedOrder.amount,
            comment: `${itemTitle} (訂單 ${MerchantOrderNo})`,
          });
          if (inv.ok) {
            console.log("Invoice issued:", inv.invoiceNumber, "for", MerchantOrderNo);
            // 寫進 invoices 表(callback 也會寫,雙保險 idempotent)
            await supabase.from("invoices").upsert(
              {
                merchant_order_no: MerchantOrderNo,
                invoice_number: inv.invoiceNumber,
                invoice_trans_no: inv.invoiceTransNo,
                random_num: inv.randomNum,
                total_amt: updatedOrder.amount,
                buyer_email: profileEmail.email,
                ezpay_status: "SUCCESS",
                issued_at: inv.createTime,
                raw: inv.rawResult || {},
              },
              { onConflict: "invoice_number" }
            );
          } else {
            console.error(
              "Invoice issue FAILED:",
              MerchantOrderNo,
              inv.rawStatus,
              inv.rawMessage
            );
          }
        } catch (invErr) {
          console.error("Invoice issue exception:", invErr);
        }
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
