"use client";

import { useState, useTransition } from "react";
import { upsertChapter, deleteChapter } from "@/lib/actions/admin";

interface Chapter {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  duration_seconds: number | null;
  mux_playback_id: string | null;
  youtube_url: string | null;
  is_free_preview: boolean;
}

export function ChapterManager({
  courseId,
  initialChapters,
}: {
  courseId: string;
  initialChapters: Chapter[];
}) {
  const [chapters, setChapters] = useState(initialChapters);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSave = (formData: FormData) => {
    startTransition(async () => {
      const result = await upsertChapter(formData);
      if (result.success) {
        window.location.reload();
      }
    });
  };

  const handleDelete = (chapter: Chapter) => {
    if (!confirm(`確定要刪除「${chapter.title}」？`)) return;
    startTransition(async () => {
      const result = await deleteChapter(chapter.id);
      if (result.success) {
        setChapters((prev) => prev.filter((c) => c.id !== chapter.id));
      }
    });
  };

  const fmtDuration = (s: number | null) => {
    if (!s) return "-";
    return `${Math.floor(s / 60)} 分鐘`;
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">章節管理</h3>
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="text-blue-400 hover:bg-blue-600/10 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          + 新增章節
        </button>
      </div>

      {showNew && (
        <ChapterForm
          courseId={courseId}
          sortOrder={chapters.length + 1}
          onSave={handleSave}
          onCancel={() => setShowNew(false)}
          isPending={isPending}
        />
      )}

      {chapters.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">尚未新增章節</p>
      ) : (
        <div className="space-y-1">
          {chapters.map((ch) => (
            <div key={ch.id}>
              {editingId === ch.id ? (
                <ChapterForm
                  courseId={courseId}
                  chapter={ch}
                  sortOrder={ch.sort_order}
                  onSave={handleSave}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                />
              ) : (
                <div className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800/50 transition-colors group">
                  <span className="text-xs font-mono text-gray-500 w-6 text-right">
                    {ch.sort_order}
                  </span>
                  <span className="text-sm font-medium flex-1">{ch.title}</span>
                  {ch.is_free_preview && (
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                      免費
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {fmtDuration(ch.duration_seconds)}
                  </span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setEditingId(ch.id)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ch)}
                      className="text-xs text-gray-400 hover:text-red-400"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterForm({
  courseId,
  chapter,
  sortOrder,
  onSave,
  onCancel,
  isPending,
}: {
  courseId: string;
  chapter?: Chapter;
  sortOrder: number;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form
      action={onSave}
      className="bg-gray-800 p-4 rounded-lg space-y-4 border border-gray-700"
    >
      {chapter && <input type="hidden" name="id" value={chapter.id} />}
      <input type="hidden" name="course_id" value={courseId} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-1">
          <label className="text-xs font-bold text-gray-400">章節標題 *</label>
          <input
            name="title"
            required
            defaultValue={chapter?.title}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600"
            placeholder="章節名稱"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">排序</label>
          <input
            name="sort_order"
            type="number"
            min="1"
            defaultValue={chapter?.sort_order ?? sortOrder}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">時長（秒）</label>
          <input
            name="duration_seconds"
            type="number"
            min="0"
            defaultValue={chapter?.duration_seconds ?? ""}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600"
            placeholder="例：900 = 15 分鐘"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">
            Mux Playback ID
          </label>
          <input
            name="mux_playback_id"
            defaultValue={chapter?.mux_playback_id ?? ""}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600"
            placeholder="影片上傳後填入"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-bold text-gray-400">
          YouTube 網址（unlisted 影片）
        </label>
        <input
          name="youtube_url"
          defaultValue={chapter?.youtube_url ?? ""}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600"
          placeholder="https://youtu.be/xxxxxxxxxxx 或 https://www.youtube.com/watch?v=xxxxxxxxxxx"
        />
        <p className="text-[10px] text-gray-500">
          優先使用 YouTube；若同時有 Mux Playback ID 會以 YouTube 為準
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          name="is_free_preview"
          type="checkbox"
          defaultChecked={chapter?.is_free_preview}
          className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-600"
        />
        <span className="text-xs">免費試看</span>
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
        >
          {isPending ? "儲存中..." : "儲存"}
        </button>
      </div>
    </form>
  );
}
