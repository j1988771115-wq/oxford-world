"use client";

import { useState, useEffect } from "react";

type ContentType = "transcript" | "notes" | "description" | "faq" | "report";

interface KnowledgeEntry {
  id: string;
  content: string;
  content_type: ContentType;
  course_id: string | null;
  created_at: string;
}

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "transcript", label: "課程講稿 / 字幕" },
  { value: "notes", label: "課程筆記" },
  { value: "description", label: "課程介紹" },
  { value: "report", label: "市場分析報告" },
  { value: "faq", label: "FAQ / 客服知識" },
];

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("notes");
  const [courseId, setCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchEntries = async () => {
    const res = await fetch("/api/admin/knowledge");
    if (res.ok) {
      const data = await res.json();
      setEntries(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setMessage("");

    const res = await fetch("/api/admin/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || null,
        content: content.trim(),
        content_type: contentType,
        course_id: courseId.trim() || null,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage(`${data.message}`);
      setTitle("");
      setContent("");
      setCourseId("");
      fetchEntries();
    } else {
      setMessage(`錯誤：${data.error}`);
    }

    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定刪除此知識片段？")) return;

    const res = await fetch("/api/admin/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const typeLabel = (type: string) =>
    CONTENT_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">知識庫管理</h2>
        <p className="text-gray-500 text-sm mt-1">
          新增內容後會自動切塊並產生 embedding，Eyesy 就能基於這些內容回答問題
        </p>
      </div>

      {/* Add Content Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5"
      >
        <h3 className="font-bold text-lg">新增知識內容</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400">標題</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600"
              placeholder="例：AI 趨勢報告 2026 Q2"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400">
              內容類型 *
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400">
              關聯課程 ID（選填）
            </label>
            <input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600"
              placeholder="UUID（留空 = 通用知識）"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400">
            內容 *（可直接貼上整篇文章，系統會自動切塊）
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none resize-none font-mono placeholder-gray-600"
            placeholder="貼上課程講稿、字幕檔、文章內容、FAQ 等..."
          />
          <p className="text-xs text-gray-500">
            {content.length} 字 — 預估切成 ~
            {Math.max(1, Math.ceil(content.length / 1500))} 個片段
          </p>
        </div>

        {message && (
          <p
            className={`text-sm font-medium ${message.startsWith("錯誤") ? "text-red-400" : "text-green-400"}`}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
        >
          {submitting ? "處理中（產生 embedding）..." : "新增到知識庫"}
        </button>
      </form>

      {/* Existing Entries */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">
          現有知識片段{" "}
          <span className="text-gray-500 font-normal">
            ({entries.length} 筆)
          </span>
        </h3>

        {loading ? (
          <p className="text-gray-500 text-sm">載入中...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-12 bg-gray-900 rounded-xl border border-gray-800">
            知識庫是空的，新增一些內容讓 Eyesy 更聰明
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-gray-900 border border-gray-800 rounded-lg px-5 py-4 flex items-start gap-4 group hover:border-gray-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">
                      {typeLabel(entry.content_type)}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {new Date(entry.created_at).toLocaleDateString("zh-TW")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {entry.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-xs text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                >
                  刪除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
