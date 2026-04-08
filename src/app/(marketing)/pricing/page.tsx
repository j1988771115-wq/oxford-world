"use client";

import { useState } from "react";
import {
  Check,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Users,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const proPrice = billing === "monthly" ? "NT$499" : "NT$4,990";
  const proPeriod = billing === "monthly" ? "/ 月" : "/ 年";
  const proAiPrice = billing === "monthly" ? "NT$999" : "NT$9,990";

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
            加入領先者的行列，開啟你的 AI
            學習旅程。我們提供從入門到專家級的完整路徑，助你在數位轉型浪潮中脫穎而出。
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
              Basic
            </h3>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-on-surface">NT$0</span>
            </div>
          </div>
          <div className="space-y-5 mb-10 flex-grow">
            {["免費課程試看", "公開文章", "Email 訂閱"].map((item, i) => (
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
              <span className="text-on-surface-variant text-sm">{proPeriod}</span>
            </div>
          </div>
          <div className="space-y-5 mb-10 flex-grow">
            {["所有課程", "付費報告", "Discord 社群", "學習排行榜"].map(
              (item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check size={18} className="text-green-500 font-bold" />
                  <span className="text-on-surface text-sm font-medium">
                    {item}
                  </span>
                </div>
              )
            )}
          </div>
          <Link
            href="/sign-up?plan=pro"
            className="block w-full py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity active:scale-[0.98] text-center"
          >
            選擇 Pro
          </Link>
          <p className="text-center text-xs text-on-surface-variant mt-3">
            金流系統開通後即可訂閱
          </p>
        </div>

        {/* Pro + AI */}
        <div className="bg-surface-container-lowest rounded-xl p-10 flex flex-col h-full border border-transparent hover:border-surface-container-high transition-all deep-diffusion">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">
                Pro + AI
              </h3>
              <span className="bg-surface-container-highest text-on-surface-variant text-[10px] px-2 py-0.5 rounded font-bold">
                COMING SOON
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-on-surface">
                {proAiPrice}
              </span>
              <span className="text-on-surface-variant text-sm">{proPeriod}</span>
            </div>
          </div>
          <div className="space-y-5 mb-10 flex-grow">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className="text-secondary" />
              <span className="text-on-surface text-sm">
                Everything in Pro
              </span>
            </div>
            {["AI 助手無限使用", "AI 個人化路徑", "AI 週報"].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <Check size={18} className="text-green-500 font-bold" />
                <span className="text-on-surface text-sm">{item}</span>
              </div>
            ))}
          </div>
          <button
            className="w-full py-4 rounded-xl font-bold bg-surface-container-low text-on-surface-variant cursor-not-allowed"
            disabled
          >
            敬請期待
          </button>
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
          <span className="text-sm font-bold">7 天無條件退款政策</span>
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
              q: "我可以在任何時候取消訂閱嗎？",
              a: "是的，您可以在任何時間透過個人設定頁面取消訂閱。取消後，您的會員權益將維持到當前計費週期結束。",
            },
            {
              q: "如果我不滿意，可以退款嗎？",
              a: "我們提供 7 天滿意保證。如果您在購買後 7 天內覺得課程不適合您，且觀看進度未超過 20%，可以聯繫客服申請全額退款。",
            },
            {
              q: "Pro + AI 方案什麼時候會正式推出？",
              a: "AI 增強方案目前正處於封閉測試階段，預計將於下一季正式對外開放。目前的 Pro 會員屆時將獲得優先升級權與早鳥折扣。",
            },
            {
              q: "年繳與月繳方案有什麼差別？",
              a: "年繳方案享有 17% 的價格優惠（相當於贈送兩個月）。除此之外，年繳會員還能獲得專屬的「年度學習白皮書」實體手冊（僅限 Pro 以上方案）。",
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
