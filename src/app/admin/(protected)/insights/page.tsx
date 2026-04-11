"use client";

import { useState, useEffect, useTransition } from "react";

const CATEGORIES = [
  { value: "ai", label: "AI 趨勢" },
  { value: "investment", label: "投資分析" },
  { value: "tools", label: "工具分享" },
  { value: "coding", label: "Coding" },
];

interface Insight {
  id: string;
  slug: string;
  title: string;
  category: string;
  is_pro: boolean;
  published: boolean;
  author: string;
  created_at: string;
}

export default function AdminInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const fetchInsights = async () => {
    const res = await fetch("/api/admin/insights");
    if (res.ok) setInsights(await res.json());
  };

  useEffect(() => { fetchInsights(); }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    startTransition(async () => {
      const res = await fetch("/api/admin/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          is_pro: data.is_pro === "on",
          published: data.published === "on",
        }),
      });

      if (res.ok) {
        setMessage("文章已建立");
        setShowForm(false);
        form.reset();
        fetchInsights();
      } else {
        const err = await res.json();
        setMessage(`錯誤：${err.error}`);
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`確定刪除「${title}」？`)) return;
    startTransition(async () => {
      await fetch("/api/admin/insights", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchInsights();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Insights 管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
        >
          + 新增文章
        </button>
      </div>

      {message && (
        <p className={`text-sm font-medium ${message.startsWith("錯誤") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">標題 *</label>
              <input name="title" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600" placeholder="文章標題" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">Slug *</label>
              <input name="slug" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600" placeholder="url-friendly-name" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">作者 *</label>
              <input name="author" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600" placeholder="作者名稱" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">分類</label>
              <select name="category" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400">摘要 *</label>
            <textarea name="summary" required rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none resize-none placeholder-gray-600" placeholder="文章摘要（顯示在列表頁）" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400">內容 *</label>
            <textarea name="content" required rows={10} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none resize-none font-mono placeholder-gray-600" placeholder="文章完整內容" />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input name="is_pro" type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600" />
              <span className="text-sm">Pro 專屬</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input name="published" type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600" />
              <span className="text-sm">立即發佈</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">取消</button>
            <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">{isPending ? "建立中..." : "建立文章"}</button>
          </div>
        </form>
      )}

      {insights.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12 bg-gray-900 rounded-xl border border-gray-800">還沒有文章</p>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">文章</th>
                <th className="px-6 py-4 hidden md:table-cell">分類</th>
                <th className="px-6 py-4 hidden md:table-cell">狀態</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {insights.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">/{item.slug} · {item.author}</p>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-400">
                    {CATEGORIES.find((c) => c.value === item.category)?.label}
                    {item.is_pro && <span className="ml-2 text-blue-400 text-xs font-bold">PRO</span>}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <span className={`text-xs font-bold ${item.published ? "text-green-400" : "text-gray-500"}`}>
                      {item.published ? "已發佈" : "草稿"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(item.id, item.title)} className="text-red-400 hover:underline text-sm font-bold">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
