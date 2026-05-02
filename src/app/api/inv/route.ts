import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { decryptCallback } from "@/lib/ezpay-invoice";

/**
 * ezPay 電子發票背景回傳 webhook
 * 開立 / 作廢 / 折讓 後 ezPay 會 POST 過來通知
 *
 * 認證機制(P1):
 * 1. MerchantID_ 必須等於 EZPAY_MERCHANT_ID(防別人亂打)
 * 2. PostData_ 必須能用我們的 HashKey/HashIV 解密(等於 ezPay 用同金鑰加密過)
 *    解密成功 = 確定來自 ezPay
 *
 * 永遠回 200 防 retry storm,失敗只 log 不擋。
 */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const status = formData.get("Status") as string;
    const merchantId = formData.get("MerchantID_") as string;
    const postData = formData.get("PostData_") as string;

    console.log("[ezpay-callback] received", {
      status,
      merchantId,
      hasPostData: !!postData,
    });

    // P1: 比對 MerchantID_(防外部偽造)
    const expectedMid = (process.env.EZPAY_MERCHANT_ID || "").trim();
    if (expectedMid && merchantId !== expectedMid) {
      console.error(
        `[ezpay-callback] merchant mismatch: got=${merchantId} expected=${expectedMid}`
      );
      return NextResponse.json({ status: "ok", note: "merchant mismatch" });
    }

    if (!postData) {
      return NextResponse.json({ status: "ok", note: "no post data" });
    }

    const result = decryptCallback(postData);
    if (!result) {
      console.error("[ezpay-callback] decrypt failed");
      return NextResponse.json({ status: "ok", note: "decrypt failed, log only" });
    }

    console.log("[ezpay-callback] decoded", JSON.stringify(result, null, 2));

    // 寫進 invoices 表(idempotent on merchant_order_no + invoice_number)
    const supabase = getAdminClient();
    const merchantOrderNo = (result.MerchantOrderNo || result.MerchantOrderNum) as string | undefined;
    const invoiceNumber = result.InvoiceNumber as string | undefined;
    const invoiceTransNo = result.InvoiceTransNo as string | undefined;
    const randomNum = result.RandomNum as string | undefined;
    const createTime = result.CreateTime as string | undefined;
    const totalAmt = result.TotalAmt as number | undefined;
    const buyerEmail = result.BuyerEmail as string | undefined;

    if (merchantOrderNo && invoiceNumber) {
      const { error } = await supabase.from("invoices").upsert(
        {
          merchant_order_no: merchantOrderNo,
          invoice_number: invoiceNumber,
          invoice_trans_no: invoiceTransNo,
          random_num: randomNum,
          total_amt: totalAmt,
          buyer_email: buyerEmail,
          ezpay_status: status,
          issued_at: createTime,
          raw: result,
        },
        { onConflict: "invoice_number" }
      );
      if (error) {
        console.warn("[ezpay-callback] upsert invoices failed:", error.message);
      } else {
        console.log("[ezpay-callback] invoice saved:", invoiceNumber);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (e) {
    console.error("[ezpay-callback] handler error:", e);
    return NextResponse.json({ status: "ok" }); // 永遠回 200 防 retry
  }
}

// ezPay 有時也會 GET ping 確認 endpoint 還活著
export async function GET() {
  return NextResponse.json({ status: "ok", endpoint: "ezpay-invoice-webhook" });
}
