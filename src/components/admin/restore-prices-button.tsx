"use client";

import { useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";

interface RestoreResult {
  checked: number;
  eligible?: number;
  restored: number;
  failed?: number;
  message: string;
  results?: Array<{
    slug: string;
    title: string;
    ok: boolean;
    from: number;
    to: number;
    error?: string;
  }>;
}

export function RestorePricesButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (pending) return;
    if (
      !confirm(
        "強制還原所有過期特價?\n\n會檢查 sale_ends_at < 現在 + price < original_price 的課程,\n把 price 改回 original_price、sale_ends_at 設 NULL。\n\n通常 daily cron 會自動跑,只在 cron 沒跑時手動觸發。"
      )
    ) {
      return;
    }

    startTransition(async () => {
      setError(null);
      setResult(null);
      try {
        const res = await fetch("/api/admin/restore-expired-sale-prices", {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "失敗");
        } else {
          setResult(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "網路錯誤");
      }
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
      >
        <RotateCcw size={14} className={pending ? "animate-spin" : ""} />
        {pending ? "還原中..." : "強制還原過期特價"}
      </button>

      {error && (
        <p className="text-sm text-red-400">❌ {error}</p>
      )}

      {result && (
        <div className="text-sm bg-gray-900 border border-gray-800 rounded-lg p-3 space-y-1">
          <p className="font-bold text-green-400">✓ {result.message}</p>
          <p className="text-gray-500 text-xs">
            檢查 {result.checked} 筆過期 sale · 還原 {result.restored} 筆
            {result.failed ? ` · 失敗 ${result.failed}` : ""}
          </p>
          {result.results && result.results.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {result.results.map((r) => (
                <li key={r.slug} className={r.ok ? "text-gray-300" : "text-red-400"}>
                  {r.ok ? "✓" : "✗"} {r.title}:{" "}
                  NT${r.from.toLocaleString()} → NT${r.to.toLocaleString()}
                  {r.error ? ` (${r.error})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
