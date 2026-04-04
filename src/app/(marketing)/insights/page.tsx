import { FileText, Video, BarChart3 } from "lucide-react";

export const metadata = {
  title: "最新內容 — 牛津視界",
  description: "最新的 AI 報告、影片、文章",
};

export default function InsightsPage() {
  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-16">
          <h1 className="text-5xl font-black text-on-surface tracking-tight mb-4">
            最新內容
          </h1>
          <p className="text-on-surface-variant text-lg">
            AI 報告、影片、文章，持續更新
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: BarChart3,
              tag: "趨勢報告",
              title: "2026 Q2 AI 產業趨勢分析",
              desc: "全面解析本季 AI 產業動態，涵蓋大型語言模型、AI Agent、以及企業導入現況。",
              date: "2026.04.01",
            },
            {
              icon: Video,
              tag: "直播回放",
              title: "久方武院長：散戶如何用 AI 做決策",
              desc: "從宏觀經濟分析到個股篩選，院長分享如何利用 AI 工具輔助投資決策。",
              date: "2026.03.28",
            },
            {
              icon: FileText,
              tag: "深度文章",
              title: "Prompt Engineering 實戰指南",
              desc: "從 Zero-shot 到 Chain-of-Thought，一篇文章掌握所有 Prompt 技巧。",
              date: "2026.03.25",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-xl deep-diffusion overflow-hidden group cursor-pointer hover:-translate-y-2 transition-all duration-300"
            >
              <div className="aspect-video bg-primary-container flex items-center justify-center">
                <item.icon className="text-secondary-container" size={48} />
              </div>
              <div className="p-8">
                <span className="inline-block px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-bold mb-4">
                  {item.tag}
                </span>
                <h3 className="text-xl font-bold text-on-surface mb-2 group-hover:text-secondary transition-colors">
                  {item.title}
                </h3>
                <p className="text-on-surface-variant text-sm line-clamp-2 mb-4">
                  {item.desc}
                </p>
                <p className="text-on-surface-variant text-xs">{item.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
