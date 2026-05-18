"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VideoWatermark } from "./video-watermark";

interface VideoPlayerProps {
  chapterId: string;
  title: string;
  accentColor?: string;
  /** 從上次離開的秒數開始播 */
  startTime?: number;
  /** 浮水印識別字（通常是 email 縮寫） */
  watermarkId?: string;
  /** main = 久老師正片(預設) / bg = NotebookLM 背景影片 */
  variant?: "main" | "bg";
  /** 試看模式 — 影片結束時跳購買 modal */
  conversionPrompt?: {
    courseSlug: string;
    courseTitle: string;
    price: number;
  };
  /** 影片結束自動跳下一段(已付費學員用,試看用戶看 conversionPrompt) */
  autoNextUrl?: string;
  /** 給「下一段」名稱用於倒數 UI */
  autoNextLabel?: string;
  /** 自動播放(URL 帶 ?autoplay=1 時 true) */
  autoPlay?: boolean;
}

interface SignedTokenResponse {
  playbackId: string;
  token: string;
  expiresIn: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

const PROGRESS_SAVE_INTERVAL_MS = 10_000; // 每 10 秒寫一次

/**
 * 安全 Mux 播放：
 * - 載入時去 /api/video/signed-token 拿短期 JWT
 * - 浮水印疊在影片上方，學員洩漏會留下識別字
 * - onTimeUpdate throttle 寫進度給 /api/video/progress
 * - startTime 從上次離開的位置續播
 */
export function VideoPlayer({
  chapterId,
  title,
  accentColor = "#2563eb",
  startTime,
  watermarkId,
  variant = "main",
  conversionPrompt,
  autoNextUrl,
  autoNextLabel,
  autoPlay,
}: VideoPlayerProps) {
  const router = useRouter();
  const [data, setData] = useState<SignedTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  // 自動下一段倒數(5 秒,可取消)
  const [countdown, setCountdown] = useState<number | null>(null);
  const lastSaveRef = useRef<number>(0);
  const playerRef = useRef<HTMLDivElement | null>(null);

  // 倒數結束自動跳轉(URL 加 ?autoplay=1,讓下一頁的 player 自動播)
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      if (autoNextUrl) {
        const sep = autoNextUrl.includes("?") ? "&" : "?";
        router.push(`${autoNextUrl}${sep}autoplay=1`);
      }
      return;
    }
    const t = setTimeout(() => setCountdown((n) => (n === null ? null : n - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, autoNextUrl, router]);

  useEffect(() => {
    let alive = true;
    setError(null);
    setData(null);
    fetch("/api/video/signed-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, variant }),
    })
      .then(async (res) => {
        if (!alive) return;
        if (res.ok) {
          const json: SignedTokenResponse = await res.json();
          setData(json);
        } else {
          const json: ErrorResponse = await res.json().catch(() => ({
            error: "影片載入失敗",
          }));
          setError(json.error);
        }
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : "網路錯誤");
      });
    return () => {
      alive = false;
    };
  }, [chapterId, variant]);

  const saveProgress = async (positionSeconds: number, durationSeconds?: number) => {
    // bg 影片不寫進度 — 進度只追蹤主片
    if (variant === "bg") return;
    try {
      await fetch("/api/video/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, positionSeconds, durationSeconds }),
        keepalive: true,
      });
    } catch {
      // 進度存失敗就算了 — 下次再存
    }
  };

  // 卸載 / 切章節時把最後位置寫一次
  useEffect(() => {
    return () => {
      const el = playerRef.current?.querySelector("mux-player") as
        | (HTMLElement & { currentTime?: number; duration?: number })
        | null;
      if (el && typeof el.currentTime === "number" && el.currentTime > 1) {
        saveProgress(el.currentTime, el.duration);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
        <p className="text-sm">載入影片中...</p>
      </div>
    );
  }

  const handleTimeUpdate = (e: Event) => {
    const target = e.target as HTMLElement & {
      currentTime?: number;
      duration?: number;
    };
    if (typeof target.currentTime !== "number") return;
    const now = Date.now();
    if (now - lastSaveRef.current < PROGRESS_SAVE_INTERVAL_MS) return;
    lastSaveRef.current = now;
    saveProgress(target.currentTime, target.duration);
  };

  return (
    <div ref={playerRef} className="relative w-full aspect-video">
      <MuxPlayer
        playbackId={data.playbackId}
        tokens={{ playback: data.token }}
        metadata={{ video_title: title }}
        accentColor={accentColor}
        className="w-full aspect-video"
        streamType="on-demand"
        startTime={startTime && startTime > 1 ? startTime : undefined}
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (conversionPrompt) {
            setShowBuyModal(true);
          } else if (autoNextUrl) {
            setCountdown(5);
          }
        }}
      />
      {watermarkId && <VideoWatermark identifier={watermarkId} />}

      {/* 自動播下一段倒數 — 已付費學員,影片結束後 5 秒自動跳 */}
      {countdown !== null && autoNextUrl && (
        <div className="absolute bottom-4 right-4 z-40 bg-black/85 backdrop-blur-md rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[320px]">
          <div className="text-white">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              {countdown} 秒後自動播放
            </div>
            <div className="text-sm font-bold leading-tight truncate max-w-[200px]">
              {autoNextLabel || "下一段"}
            </div>
          </div>
          <button
            onClick={() => setCountdown(null)}
            className="text-white/80 hover:text-white text-xs font-bold border border-white/30 px-3 py-1.5 rounded-lg shrink-0"
          >
            取消
          </button>
        </div>
      )}

      {/* 試看結束 — 購買 modal */}
      {showBuyModal && conversionPrompt && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-8 text-center space-y-5 shadow-2xl">
            <div className="text-on-surface-variant text-xs font-black tracking-widest uppercase">
              試看完了
            </div>
            <h2 className="text-2xl font-extrabold text-on-surface leading-tight">
              繼續看完整 9 章<br />解鎖《{conversionPrompt.courseTitle.slice(0, 12)}》
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              一次付費 · 1 年無限看 + 之後贈送 · 加贈 90 天 Pro
              <br />
              <span className="text-on-surface font-black text-base">
                NT${conversionPrompt.price.toLocaleString()}
              </span>
            </p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/courses/${conversionPrompt.courseSlug}`}
                className="signature-gradient text-white font-extrabold py-3.5 rounded-xl shadow-md active:scale-95 transition-transform"
              >
                立即解鎖完整課程
              </Link>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-on-surface-variant text-sm font-medium py-2"
              >
                我再想想
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
