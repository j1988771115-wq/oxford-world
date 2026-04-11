"use client";

import { useState } from "react";
import {
  Check,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Users,
  ChevronDown,
  Bot,
  BookOpen,
  TrendingUp,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const proPrice = billing === "monthly" ? "NT$999" : "NT$9,990";
  const proPeriod = billing === "monthly" ? "/ 月" : "/ 年";

  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-7xl mx-auto px-8 mb-16">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tight mb-6 leading-tight">
            選擇適合你的
            <br />
            學習方案
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed">
            從免費試看到 Pro
            全面解鎖，再到大師級深度課程。找到最適合你的學習節奏。
          </p>
        </div>
      </div>

      {/* Billing Toggle */}
      <div className="flex flex-col items-center mb-16">
        <div className="bg-surface-container-low p-1.5 rounded-full flex items-center gap-1">
          <button
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-8 py-2.5 rounded-full text-sm font-bold transition-all",
              billing === "monthly"
                ? "bg-surface-container-lowest shadow-sm text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            按月計費
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={cn(
              "px-8 py-2.5 rounded-full text-sm font-bold transition-all",
              billing === "yearly"
                ? "bg-surface-container-lowest shadow-sm text-on-surface"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            按年計費
          </button>
        </div>
        {billing === "yearly" && (
          <div className="mt-4 flex items-center gap-2 text-secondary font-bold text-sm">
            <Sparkles size={18} className="fill-current" />
            <span className="bg-secondary-fixed px-3 py-1 rounded-full text-on-secondary-fixed-variant text-xs">
              年繳方案 省 17%
            </span>
          </div>
        )}
      </div>

      {/* Pricing Grid */}
      <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Basic */}
        <div className="bg-surface-container-lowest rounded-xl p-10 flex flex-col h-full border border-transparent hover:border-surface-container-high transition-all deep-diffusion">
          <div className="mb-8">
            <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest mb-2">
              免費
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-on-surface">NT$0</span>
            </div>
          </div>
          <div className="space-y-5 mb-10 flex-grow">
            {[
              "免費課程試看",
              "AI 工具分享文章",
              "Email 訂閱週報",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-green-500 font-bold" />
                <span className="text-on-surface text-sm">{item}</span>
              </div>
            ))}
          </div>
          <Link
            href="/sign-up"
            className="block w-full py-4 rounded-xl font-bold bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors active:scale-[0.98] text-center"
          >
            立即開始
          </Link>
        </div>

        {/* Pro */}
        <div className="relative bg-surface-container-lowest rounded-xl p-10 flex flex-col h-full border-2 border-secondary-container shadow-[0_24px_48px_-12px_rgba(13,28,50,0.12)] scale-105 z-10">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary-container text-[#0A192F] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
            最受歡迎
          </div>
          <div className="mb-8">
            <h3 className="text-secondary font-bold text-sm uppercase tracking-widest mb-2">
              Pro
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-on-surface">
                {proPrice}
              </span>
              <span className="text-on-surface-variant text-sm">
                {proPeriod}
              </span>
            </div>
            <p className="text-secondary text-xs font-bold mt-2">
              前 7 天免費試用
            </p>
          </div>
          <div className="space-y-5 mb-10 flex-grow">
            {[
              { icon: BookOpen, text: "Vibe Coding 全系列小課" },
              { icon: TrendingUp, text: "市場分析報告" },
              { icon: Bot, text: "Eyesy AI 助教" },
              { icon: Sparkles, text: "AI 個人化學習路徑" },
              { icon: Users, text: "Discord 社群" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <item.icon
                  size={18}
                  className={i < 3 ? "text-secondary" : "text-green-500"}
                />
                <span className="text-on-surface text-sm font-medium">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/sign-up?plan=pro"
            className="block w-full py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity active:scale-[0.98] text-center"
          >
            免費試用 7 天
          </Link>
          <p className="text-center text-xs text-on-surface-variant mt-3">
            試用期間可隨時取消，不收任何費用
          </p>
        </div>

        {/* 大師課 */}
        <div className="bg-surface-container-lowest rounded-xl p-10 flex flex-col h-full border border-transparent hover:border-surface-container-high transition-all deep-diffusion">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">
                大師課
              </h3>
              <Crown size={16} className="text-amber-500" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-on-surface">
                依課程定價
              </span>
            </div>
            <p className="text-on-surface-variant text-xs mt-2">
              單課買斷，永久觀看
            </p>
          </div>
          <div className="space-y-5 mb-10 flex-grow">
            {[
              "頂尖講師深度課程",
              "投資趨勢 × 產業分析",
              "一次付費，終身回看",
              "不定期更新補充教材",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-amber-500 font-bold" />
                <span className="text-on-surface text-sm">{item}</span>
              </div>
            ))}
          </div>
          <Link
            href="/courses"
            className="block w-full py-4 rounded-xl font-bold bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors active:scale-[0.98] text-center"
          >
            瀏覽大師課
          </Link>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 border-t border-surface-container py-12 max-w-5xl mx-auto opacity-70">
        <div className="flex items-center gap-3 text-on-surface">
          <ShieldCheck size={24} />
          <span className="text-sm font-bold">安全支付保障</span>
        </div>
        <div className="flex items-center gap-3 text-on-surface">
          <RefreshCw size={24} />
          <span className="text-sm font-bold">7 天免費試用</span>
        </div>
        <div className="flex items-center gap-3 text-on-surface">
          <Users size={24} />
          <span className="text-sm font-bold">超過 10,000 名學習者信任</span>
        </div>
      </div>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-8 mt-24">
        <h2 className="text-3xl font-black text-on-surface text-center mb-16">
          常見問題
        </h2>
        <div className="space-y-4">
          {[
            {
              q: "Pro 免費試用怎麼運作？",
              a: "註冊 Pro 後立即開始 7 天免費試用，期間享有所有 Pro 功能。試用期間可隨時取消，不會收取任何費用。到期後自動轉為月繳或年繳方案。",
            },
            {
              q: "大師課跟 Pro 有什麼差別？",
              a: "Pro 訂閱包含所有 Vibe Coding 系列小課、市場分析報告、AI 助教等持續更新的內容。大師課是由頂尖講師推出的深度獨立課程，需要另外購買，一次付費永久觀看。",
            },
            {
              q: "我可以同時訂閱 Pro 又購買大師課嗎？",
              a: "當然可以！兩者完全獨立。Pro 給你持續學習的資源，大師課讓你在特定領域深入鑽研。",
            },
            {
              q: "我可以在任何時候取消訂閱嗎？",
              a: "是的，您可以隨時透過個人設定頁面取消訂閱。取消後，權益維持到當前計費週期結束。",
            },
            {
              q: "年繳與月繳方案有什麼差別？",
              a: "年繳方案享有 17% 的價格優惠（相當於省下兩個月費用）。除此之外，功能完全相同。",
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
