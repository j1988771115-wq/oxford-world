import Link from "next/link";
import { FileText, Lock, Crown, Zap } from "lucide-react";
import { getPublishedInsights } from "@/lib/actions/insights";
import { getUserProfile } from "@/lib/actions/courses";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Insights — 牛津視界",
};

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  ai: { label: "AI 趨勢", color: "bg-blue-500/15 text-blue-400" },
  investment: { label: "投資分析", color: "bg-green-500/15 text-green-400" },
  tools: { label: "工具分享", color: "bg-purple-500/15 text-purple-400" },
  coding: { label: "Coding", color: "bg-orange-500/15 text-orange-400" },
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const [insights, profile] = await Promise.all([
    getPublishedInsights(category),
    getUserProfile() as Promise<{ tier?: string } | null>,
  ]);

  const isPro = profile?.tier === "pro";

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center gap-3 px-6 lg:px-8 h-16 max-w-[1000px] mx-auto">
          <FileText size={20} className="text-secondary" />
          <h1 className="text-lg font-black text-on-surface">Insights</h1>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[1000px] mx-auto">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href="/insights"
            className={cn(
              "text-xs font-bold px-4 py-2 rounded-full transition-colors",
              !category
                ? "signature-gradient text-white shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            )}
          >
            全部
          </Link>
          {Object.entries(CATEGORY_MAP).map(([key, { label }]) => (
            <Link
              key={key}
              href={`/insights?category=${key}`}
              className={cn(
                "text-xs font-bold px-4 py-2 rounded-full transition-colors",
                category === key
                  ? "signature-gradient text-white shadow-sm"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <p className="text-on-surface-variant text-sm mb-6">
          市場分析、AI 趨勢、工具評測 — Pro 會員享完整閱讀
        </p>

        {insights.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-2xl deep-diffusion border border-outline-variant/10">
            <FileText size={40} className="mx-auto text-on-surface-variant/30 mb-4" />
            <p className="text-on-surface-variant text-lg">
              {category ? "此分類暫無內容" : "內容準備中，敬請期待"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map(
              (item: {
                slug: string;
                title: string;
                summary: string;
                category: string;
                is_pro: boolean;
                author: string;
                published_at: string;
              }) => {
                const cat = CATEGORY_MAP[item.category];
                const locked = item.is_pro && !isPro;

                return (
                  <Link
                    key={item.slug}
                    href={`/insights/${item.slug}`}
                    className="block bg-surface-container-lowest rounded-xl p-6 deep-diffusion hover:-translate-y-0.5 transition-all border border-outline-variant/10"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {cat && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cat.color)}>
                              {cat.label}
                            </span>
                          )}
                          {item.is_pro && (
                            <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Crown size={10} />
                              PRO
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-on-surface text-base mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-on-surface-variant line-clamp-2 mb-3">
                          {item.summary}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                          <span className="font-medium">{item.author}</span>
                          <span>
                            {new Date(item.published_at).toLocaleDateString("zh-TW")}
                          </span>
                        </div>
                      </div>

                      {locked && (
                        <div className="shrink-0 flex items-center gap-1 text-on-surface-variant">
                          <Lock size={16} />
                        </div>
                      )}
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}
