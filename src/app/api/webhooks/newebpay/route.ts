import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay";
import { addProRole } from "@/lib/discord";
import { sendOrderConfirmation, sendInstructorPurchaseAlert } from "@/lib/email";
import { sendCoursePurchaseAlert } from "@/lib/donate-alert";
import { addSonnetTopup } from "@/lib/chat-quota";
import { issueInvoice } from "@/lib/ezpay-invoice";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type HandlerStatus =
  | "ok"
  | "verification_failed"
  | "decrypt_failed"
  | "amount_mismatch"
  | "duplicate"
  | "order_not_found"
  | "business_fail"
  | "crash";

async function finalizeLog(
  supabase: SupabaseClient,
  logId: string | null,
  startedAt: number,
  http: number,
  status: HandlerStatus,
  error?: string,
  needsManual = false
) {
  if (!logId) return;
  try {
    await supabase
      .from("webhook_log")
      .update({
        http_status: http,
        handler_status: status,
        handler_error: error?.slice(0, 2000),
        duration_ms: Date.now() - startedAt,
        needs_manual: needsManual,
      })
      .eq("id", logId);
  } catch (e) {
    console.error("[newebpay-webhook] finalize log failed", e);
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const supabase = getAdminClient();

  // Read body once + capture for audit
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    // body 不是 form-data → 還是要 200 不然藍新會 retry。記到 log。
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => (headers[k] = v));
    try {
      await supabase
        .from("webhook_log")
        .insert({
          endpoint: "/api/webhooks/newebpay",
          raw_headers: headers,
          http_status: 200,
          handler_status: "verification_failed",
          handler_error: `formData parse failed: ${e instanceof Error ? e.message : String(e)}`,
          needs_manual: true,
          duration_ms: Date.now() - startedAt,
        });
    } catch {
      // best-effort
    }
    return NextResponse.json({ status: "ok", note: "body parse failed, logged" });
  }

  const tradeInfo = formData.get("TradeInfo") as string | null;
  const tradeSha = formData.get("TradeSha") as string | null;
  const formMerchantOrderNo = (formData.get("MerchantOrderNo") as string) || null;

  // 第一行寫 audit log — 即使後面 handler crash 我們也有 raw 紀錄
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));
  const rawBody: Record<string, string> = {};
  formData.forEach((v, k) => (rawBody[k] = String(v).slice(0, 8000)));

  let logId: string | null = null;
  try {
    const { data: log } = await supabase
      .from("webhook_log")
      .insert({
        endpoint: "/api/webhooks/newebpay",
        raw_headers: headers,
        raw_body: JSON.stringify(rawBody),
        merchant_order_no: formMerchantOrderNo,
      })
      .select("id")
      .single();
    logId = log?.id || null;
  } catch (logErr) {
    console.error("[newebpay-webhook] insert audit log failed (non-fatal)", logErr);
  }

  console.log("[newebpay-webhook] received", {
    logId,
    hasTradeInfo: !!tradeInfo,
    tradeInfoLen: tradeInfo?.length,
    hasTradeSha: !!tradeSha,
    tradeShaLen: tradeSha?.length,
    formMerchantOrderNo,
  });

  try {
    if (!tradeInfo || !tradeSha) {
      console.error("[newebpay-webhook] missing TradeInfo/TradeSha");
      await finalizeLog(supabase, logId, startedAt, 200, "verification_failed", "missing TradeInfo or TradeSha");
      return NextResponse.json({ status: "ok" });
    }

    const shaOk = verifyTradeSha(tradeInfo, tradeSha);
    if (!shaOk) {
      console.error("[newebpay-webhook] TradeSha verification failed", {
        tradeInfo: tradeInfo.slice(0, 100),
      });
      await finalizeLog(supabase, logId, startedAt, 200, "verification_failed", "SHA mismatch");
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
      console.error("[newebpay-webhook] decrypt failed, but SHA verified — env key/IV mismatch?", {
        err: decErr instanceof Error ? decErr.message : String(decErr),
        tradeInfo,
      });
      await finalizeLog(
        supabase,
        logId,
        startedAt,
        200,
        "decrypt_failed",
        decErr instanceof Error ? decErr.message : String(decErr),
        true
      );
      return NextResponse.json({ status: "ok", note: "decrypt failed, manual fulfillment required" });
    }

    if (!result || result.Status !== "SUCCESS") {
      console.error("[newebpay-webhook] payment not success:", result);
      await finalizeLog(supabase, logId, startedAt, 200, "ok", `payment status=${result?.Status}`);
      return NextResponse.json({ status: "ok" });
    }

    const { MerchantOrderNo, Amt, TradeNo } = result.Result;

    // 補 webhook_log 的 merchant_order_no + trade_no (audit T0-15 + Codex finding)
    // 第一行 insert webhook_log 時抓 form data 的 MerchantOrderNo 永遠是 null
    // (藍新 webhook form 沒這欄位,只有 TradeInfo / TradeSha / Status / MerchantID)
    // decrypt 完才有 — 補 update 進 audit log
    if (logId) {
      try {
        await supabase
          .from("webhook_log")
          .update({ merchant_order_no: MerchantOrderNo, trade_no: TradeNo })
          .eq("id", logId);
      } catch {
        // 若 trade_no unique violation = replay attack,記下後當作 duplicate 處理
        console.warn("[newebpay-webhook] trade_no replay detected", TradeNo);
        await finalizeLog(supabase, logId, startedAt, 200, "duplicate", `replay TradeNo=${TradeNo}`);
        return NextResponse.json({ status: "ok" });
      }
    }

    // P0 fix: 驗 Amt 與本地 order.amount 一致
    const { data: pendingOrder } = await supabase
      .from("orders")
      .select("amount, status")
      .eq("merchant_order_no", MerchantOrderNo)
      .single();
    if (!pendingOrder) {
      console.error("Webhook: order not found", MerchantOrderNo);
      await finalizeLog(supabase, logId, startedAt, 200, "order_not_found", `${MerchantOrderNo}`);
      return NextResponse.json({ status: "ok" });
    }
    if (pendingOrder.status === "paid") {
      console.log("Webhook: already paid", MerchantOrderNo);
      await finalizeLog(supabase, logId, startedAt, 200, "duplicate");
      return NextResponse.json({ status: "ok" });
    }
    if (Number(Amt) !== Number(pendingOrder.amount)) {
      console.error(
        `[CRITICAL] Webhook AMOUNT MISMATCH: order=${pendingOrder.amount} payload=${Amt} merchant_order=${MerchantOrderNo}`
      );
      await finalizeLog(
        supabase,
        logId,
        startedAt,
        200,
        "amount_mismatch",
        `order=${pendingOrder.amount} payload=${Amt}`,
        true
      );
      return NextResponse.json({ status: "ok", note: "amount mismatch logged" });
    }

    // C3 fix: atomic idempotent update
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

    let updatedOrder = justUpdated;
    // justUpdated null 代表 atomic update 沒抓到 pending row
    // 兩種情況:
    // 1. 並發 webhook — 別的 instance 剛剛 mark paid + fulfillment 跑完了 → 我們不該再跑 (audit T0-3)
    // 2. row vanished — 訂單真的消失,記 needs_manual
    if (!updatedOrder) {
      const { data: existing } = await supabase
        .from("orders")
        .select("*")
        .eq("merchant_order_no", MerchantOrderNo)
        .single();
      if (existing && existing.status === "paid") {
        // 並發雙打:對方已處理完,我們直接 duplicate return,不能再跑 fulfillment 否則 double-extend pro / double-credit token / double-email
        console.log("Webhook: concurrent duplicate (atomic update lost race)", MerchantOrderNo);
        await finalizeLog(supabase, logId, startedAt, 200, "duplicate");
        return NextResponse.json({ status: "ok" });
      }
      updatedOrder = existing;
    }
    if (!updatedOrder) {
      console.error("Webhook: order vanished?", MerchantOrderNo);
      await finalizeLog(supabase, logId, startedAt, 200, "order_not_found", `vanished after update: ${MerchantOrderNo}`, true);
      return NextResponse.json({ status: "ok" });
    }

    let businessError: string | null = null;

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
        // course_access fail 後不繼續跑 fulfillment (audit T1-9)
        // 之前繼續往下會寄「購買成功信」+ 加 Pro bundle,但 user 沒 access 會困惑
        // 200 + 標 needs_manual,讓 cron */15 重試 fulfillment
        console.error("Grant course access failed:", accessError);
        await finalizeLog(
          supabase,
          logId,
          startedAt,
          200,
          "business_fail",
          `course_access upsert: ${accessError.message}`,
          true
        );
        return NextResponse.json({ status: "ok", note: "course_access fail, will retry" });
      } else {
        const { data: course } = await supabase
          .from("courses")
          .select("pro_bundle_days")
          .eq("id", updatedOrder.course_id)
          .single();

        if (course?.pro_bundle_days && course.pro_bundle_days > 0) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("pro_expires_at, discord_id")
              .eq("id", updatedOrder.user_id)
              .single();

            const now = new Date();
            const currentExpiry = profile?.pro_expires_at
              ? new Date(profile.pro_expires_at)
              : now;
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
              businessError = (businessError || "") + ` | bundle_tier: ${tierError.message}`;
            }

            // Discord (best-effort)
            if (profile?.discord_id) {
              try {
                await addProRole(profile.discord_id);
              } catch (e) {
                console.warn("addProRole failed (non-fatal)", e);
              }
            }
            console.log(
              `Bundled Pro: +${course.pro_bundle_days} days, expires ${newExpiry.toISOString()}`
            );
          } catch (bundleErr) {
            console.error("Bundle Pro section threw", bundleErr);
            businessError = (businessError || "") + ` | bundle_throw: ${bundleErr instanceof Error ? bundleErr.message : String(bundleErr)}`;
          }
        }
      }
    } else if (updatedOrder.order_type === "chat_topup_149") {
      try {
        await addSonnetTopup(updatedOrder.user_id, 1);
        console.log("Chat topup granted +500k Sonnet tokens to", updatedOrder.user_id);
      } catch (e) {
        // topup fail 後不繼續寄「+500k tokens 已加值」郵件誤導 user (audit T1-10)
        console.error("Chat topup grant failed:", e);
        await finalizeLog(
          supabase,
          logId,
          startedAt,
          200,
          "business_fail",
          `topup: ${e instanceof Error ? e.message : String(e)}`,
          true
        );
        return NextResponse.json({ status: "ok", note: "topup fail, will retry" });
      }
    } else if (updatedOrder.order_type === "subscription") {
      // 從現有 pro_expires_at 起算延長,避免砍掉未過期 bundle (audit T0-9)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("pro_expires_at")
        .eq("id", updatedOrder.user_id)
        .single();
      const now = new Date();
      const currentExpiry = existingProfile?.pro_expires_at
        ? new Date(existingProfile.pro_expires_at)
        : now;
      const baseDate = currentExpiry > now ? currentExpiry : now;
      const proExpiresAt = new Date(baseDate.getTime() + 30 * 86400000).toISOString();

      const { error: tierError } = await supabase
        .from("profiles")
        .update({ tier: "pro", pro_expires_at: proExpiresAt })
        .eq("id", updatedOrder.user_id);

      if (tierError) {
        console.error("Upgrade to Pro failed:", tierError);
        businessError = `subscription_tier: ${tierError.message}`;
      } else {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("discord_id")
            .eq("id", updatedOrder.user_id)
            .single();

          if (profile?.discord_id) {
            try {
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
            } catch (e) {
              console.warn("addProRole subscription failed (non-fatal)", e);
            }
          }
        } catch (subErr) {
          console.warn("subscription discord block threw (non-fatal)", subErr);
        }
      }
    }

    // 寄購買確認信 / Invoice / Alert — 全部 best-effort,絕不讓藍新看到 500
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

        try {
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
        } catch (e) {
          console.warn("sendOrderConfirmation failed (non-fatal)", e);
        }

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
          try {
            await sendCoursePurchaseAlert({
              donorName: profileEmail.display_name,
              donorEmail: profileEmail.email,
              amount: updatedOrder.amount,
              courseTitle: itemTitle,
              courseSlug,
            });
          } catch (e) {
            console.warn("sendCoursePurchaseAlert failed (non-fatal)", e);
          }

          // 通知講師信箱(env COURSE_INSTRUCTOR_EMAIL,目前 = 久老師)
          const instructorEmail = (process.env.COURSE_INSTRUCTOR_EMAIL || "").trim();
          if (instructorEmail) {
            try {
              await sendInstructorPurchaseAlert({
                to: instructorEmail,
                courseTitle: itemTitle,
                buyerDisplayName: profileEmail.display_name,
                buyerEmail: profileEmail.email,
                amount: updatedOrder.amount,
                merchantOrderNo: MerchantOrderNo,
                paidAt: updatedOrder.paid_at,
              });
            } catch (e) {
              console.warn("sendInstructorPurchaseAlert failed (non-fatal)", e);
            }
          }
        }

        try {
          // 前置 dedup (audit T1-11):若 invoices 已有此訂單發票,跳過
          // 雙保險:DB 037 migration 也加了 unique constraint,但此前置 check 省一次 ezPay API 呼叫
          const { data: existingInv } = await supabase
            .from("invoices")
            .select("invoice_number")
            .eq("merchant_order_no", MerchantOrderNo)
            .maybeSingle();
          if (existingInv) {
            console.log("Invoice already issued, skip:", MerchantOrderNo, existingInv.invoice_number);
            // 跳過 issueInvoice
            throw new Error("__skip_invoice_already_issued__");
          }

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
            console.error("Invoice issue FAILED:", MerchantOrderNo, inv.rawStatus, inv.rawMessage);
          }
        } catch (invErr) {
          // 跳過 already-issued 不算錯,真實 error 才 log
          const msg = invErr instanceof Error ? invErr.message : String(invErr);
          if (msg !== "__skip_invoice_already_issued__") {
            console.error("Invoice issue exception:", invErr);
          }
        }
      }
    } catch (emailErr) {
      console.warn("Order confirmation block failed (non-fatal):", emailErr);
    }

    console.log("Payment processed:", MerchantOrderNo);
    if (businessError) {
      // 業務 fail 但不讓藍新 retry — cron */15 兜底,人工從 webhook_log 找 needs_manual
      await finalizeLog(supabase, logId, startedAt, 200, "business_fail", businessError, true);
    } else {
      await finalizeLog(supabase, logId, startedAt, 200, "ok");
    }
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    // 任何 throw 都吃下來 — 改回 200,標 needs_manual,cron */15 補
    const msg = error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error);
    console.error("Webhook error:", error);
    await finalizeLog(supabase, logId, startedAt, 200, "crash", msg, true);
    return NextResponse.json({ status: "ok", note: "internal error logged" });
  }
}
