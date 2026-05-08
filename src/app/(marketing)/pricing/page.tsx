import {
  Check,
  ShieldCheck,
  Crown,
  ChevronDown,
  Infinity as InfinityIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { BreadcrumbJsonLd } from "@/lib/breadcrumb";

const FEATURED_COURSE_SLUG = "master-space-age-capital";
const PRO_MONTHLY_NTD = 999;

export const metadata = {
  title: "方案與訂閱 — 牛津視界",
  description: "大師課單課買斷 + Pro 月訂閱方案。久方武院長親授，AI 助教 24/7 即問即答。",
  alternates: { canonical: "/pricing" },
};

export const revalidate = 60;

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function loadFeaturedCourse() {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("courses")
    .select(
      "title, description, price, original_price, pro_bundle_days, instructor, sale_ends_at"
    )
    .eq("slug", FEATURED_COURSE_SLUG)
    .maybeSingle();
  return data;
}

function fmtSaleEnd(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // 台北時區顯示 M/D
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  return `${m}/${dd} 結束`;
}

export default async function PricingPage() {
  const course = await loadFeaturedCourse();
  const price = course?.price ?? 24900;
  const originalPrice = course?.original_price;
  const bundleDays = course?.pro_bundle_days ?? 0;
  const saleEndLabel = fmtSaleEnd(course?.sale_ends_at ?? null);
  const fmt = (n: number) => `NT$${n.toLocaleString()}`;

  return (
    <main className="pt-12 pb-24 bg-surface">
      <BreadcrumbJsonLd crumbs={[{ name: "訂閱方案", url: "/pricing" }]} />
      <div className="max-w-7xl mx-auto px-8 mb-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tight mb-6 leading-tight">
            大師課
            <br />
            一次買斷,1 年無限看 + 之後贈送回看
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed">
            由久方武院長親授的太空時代資本配置課程,從 SpaceX 大敘事到 8 隻精選美股,給你完整的投資框架。
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 grid md:grid-cols-2 gap-6 items-stretch">
        {/* 大師課 (主推) */}
        <div className="relative bg-surface-container-lowest rounded-2xl border-2 border-amber-500/40 shadow-[0_24px_48px_-12px_rgba(13,28,50,0.18)] flex flex-col overflow-hidden">
          {originalPrice && originalPrice > price &&
            (!course?.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
            <div className="bg-amber-500 text-white text-center py-2.5 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
              <Sparkles size={12} />
              限時特價{saleEndLabel ? ` · ${saleEndLabel}` : ""}
            </div>
          )}

          <div className="p-10 flex flex-col flex-1">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.18em] mb-4">
                <Crown size={11} />
                大師課
              </div>
              <h3 className="text-on-surface font-bold text-2xl mb-2 leading-snug">
                {course?.title ?? "太空時代的資本配置"}
              </h3>
              <p className="text-on-surface-variant text-sm mb-7">
                下一個十年的產業革命 · {course?.instructor ?? "久方武"} 院長親授
              </p>
              <div className="flex items-baseline justify-center gap-3 mb-2">
                {originalPrice && originalPrice > price &&
                  (!course?.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                  <span className="text-xl text-on-surface-variant line-through">
                    {fmt(originalPrice)}
                  </span>
                )}
                <span className="text-5xl font-black text-on-surface tracking-tight">
                  {fmt(price)}
                </span>
              </div>
              <p className="text-on-surface-variant text-xs">
                一次付費 · 1 年無限看 + 之後贈送回看
                {bundleDays > 0 ? ` · 加贈 Pro ${bundleDays} 天` : ""}
              </p>
            </div>

            <div className="space-y-3 mb-8 flex-1">
              {[
                "10 章深度課程內容",
                "SpaceX 等大敘事 + 8 隻精選美股",
                "完整資本配置實戰框架",
                "1 年無限回看,不定期更新補充(期滿後贈送繼續回看)",
                ...(bundleDays > 0
                  ? [`含 ${bundleDays} 天 Pro 訂閱(AI 助教全開)`]
                  : []),
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
              查看課程 · 立即購買
            </Link>
          </div>
        </div>

        {/* Pro 訂閱 (次推) */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col overflow-hidden">
          <div className="py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant text-center border-b border-outline-variant/20">
            訂閱方案
          </div>

          <div className="p-10 flex flex-col flex-1">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-1.5 bg-surface-container text-on-surface-variant text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.18em] mb-4">
                Pro
              </div>
              <h3 className="text-on-surface font-bold text-2xl mb-2 leading-snug">
                Pro 訂閱
              </h3>
              <p className="text-on-surface-variant text-sm mb-7">
                月付制 · 持續內容 + AI 助教
              </p>
              <div className="flex items-baseline justify-center gap-1 mb-2">
                <span className="text-5xl font-black text-on-surface tracking-tight">
                  {fmt(PRO_MONTHLY_NTD)}
                </span>
                <span className="text-on-surface-variant text-sm">/月</span>
              </div>
              <p className="text-on-surface-variant text-xs">
                隨時可取消 · 下次扣款日前生效
              </p>
            </div>

            <div className="space-y-3 mb-8 flex-1">
              {[
                "Pro 限定影片(持續更新,訂閱期間隨時看)",
                "AI 助教 Eyesy 全範圍開放(含深度模式)",
                "Discord 學員專屬頻道",
                "Pro 限定電子報 + 文章",
                "(大師課單課買斷不含在內,需另購)",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check size={18} className="text-on-surface-variant flex-shrink-0" />
                  <span className="text-on-surface text-sm">{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/checkout?type=pro&billing=monthly"
              className="block w-full py-4 rounded-xl font-bold text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors active:scale-[0.98] text-center border border-outline-variant/30"
            >
              訂閱 Pro
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 border-t border-surface-container py-12 max-w-5xl mx-auto opacity-70">
        <div className="flex items-center gap-3 text-on-surface">
          <ShieldCheck size={24} />
          <span className="text-sm font-bold">藍新金流 · 安全支付</span>
        </div>
        <div className="flex items-center gap-3 text-on-surface">
          <InfinityIcon size={24} />
          <span className="text-sm font-bold">一次購買 · 1 年無限看 + 之後贈送回看</span>
        </div>
      </div>

      <section className="max-w-3xl mx-auto px-8 mt-24">
        <h2 className="text-3xl font-black text-on-surface text-center mb-16">
          常見問題
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "課程影片可以看多久?",
              a: "一次購買後享有 1 年無限觀看權限,期間可重複回看、無觀看次數限制。1 年期滿後,平台額外以「贈送回看」方式持續提供觀看權益(此為平台善意,不在原合約義務內,平台保留調整權利)。我們也會不定期更新補充教材,購買者皆可取得。",
            },
            {
              q: "送的 Pro 訂閱怎麼用?",
              a: `購買大師課後自動開通 ${bundleDays || 90} 天 Pro 會籍,期間 AI 助教 Eyesy 深度模式、Pro 限定影片、Discord 專屬頻道、文章電子報全開。期滿可選擇月費續訂繼續看 Pro 內容。`,
            },
            {
              q: "Pro 限定影片是什麼?",
              a: "大師課之外另開的影片內容(產業週報、實戰分享、新題材深度拆解等),只有 Pro 訂閱期間才看得到。Pro 過期就鎖回,續訂後再開。",
            },
            {
              q: "Pro 訂閱可以隨時取消嗎?",
              a: "可以。在會員中心點取消,下個扣款日前不再扣款,當期已付週期繼續使用到期。",
            },
            {
              q: "有哪些付款方式?",
              a: "支援藍新金流信用卡付款 (一次性 + 定期扣款),所有交易透過藍新加密處理。",
            },
            {
              q: "可以退款嗎?",
              a: "依消費者保護法數位內容例外規定,課程一經開通即不退款。Pro 訂閱可隨時取消但已扣款週期不退。",
            },
            {
              q: "適合什麼程度的學習者?",
              a: "課程以投資邏輯與產業分析為主,適合對太空科技與資本市場有興趣、希望建立系統性投資觀點的學習者。不需任何專業背景。",
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
