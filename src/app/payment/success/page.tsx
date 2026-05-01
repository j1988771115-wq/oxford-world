import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay";
import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmation } from "@/lib/email";
import { sendCoursePurchaseAlert } from "@/lib/donate-alert";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Browser-side fallback for webhook: NotifyURL 偶爾沒打進來,user 一回到 success 頁就把訂單補上
async function reconcileOrder(
  merchantOrderNo: string,
  tradeNo: string,
  amtFromGateway: number
) {
  const supabase = getAdminClient();
  // P0 fix: 驗 Amt 對應本地 order.amount
  const { data: pending } = await supabase
    .from("orders")
    .select("amount, status")
    .eq("merchant_order_no", merchantOrderNo)
    .single();
  if (!pending) return;
  if (pending.status === "paid") return;
  if (Number(amtFromGateway) !== Number(pending.amount)) {
    console.error(
      `[success-fallback] AMOUNT MISMATCH: order=${pending.amount} gateway=${amtFromGateway}`
    );
    return;
  }

  const { data: order } = await supabase
    .from("orders")
    .update({
      status: "paid",
      newebpay_trade_no: tradeNo,
      paid_at: new Date().toISOString(),
    })
    .eq("merchant_order_no", merchantOrderNo)
    .eq("status", "pending")
    .select("*, courses(title)")
    .single();
  if (!order) return; // already processed or not found

  if (order.order_type === "course" && order.course_id) {
    await supabase.from("course_access").upsert(
      {
        user_id: order.user_id,
        course_id: order.course_id,
        access_type: "purchased",
      },
      { onConflict: "user_id,course_id,access_type" }
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", order.user_id)
      .single();
    const courseRow = order.courses as { title?: string; slug?: string } | null;
    const courseTitle = courseRow?.title || "課程";
    if (profile?.email) {
      await sendOrderConfirmation({
        to: profile.email,
        orderType: "course",
        itemTitle: courseTitle,
        amount: order.amount,
        merchantOrderNo: order.merchant_order_no,
      }).catch((e) => console.error("[success-fallback] email failed", e));
    }
    // 推 drtalk01 OBS overlay alert (best-effort)
    await sendCoursePurchaseAlert({
      donorName: profile?.display_name,
      donorEmail: profile?.email,
      amount: order.amount,
      courseTitle,
      courseSlug: courseRow?.slug,
    }).catch((e) => console.error("[success-fallback] alert failed", e));
  }
}

export default async function PaymentResultPage({ searchParams }: Props) {
  const params = await searchParams;

  // NewebPay returns TradeInfo + TradeSha via POST redirect as query params
  // or the user lands here after payment — try to parse result
  const tradeInfo = params.TradeInfo;
  const tradeSha = params.TradeSha;

  let success = false;
  let orderNo = "";
  let amount = 0;

  if (tradeInfo && tradeSha) {
    try {
      if (verifyTradeSha(tradeInfo, tradeSha)) {
        const result = decryptTradeInfo(tradeInfo) as {
          Status: string;
          Result: {
            MerchantOrderNo: string;
            Amt: number;
            TradeNo: string;
          };
        };
        if (result.Status === "SUCCESS") {
          success = true;
          orderNo = result.Result.MerchantOrderNo;
          amount = result.Result.Amt;
          // Reconcile DB in case NotifyURL didn't fire — idempotent (atomic WHERE status=pending)
          await reconcileOrder(orderNo, result.Result.TradeNo, result.Result.Amt).catch((e) =>
            console.error("[success] reconcile failed", e)
          );
        }
      }
    } catch {
      // Decryption failed — show generic result
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-8">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-black text-on-surface">付款成功！</h1>
          <p className="text-on-surface-variant">
            感謝您的購買，您的課程權限已自動開通。
          </p>
          <div className="bg-surface-container-low rounded-xl p-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">訂單編號</span>
              <span className="font-mono text-on-surface">{orderNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">付款金額</span>
              <span className="font-bold text-on-surface">NT${amount.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="block px-8 py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity"
            >
              前往學習中心
            </Link>
            <Link
              href="/courses"
              className="text-secondary font-bold hover:underline"
            >
              繼續瀏覽課程
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Payment failed or no data
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-8">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <XCircle size={48} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-on-surface">付款未完成</h1>
        <p className="text-on-surface-variant">
          付款尚未成功，您可以重新嘗試或選擇其他付款方式。
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/pricing"
            className="block px-8 py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity"
          >
            重新選擇方案
          </Link>
          <Link
            href="/courses"
            className="text-secondary font-bold hover:underline"
          >
            回到課程列表
          </Link>
        </div>
      </div>
    </main>
  );
}
