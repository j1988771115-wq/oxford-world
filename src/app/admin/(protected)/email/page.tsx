"use client";

import { useState, useEffect, useTransition } from "react";

const TARGETS = [
  { value: "all", label: "全部（訂閱者 + 會員）" },
  { value: "subscribers", label: "Email 訂閱者" },
  { value: "members", label: "所有會員" },
  { value: "pro", label: "Pro 會員" },
];

export default function AdminEmailPage() {
  const [stats, setStats] = useState({ subscribers: 0, members: 0 });
  const [target, setTarget] = useState("all");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email").then((r) => r.json()).then(setStats);
  }, []);

  const handleSend = () => {
    if (!subject.trim() || !html.trim()) {
      setResult("請填寫主旨和內容");
      return;
    }
    if (!confirm(`確定要發送郵件？目標：${TARGETS.find((t) => t.value === target)?.label}`)) return;

    startTransition(async () => {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, subject, html }),
      });
      const data = await res.json();
      setResult(data.message || data.error || "完成");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Email 行銷</h2>
        <div className="flex gap-4 text-sm text-gray-400">
          <span>訂閱者：<span className="text-white font-bold">{stats.subscribers}</span></span>
          <span>會員：<span className="text-white font-bold">{stats.members}</span></span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400">發送對象</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none"
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400">信件主旨 *</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none placeholder-gray-600"
              placeholder="例：牛津視界週報 #01 — AI 趨勢速遞"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">信件內容（HTML）*</label>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={12}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none resize-none font-mono placeholder-gray-600"
            placeholder="<h1>嗨！</h1><p>這是本週的 AI 趨勢...</p>"
          />
        </div>

        {/* Preview */}
        <div>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="text-blue-400 text-sm font-bold hover:underline"
          >
            {preview ? "隱藏預覽" : "預覽信件"}
          </button>
          {preview && html && (
            <div className="mt-3 bg-white rounded-lg p-6 text-black text-sm" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>

        {result && (
          <p className={`text-sm font-medium ${result.includes("錯誤") || result.includes("請") ? "text-red-400" : "text-green-400"}`}>
            {result}
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold text-sm disabled:opacity-50 transition-colors"
          >
            {isPending ? "發送中..." : "發送郵件"}
          </button>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h3 className="font-bold text-sm mb-4">快速模板</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              label: "週報模板",
              subj: "牛津視界週報 — AI 趨勢速遞",
              body: `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333;">
<h1 style="color:#0A192F;">牛津視界週報</h1>
<p>嗨！以下是本週精選：</p>
<h2>📌 本週重點</h2>
<ul>
<li>重點一</li>
<li>重點二</li>
<li>重點三</li>
</ul>
<h2>📚 新課程上架</h2>
<p>描述...</p>
<p style="margin-top:30px;"><a href="https://oxford-vision.com/insights" style="background:#00D2FF;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">閱讀更多</a></p>
<hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
<p style="color:#999;font-size:12px;">牛津視界 Oxford Vision — 巨石文化有限公司<br>不想收到信件？<a href="#">取消訂閱</a></p>
</div>`,
            },
            {
              label: "新課程通知",
              subj: "新課程上架！",
              body: `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333;">
<h1 style="color:#0A192F;">新課程上架 🎉</h1>
<p>我們剛上架了一門全新課程：</p>
<h2>課程名稱</h2>
<p>課程描述...</p>
<p style="margin-top:20px;"><a href="https://oxford-vision.com/courses" style="background:#00D2FF;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">立即查看</a></p>
<hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
<p style="color:#999;font-size:12px;">牛津視界 Oxford Vision<br><a href="#">取消訂閱</a></p>
</div>`,
            },
          ].map((tpl, i) => (
            <button
              key={i}
              onClick={() => {
                setSubject(tpl.subj);
                setHtml(tpl.body);
              }}
              className="text-left bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition-colors"
            >
              <p className="font-bold text-sm text-white">{tpl.label}</p>
              <p className="text-xs text-gray-400 mt-1">{tpl.subj}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
