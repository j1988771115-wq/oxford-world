"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
}: VideoPlayerProps) {
  const [data, setData] = useState<SignedTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const lastSaveRef = useRef<number>(0);
  const playerRef = useRef<HTMLDivElement | null>(null);

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
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          if (conversionPrompt) setShowBuyModal(true);
        }}
      />
      {watermarkId && <VideoWatermark identifier={watermarkId} />}

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
              一次付費 · 終身觀看 · 加贈 90 天 Pro
              <br />
              <span className="line-through opacity-60">原價 NT$30,000</span>
              {" "}
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
