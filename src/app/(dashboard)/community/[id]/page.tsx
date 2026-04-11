import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiscussion } from "@/lib/actions/community";
import { ReplyForm } from "@/components/community/reply-form";
import { MessageSquare, Clock, ArrowLeft } from "lucide-react";

export default async function DiscussionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const discussion = await getDiscussion(id);

  if (!discussion) notFound();

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center gap-3 px-6 lg:px-8 h-16 max-w-[800px] mx-auto">
          <Link
            href="/community"
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-black text-on-surface truncate">
            {discussion.title}
          </h1>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[800px] mx-auto space-y-6">
        {/* Original post */}
        <article className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center">
              <span className="text-on-secondary-fixed-variant font-bold text-xs">
                {(discussion.profiles?.display_name || "匿")[0]}
              </span>
            </div>
            <div>
              <span className="text-sm font-bold text-on-surface">
                {discussion.profiles?.display_name || "匿名"}
              </span>
              <span className="text-xs text-on-surface-variant ml-2 flex items-center gap-1 inline-flex">
                <Clock size={11} />
                {new Date(discussion.created_at).toLocaleDateString("zh-TW")}
              </span>
            </div>
          </div>
          <div className="text-on-surface leading-relaxed whitespace-pre-wrap text-sm">
            {discussion.content}
          </div>
        </article>

        {/* Replies */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <MessageSquare size={16} />
            {discussion.replies?.length || 0} 則回覆
          </h2>

          {discussion.replies?.map(
            (reply: {
              id: string;
              content: string;
              created_at: string;
              profiles: { display_name: string };
            }) => (
              <div
                key={reply.id}
                className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center">
                    <span className="text-on-surface-variant font-bold text-xs">
                      {(reply.profiles?.display_name || "匿")[0]}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-on-surface">
                    {reply.profiles?.display_name || "匿名"}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(reply.created_at).toLocaleDateString("zh-TW")}
                  </span>
                </div>
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                  {reply.content}
                </p>
              </div>
            )
          )}

          <ReplyForm discussionId={discussion.id} />
        </div>
      </div>
    </main>
  );
}
