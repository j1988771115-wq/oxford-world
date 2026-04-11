import Link from "next/link";
import { MessageSquare, Pin, Plus, Clock } from "lucide-react";
import { getDiscussions } from "@/lib/actions/community";
import { cn } from "@/lib/utils";
import { TagFilter } from "@/components/community/tag-filter";

export const metadata = {
  title: "討論區 — 牛津視界",
};

const TAG_MAP: Record<string, { label: string; color: string }> = {
  general: { label: "一般", color: "bg-gray-500/15 text-gray-400" },
  "course-help": { label: "課程問題", color: "bg-blue-500/15 text-blue-400" },
  sharing: { label: "學習心得", color: "bg-green-500/15 text-green-400" },
  tools: { label: "工具分享", color: "bg-purple-500/15 text-purple-400" },
  "off-topic": { label: "閒聊", color: "bg-orange-500/15 text-orange-400" },
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const discussions = await getDiscussions();

  const filtered = tag
    ? discussions.filter(
        (d: { tag?: string }) => d.tag === tag
      )
    : discussions;

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center justify-between px-6 lg:px-8 h-16 max-w-[1000px] mx-auto">
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-secondary" />
            <h1 className="text-lg font-black text-on-surface">討論區</h1>
          </div>
          <Link
            href="/community/new"
            className="signature-gradient text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:brightness-110 transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            發起討論
          </Link>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[1000px] mx-auto">
        {/* Tag Filter */}
        <TagFilter currentTag={tag} tagMap={TAG_MAP} />

        <p className="text-on-surface-variant text-sm mb-6">
          與同學交流、分享心得、互相幫助 — 每則貼文 +5 XP
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-lowest rounded-2xl deep-diffusion border border-outline-variant/10">
            <MessageSquare
              size={40}
              className="mx-auto text-on-surface-variant/30 mb-4"
            />
            <p className="text-on-surface-variant text-lg mb-4">
              {tag ? "此分類還沒有討論" : "還沒有討論，成為第一個發言的人！"}
            </p>
            <Link
              href="/community/new"
              className="text-secondary font-bold hover:underline"
            >
              發起第一個討論
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(
              (d: {
                id: string;
                title: string;
                content: string;
                pinned: boolean;
                reply_count: number;
                tag?: string;
                created_at: string;
                profiles: { display_name: string };
              }) => {
                const tagInfo = TAG_MAP[d.tag || "general"];

                return (
                  <Link
                    key={d.id}
                    href={`/community/${d.id}`}
                    className="block bg-surface-container-lowest rounded-xl p-5 deep-diffusion hover:-translate-y-0.5 transition-all border border-outline-variant/10"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
                        <span className="text-on-secondary-fixed-variant font-bold text-sm">
                          {(d.profiles?.display_name || "匿")[0]}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {d.pinned && (
                            <Pin
                              size={12}
                              className="text-secondary shrink-0"
                            />
                          )}
                          <h3
                            className={cn(
                              "font-bold text-on-surface text-sm truncate",
                              d.pinned && "text-secondary"
                            )}
                          >
                            {d.title}
                          </h3>
                          {tagInfo && (
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                tagInfo.color
                              )}
                            >
                              {tagInfo.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-on-surface-variant line-clamp-2 mb-3">
                          {d.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                          <span className="font-medium">
                            {d.profiles?.display_name || "匿名"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(d.created_at).toLocaleDateString(
                              "zh-TW"
                            )}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare size={12} />
                            {d.reply_count} 則回覆
                          </span>
                        </div>
                      </div>
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
