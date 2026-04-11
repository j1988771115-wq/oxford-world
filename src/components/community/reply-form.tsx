"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createReply } from "@/lib/actions/community";

export function ReplyForm({ discussionId }: { discussionId: string }) {
  const router = useRouter();

  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await createReply(formData);
      if (result.success) {
        router.refresh();
        return null;
      }
      return result.error ?? "發生錯誤";
    },
    null
  );

  return (
    <form
      action={formAction}
      className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 space-y-4"
    >
      <input type="hidden" name="discussion_id" value={discussionId} />

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <textarea
        name="content"
        required
        rows={4}
        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface text-sm focus:ring-2 ring-secondary-container/30 focus:outline-none resize-none"
        placeholder="寫下你的回覆..."
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="signature-gradient text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:brightness-110 transition-all disabled:opacity-50"
        >
          {isPending ? "發送中..." : "回覆 (+5 XP)"}
        </button>
      </div>
    </form>
  );
}
