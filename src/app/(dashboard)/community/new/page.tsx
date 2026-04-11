"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createDiscussion } from "@/lib/actions/community";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewDiscussionPage() {
  const router = useRouter();

  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await createDiscussion(formData);
      if (result.success && result.id) {
        router.push(`/community/${result.id}`);
        return null;
      }
      return result.error ?? "發生錯誤";
    },
    null
  );

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
          <h1 className="text-lg font-black text-on-surface">發起討論</h1>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[800px] mx-auto">
        <form action={formAction} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10 space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant">
                標題 *
              </label>
              <input
                name="title"
                required
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 ring-secondary/30 focus:outline-none"
                placeholder="你想討論什麼？"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant">
                分類
              </label>
              <select
                name="tag"
                defaultValue="general"
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 ring-secondary/30 focus:outline-none"
              >
                <option value="general">一般</option>
                <option value="course-help">課程問題</option>
                <option value="sharing">學習心得</option>
                <option value="tools">工具分享</option>
                <option value="off-topic">閒聊</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant">
                內容 *
              </label>
              <textarea
                name="content"
                required
                rows={8}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 ring-secondary/30 focus:outline-none resize-none"
                placeholder="詳細描述你的問題或想法..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="signature-gradient text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 transition-all disabled:opacity-50"
            >
              {isPending ? "發送中..." : "發表討論 (+5 XP)"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
