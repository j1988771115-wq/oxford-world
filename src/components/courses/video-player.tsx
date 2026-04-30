"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useEffect, useState } from "react";

interface VideoPlayerProps {
  chapterId: string;
  title: string;
  accentColor?: string;
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

/**
 * 安全 Mux 播放：載入時去 /api/video/signed-token 拿短期 JWT，
 * 連 source URL 都不洩漏（player 內部用 token 拼 signed URL）。
 */
export function VideoPlayer({
  chapterId,
  title,
  accentColor = "#2563eb",
}: VideoPlayerProps) {
  const [data, setData] = useState<SignedTokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    setData(null);
    fetch("/api/video/signed-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId }),
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

  return (
    <MuxPlayer
      playbackId={data.playbackId}
      tokens={{ playback: data.token }}
      metadata={{ video_title: title }}
      accentColor={accentColor}
      className="w-full aspect-video"
      streamType="on-demand"
    />
  );
}
