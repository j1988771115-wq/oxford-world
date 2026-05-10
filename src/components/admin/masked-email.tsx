"use client";

import { useState } from "react";

interface Props {
  targetType: "order" | "profile" | "course_access";
  targetId: string;
  initial: string; // 預先 server-side mask 過的
}

/**
 * 點擊才 reveal 真實 email,30 秒後自動 hide。
 * Codex review patch: 禁 hover reveal (可被自動化批次 break)、禁 bulk reveal、每次 audit。
 */
export function MaskedEmail({ targetType, targetId, initial }: Props) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = async () => {
    if (revealed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/reveal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });
      const data = await r.json();
      if (r.ok && data.email) {
        setRevealed(data.email);
        setTimeout(() => setRevealed(null), 30000);
      } else {
        setError(data.error || "fail");
      }
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="text-xs">
      {revealed ? (
        <>
          <span className="text-amber-300">{revealed}</span>
          <span className="text-gray-600 ml-1">(30s)</span>
        </>
      ) : (
        <>
          <span className="text-gray-500">{initial}</span>
          <button
            type="button"
            onClick={reveal}
            disabled={loading}
            className="ml-2 text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
          >
            {loading ? "..." : "顯示"}
          </button>
          {error && <span className="ml-2 text-rose-400">{error}</span>}
        </>
      )}
    </span>
  );
}
