import { decryptTradeInfo, verifyTradeSha } from "@/lib/newebpay";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
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
          };
        };
        if (result.Status === "SUCCESS") {
          success = true;
          orderNo = result.Result.MerchantOrderNo;
          amount = result.Result.Amt;
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
