"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, CheckCircle2, Lock, PlayCircle, ChevronRight, ChevronUp, BookOpen, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChapterRow {
  id: string;
  title: string;
  sort_order: number;
  is_free_preview: boolean;
  duration_seconds?: number | null;
  duration_seconds_bg?: number | null;
  mux_playback_id?: string | null;
  mux_playback_id_bg?: string | null;
}

interface ProgressRow {
  chapter_id: string;
  last_position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
}

interface Props {
  chapters: ChapterRow[];
  currentChapterId: string | null;
  currentPart: "bg" | "main";
  hasAccess: boolean;
  courseId: string;
  courseSlug: string;
  progressByChapter: Record<string, ProgressRow>;
  /** 動態 next part URL(BG → main → 下章 BG) */
  nextPartUrl: string | null;
  nextPartLabel: string;
  totalChapters: number;
}

function fmtTime(sec: number | null | undefined): string {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * 手機底部智能導航 — 兩個元素:
 * 1. 主要 CTA(動態:看 BG → 看正片;看正片 → 下一章 BG;最後一章 → 我的學習)
 * 2. 章節抽屜(點開來顯示完整章節清單,蓋過 60% 螢幕,可拖回去)
 *
 * 桌面版隱藏(lg:hidden);桌面用右邊 sticky aside。
 */
export function MobileLearnNav({
  chapters,
  currentChapterId,
  currentPart,
  hasAccess,
  courseId,
  courseSlug,
  progressByChapter,
  nextPartUrl,
  nextPartLabel,
  totalChapters,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 進度數字:已完成幾章
  const completedCount = Object.values(progressByChapter).filter((p) => p.completed).length;

  // 抽屜開啟時鎖 body scroll
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  return (
    <>
      {/* 底部 sticky 雙按鈕列 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/15 px-3 py-2.5 shadow-2xl flex items-center gap-2 safe-bottom">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface font-bold text-sm active:scale-95 transition-transform shrink-0"
        >
          <ChevronUp size={16} />
          <span>章節 {completedCount}/{totalChapters}</span>
        </button>
        {nextPartUrl ? (
          <Link
            href={nextPartUrl}
            className="flex-1 flex items-center justify-center gap-2 signature-gradient text-white font-extrabold py-3 rounded-xl text-sm active:scale-95 transition-transform shadow-md"
          >
            <span className="truncate">{nextPartLabel || "下一段"}</span>
            <ChevronRight size={16} className="shrink-0" />
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-surface-container border-2 border-secondary text-secondary font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform"
          >
            完成課程 → 我的學習
          </Link>
        )}
      </div>
      {/* 防止 fixed bar 蓋到內容 */}
      <div className="lg:hidden h-20" />

      {/* 章節抽屜(從底部滑上) */}
      {drawerOpen && (
        <>
          {/* backdrop */}
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="關閉抽屜"
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          />
          {/* sheet */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-surface-container-lowest rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* drag handle + header */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-outline-variant/15">
              <div className="flex-1 flex flex-col items-center -mt-1">
                <div className="w-12 h-1.5 rounded-full bg-on-surface-variant/30 mb-2" />
                <div className="text-sm font-bold text-on-surface">
                  課程章節（{totalChapters}）· 已完成 {completedCount}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute right-3 top-3 p-2 rounded-full hover:bg-surface-container"
                aria-label="close"
              >
                <X size={20} className="text-on-surface-variant" />
              </button>
            </div>

            {/* chapter list scroll */}
            <div className="flex-1 overflow-y-auto pb-6">
              {chapters.map((ch) => {
                const isCurrentChapter = ch.id === currentChapterId;
                const isLocked = !ch.is_free_preview && !hasAccess;
                const progress = progressByChapter[ch.id];
                const hasProgress = !!progress && progress.last_position_seconds > 5;
                const isCompleted = !!progress?.completed;
                const chHasBg = !!ch.mux_playback_id_bg;
                const chHasMain = !!ch.mux_playback_id;

                return (
                  <div key={ch.id} className="border-b border-outline-variant/10 last:border-b-0">
                    {/* 章節標題 */}
                    <div
                      className={cn(
                        "px-4 pt-4 pb-2 flex items-center gap-3",
                        isCurrentChapter && "bg-secondary-fixed/10"
                      )}
                    >
                      <span className="text-base font-black text-on-surface-variant w-8 text-right shrink-0">
                        {ch.sort_order}
                      </span>
                      <p
                        className={cn(
                          "text-base font-bold leading-snug flex-1 min-w-0",
                          isCurrentChapter ? "text-secondary" : "text-on-surface"
                        )}
                      >
                        {ch.title}
                      </p>
                      {ch.is_free_preview && (
                        <span className="text-[10px] font-bold text-secondary bg-secondary-fixed px-1.5 py-0.5 rounded shrink-0">
                          免費
                        </span>
                      )}
                      {isCompleted && (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      )}
                    </div>

                    {/* 段落 row */}
                    <div className="pb-2">
                      {chHasBg && (
                        <Link
                          onClick={() => setDrawerOpen(false)}
                          href={
                            isLocked
                              ? `/courses/${courseSlug}`
                              : `/learn/${courseId}?chapter=${ch.id}&part=bg`
                          }
                          className={cn(
                            "flex items-center gap-3 pl-14 pr-4 py-3 transition-colors min-h-[48px]",
                            isCurrentChapter && currentPart === "bg"
                              ? "bg-secondary-fixed/30 text-secondary font-bold"
                              : "text-on-surface-variant active:bg-surface-container"
                          )}
                        >
                          {isLocked ? (
                            <Lock size={16} className="shrink-0" />
                          ) : isCurrentChapter && currentPart === "bg" ? (
                            <PlayCircle size={16} className="shrink-0 fill-current" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-current opacity-40 shrink-0" />
                          )}
                          <span className="flex-1 truncate flex items-center gap-2"><BookOpen size={15} className="shrink-0" />背景資料</span>
                          {ch.duration_seconds_bg && (
                            <span className="text-xs opacity-70 shrink-0">
                              {fmtTime(ch.duration_seconds_bg)}
                            </span>
                          )}
                        </Link>
                      )}

                      {chHasMain ? (
                        <Link
                          onClick={() => setDrawerOpen(false)}
                          href={
                            isLocked
                              ? `/courses/${courseSlug}`
                              : `/learn/${courseId}?chapter=${ch.id}&part=main`
                          }
                          className={cn(
                            "flex items-center gap-3 pl-14 pr-4 py-3 transition-colors min-h-[48px]",
                            isCurrentChapter && currentPart === "main"
                              ? "bg-secondary-fixed/30 text-secondary font-bold"
                              : "text-on-surface-variant active:bg-surface-container"
                          )}
                        >
                          {isLocked ? (
                            <Lock size={16} className="shrink-0" />
                          ) : isCompleted ? (
                            <CheckCircle2 size={16} className="text-emerald-500 fill-emerald-500/20 shrink-0" />
                          ) : isCurrentChapter && currentPart === "main" ? (
                            <PlayCircle size={16} className="shrink-0 fill-current" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-current opacity-40 shrink-0" />
                          )}
                          <span className="flex-1 truncate flex items-center gap-2"><GraduationCap size={15} className="shrink-0" />久老師正片</span>
                          {hasProgress && !isCompleted && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
                              到 {fmtTime(progress!.last_position_seconds)}
                            </span>
                          )}
                          {ch.duration_seconds && (
                            <span className="text-xs opacity-70 shrink-0">
                              {fmtTime(ch.duration_seconds)}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <div className="pl-14 pr-4 py-3 text-sm text-on-surface-variant/50 min-h-[48px] flex items-center">
                          影片即將上傳
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
