"use client";

import { useState } from "react";
import { VideoPlayer } from "./video-player";
import { Play, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  chapterId: string;
  chapterTitle: string;
  hasMain: boolean;
  hasBg: boolean;
  durationMain: number | null;
  durationBg: number | null;
  resumeAt?: number;
  watermarkId?: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoTabs({
  chapterId,
  chapterTitle,
  hasMain,
  hasBg,
  durationMain,
  durationBg,
  resumeAt,
  watermarkId,
}: Props) {
  // 預設正片 tab
  const [tab, setTab] = useState<"main" | "bg">("main");

  // 切章節時 reset 到 main
  const tabKey = `${chapterId}-${tab}`;

  return (
    <div className="space-y-3">
      {/* Tab bar — 只在兩個都有時顯示 */}
      {hasMain && hasBg && (
        <div className="flex gap-2 border-b border-outline-variant/20">
          <button
            onClick={() => setTab("main")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors",
              tab === "main"
                ? "border-secondary text-secondary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            )}
          >
            <Play size={16} />
            久老師正片
            {durationMain && (
              <span className="text-xs font-normal opacity-70">
                {formatDuration(durationMain)}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("bg")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors",
              tab === "bg"
                ? "border-secondary text-secondary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            )}
          >
            <BookOpen size={16} />
            背景資料學習
            {durationBg && (
              <span className="text-xs font-normal opacity-70">
                {formatDuration(durationBg)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Player */}
      <div className="aspect-video bg-primary-container rounded-xl overflow-hidden">
        <VideoPlayer
          key={tabKey}
          chapterId={chapterId}
          title={tab === "bg" ? `${chapterTitle} - 背景` : chapterTitle}
          accentColor="#00d2ff"
          startTime={tab === "main" ? resumeAt : undefined}
          watermarkId={watermarkId}
          variant={tab === "bg" ? "bg" : "main"}
        />
      </div>
    </div>
  );
}
