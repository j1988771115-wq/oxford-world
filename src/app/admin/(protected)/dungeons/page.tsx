"use client";

import { useState, useEffect, useTransition } from "react";

const DUNGEON_TYPES = [
  { value: "lecture", label: "免費講座" },
  { value: "workshop", label: "實戰工作坊" },
  { value: "master", label: "大師圓桌" },
  { value: "legendary", label: "傳奇副本" },
];

interface Dungeon {
  id: string;
  title: string;
  dungeon_type: string;
  required_level: number;
  requires_pro: boolean;
  xp_reward: number;
  status: string;
  created_at: string;
}

export default function AdminDungeonsPage() {
  const [dungeons, setDungeons] = useState<Dungeon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const fetchDungeons = async () => {
    const res = await fetch("/api/admin/dungeons");
    if (res.ok) setDungeons(await res.json());
  };

  useEffect(() => {
    fetchDungeons();
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    startTransition(async () => {
      const res = await fetch("/api/admin/dungeons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          required_level: parseInt(data.required_level as string) || 1,
          requires_pro: data.requires_pro === "on",
          xp_reward: parseInt(data.xp_reward as string) || 10,
          max_participants: data.max_participants
            ? parseInt(data.max_participants as string)
            : null,
          duration_minutes: data.duration_minutes
            ? parseInt(data.duration_minutes as string)
            : null,
          scheduled_at: (data.scheduled_at as string) || null,
        }),
      });

      if (res.ok) {
        setMessage("副本已建立");
        setShowForm(false);
        form.reset();
        fetchDungeons();
      } else {
        const err = await res.json();
        setMessage(`錯誤：${err.error}`);
      }
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`確定刪除「${title}」？`)) return;
    startTransition(async () => {
      await fetch("/api/admin/dungeons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchDungeons();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">副本管理</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
        >
          + 新增副本
        </button>
      </div>

      {message && (
        <p className={`text-sm font-medium ${message.startsWith("錯誤") ? "text-red-400" : "text-green-400"}`}>
          {message}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">標題 *</label>
              <input name="title" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600" placeholder="副本名稱" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">類型</label>
              <select name="dungeon_type" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none">
                {DUNGEON_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400">描述 *</label>
            <textarea name="description" required rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none resize-none placeholder-gray-600" placeholder="副本介紹" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">最低等級</label>
              <input name="required_level" type="number" min="1" max="20" defaultValue="1" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">XP 獎勵</label>
              <input name="xp_reward" type="number" min="0" defaultValue="10" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">時長（分鐘）</label>
              <input name="duration_minutes" type="number" min="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none" placeholder="選填" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">人數上限</label>
              <input name="max_participants" type="number" min="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none" placeholder="不填=無限" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">影片網址（YouTube embed）</label>
              <input name="video_url" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600" placeholder="https://youtube.com/embed/..." />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400">活動時間</label>
              <input name="scheduled_at" type="datetime-local" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input name="requires_pro" type="checkbox" className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600" />
            <span className="text-sm">需要 Pro 會員</span>
          </label>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400">內容（Markdown）</label>
            <textarea name="content_md" rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none resize-none font-mono placeholder-gray-600" placeholder="副本內容（支援 Markdown）" />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors">取消</button>
            <button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">{isPending ? "建立中..." : "建立副本"}</button>
          </div>
        </form>
      )}

      {/* List */}
      {dungeons.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12 bg-gray-900 rounded-xl border border-gray-800">還沒有副本</p>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">副本</th>
                <th className="px-6 py-4 hidden md:table-cell">類型</th>
                <th className="px-6 py-4 hidden md:table-cell">等級</th>
                <th className="px-6 py-4 hidden md:table-cell">XP</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {dungeons.map((d) => (
                <tr key={d.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm">{d.title}</p>
                    {d.requires_pro && <span className="text-[10px] text-blue-400 font-bold">PRO</span>}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-400">
                    {DUNGEON_TYPES.find((t) => t.value === d.dungeon_type)?.label}
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm">Lv.{d.required_level}</td>
                  <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-400">+{d.xp_reward}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(d.id, d.title)} className="text-red-400 hover:underline text-sm font-bold">刪除</button>
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
