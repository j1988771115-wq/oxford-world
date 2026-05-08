"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { PlayCircle, ChevronRight, X } from "lucide-react";

// MuxPlayer ~80KB,只有點開試看才載
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false });

interface Props {
  chapterId: string;
  chapterTitle: string;
  takeawaySummary?: string | null;
  durationSeconds?: number | null;
  thumbnailUrl: string;
  courseSlug: string;
  userId: string | null;
}

export function InlinePreviewPlayer({
  chapterId,
  chapterTitle,
  takeawaySummary,
  durationSeconds,
  thumbnailUrl,
  courseSlug,
  userId,
}: Props) {
  const [token, setToken] = useState<{ playbackId: string; token: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC 關 modal
  useEffect(() => {
    if (!token) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setToken(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [token]);

  // modal 開啟時鎖 body scroll
  useEffect(() => {
    if (!token) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [token]);

  const handleClick = async () => {
    if (!userId) {
      // 未登入帶到 /sign-in,登入後 redirect 回此 anchor
      window.location.href = `/sign-in?redirect=${encodeURIComponent(`/courses/${courseSlug}#free-preview`)}`;
      return;
    }
    if (loading || token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/video/signed-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, variant: "main" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "無法載入影片");
        return;
      }
      setToken({ playbackId: data.playbackId, token: data.token });
    } catch {
      setError("載入失敗,請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        id="free-preview"
        className="group block w-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 overflow-hidden transition-all text-left disabled:opacity-80"
      >
        <div className="grid md:grid-cols-[1.6fr_1fr] gap-0 items-stretch">
          {/* Cover + Play overlay */}
          <div className="relative aspect-video md:aspect-auto md:min-h-[280px] bg-slate-900 overflow-hidden">
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-amber-500 group-hover:bg-amber-400 group-hover:scale-110 flex items-center justify-center shadow-2xl shadow-amber-500/50 transition-all">
                {loading ? (
                  <span className="text-slate-950 font-black text-xl animate-pulse">···</span>
                ) : (
                  <PlayCircle size={44} className="text-slate-950 fill-current ml-1" />
                )}
              </div>
            </div>
            <span className="absolute top-4 left-4 px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-lg">
              FREE
            </span>
          </div>
          {/* 章節資訊 */}
          <div className="p-7 md:p-8 flex flex-col justify-center space-y-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">
              第 1 章 · 免費試看
            </p>
            <h3 className="text-xl md:text-2xl font-black text-white leading-snug">
              {chapterTitle}
            </h3>
            {durationSeconds && (
              <p className="text-sm text-white/60">
                時長約 {Math.floor(durationSeconds / 60)} 分鐘
              </p>
            )}
            <p className="text-sm md:text-base text-white/75 leading-relaxed">
              {takeawaySummary
                ? takeawaySummary.slice(0, 100) + "…"
                : "看久方武院長親自講解,先抓到課程風格再決定要不要全課。"}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 text-amber-300 font-bold group-hover:gap-3 transition-all">
                {userId ? "立即試看" : "登入後試看"}
                <ChevronRight size={18} />
              </span>
            </div>
            {error && (
              <p className="text-sm text-rose-300 mt-1">{error}</p>
            )}
          </div>
        </div>
      </button>

      {/* === Modal player === */}
      {token && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setToken(null)}
        >
          <button
            type="button"
            aria-label="關閉"
            onClick={() => setToken(null)}
            className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-colors z-10"
          >
            <X size={22} />
          </button>
          <div
            className="w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MuxPlayer
              streamType="on-demand"
              playbackId={token.playbackId}
              tokens={{ playback: token.token }}
              autoPlay
              accentColor="#d4af37"
              metadata={{
                video_title: chapterTitle,
                viewer_user_id: userId || undefined,
              }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <p className="absolute bottom-4 md:bottom-6 left-0 right-0 text-center text-white/50 text-xs">
            點外側或按 ESC 關閉
          </p>
        </div>
      )}
    </>
  );
}
