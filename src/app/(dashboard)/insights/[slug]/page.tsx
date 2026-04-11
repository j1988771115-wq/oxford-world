import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Crown, Lock, Calendar, User } from "lucide-react";
import { getInsightBySlug } from "@/lib/actions/insights";
import { getUserProfile } from "@/lib/actions/courses";

export default async function InsightDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [insight, profile] = await Promise.all([
    getInsightBySlug(slug),
    getUserProfile() as Promise<{ tier?: string } | null>,
  ]);

  if (!insight) notFound();

  const isPro = profile?.tier === "pro";
  const locked = insight.is_pro && !isPro;

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center gap-3 px-6 lg:px-8 h-16 max-w-[800px] mx-auto">
          <Link href="/insights" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-black text-on-surface truncate">{insight.title}</h1>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[800px] mx-auto">
        <article className="bg-surface-container-lowest rounded-2xl p-8 deep-diffusion border border-outline-variant/10">
          {/* Meta */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {insight.is_pro && (
              <span className="text-xs font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Crown size={12} />
                PRO 專屬
              </span>
            )}
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <User size={12} />
              {insight.author}
            </span>
            <span className="text-xs text-on-surface-variant flex items-center gap-1">
              <Calendar size={12} />
              {new Date(insight.published_at).toLocaleDateString("zh-TW")}
            </span>
          </div>

          <h1 className="text-2xl font-black text-on-surface mb-4">{insight.title}</h1>
          <p className="text-on-surface-variant leading-relaxed mb-8">{insight.summary}</p>

          {locked ? (
            /* Pro gate */
            <div className="relative">
              <div className="text-on-surface leading-relaxed whitespace-pre-wrap text-sm">
                {insight.content.slice(0, 300)}...
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-surface-container-lowest to-transparent" />
              <div className="relative mt-8 text-center py-12 border-t border-outline-variant/15">
                <Lock size={32} className="mx-auto text-on-surface-variant/30 mb-4" />
                <h3 className="text-lg font-bold text-on-surface mb-2">
                  此內容為 Pro 會員專屬
                </h3>
                <p className="text-on-surface-variant text-sm mb-6">
                  升級 Pro 解鎖所有報告、課程和 Eyesy AI 助教
                </p>
                <Link
                  href="/pricing"
                  className="inline-block signature-gradient text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 transition-all"
                >
                  免費試用 Pro 7 天
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-on-surface leading-relaxed whitespace-pre-wrap text-sm">
              {insight.content}
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
