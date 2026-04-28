import {
  Check,
  ShieldCheck,
  Crown,
  ChevronDown,
  Infinity as InfinityIcon,
} from "lucide-react";
import Link from "next/link";

const FEATURED_COURSE_SLUG = "master-space-age-capital";
const PRICE_LABEL = "NT$28,000";

export default function PricingPage() {
  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-7xl mx-auto px-8 mb-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tight mb-6 leading-tight">
            大師課
            <br />
            一次買斷，終身回看
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed">
            由久方武院長親授的太空時代資本配置課程。八堂深度內容，從 SpaceX 帝國解剖到台股太空概念股地圖，給你完整的投資框架。
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-8">
        <div className="relative bg-surface-container-lowest rounded-2xl p-12 border-2 border-amber-500/30 shadow-[0_24px_48px_-12px_rgba(13,28,50,0.12)]">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-tighter flex items-center gap-1.5">
            <Crown size={14} />
            大師課
          </div>

          <div className="mb-8 text-center">
            <h3 className="text-on-surface font-bold text-2xl mb-2">
              太空時代的資本配置
            </h3>
            <p className="text-on-surface-variant text-sm mb-6">
              下一個十年的產業革命 · 久方武院長親授
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-black text-on-surface">
                {PRICE_LABEL}
              </span>
            </div>
            <p className="text-on-surface-variant text-xs mt-3">
              一次付費，終身觀看
            </p>
          </div>

          <div className="space-y-4 mb-10">
            {[
              "8 集深度課程內容",
              "從 SpaceX、Starlink 到台股太空概念股",
              "完整資本配置實戰框架",
              "永久回看，不定期更新補充",
              "課程相關問答支援",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-amber-500 flex-shrink-0" />
                <span className="text-on-surface text-sm">{item}</span>
              </div>
            ))}
          </div>

          <Link
            href={`/courses/${FEATURED_COURSE_SLUG}`}
            className="block w-full py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity active:scale-[0.98] text-center"
          >
            查看課程詳情
          </Link>
        </div>
      </div>

      <div className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 border-t border-surface-container py-12 max-w-5xl mx-auto opacity-70">
        <div className="flex items-center gap-3 text-on-surface">
          <ShieldCheck size={24} />
          <span className="text-sm font-bold">藍新金流 · 安全支付</span>
        </div>
        <div className="flex items-center gap-3 text-on-surface">
          <InfinityIcon size={24} />
          <span className="text-sm font-bold">一次購買 · 終身觀看</span>
        </div>
      </div>

      <section className="max-w-3xl mx-auto px-8 mt-24">
        <h2 className="text-3xl font-black text-on-surface text-center mb-16">
          常見問題
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "課程影片可以看多久？",
              a: "一次購買後永久觀看，沒有時間限制。我們也會不定期更新補充教材，購買者皆可取得。",
            },
            {
              q: "有哪些付款方式？",
              a: "目前支援藍新金流信用卡付款，所有金流交易皆透過藍新加密處理。",
            },
            {
              q: "可以退款嗎？",
              a: "依消費者保護法數位內容例外規定，課程一經開通即不退款。如有任何問題請先聯繫客服。",
            },
            {
              q: "適合什麼程度的學習者？",
              a: "課程以投資邏輯與產業分析為主，適合對太空科技與資本市場有興趣、希望建立系統性投資觀點的學習者。不需任何專業背景。",
            },
          ].map((faq, i) => (
            <details
              key={i}
              className="bg-surface-container-low rounded-xl group cursor-pointer hover:bg-surface-container transition-colors"
            >
              <summary className="p-6 flex justify-between items-center list-none">
                <h4 className="font-bold text-on-surface">{faq.q}</h4>
                <ChevronDown
                  className="text-on-surface-variant transition-transform group-open:rotate-180"
                  size={20}
                />
              </summary>
              <div className="px-6 pb-6 text-on-surface-variant text-sm leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
