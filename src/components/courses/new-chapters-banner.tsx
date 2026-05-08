"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

interface Props {
  courseId: string;
  /** 第一個新章節的 chapter id (給「前往觀看」按鈕導向) */
  firstNewChapterId: string;
  /** YYYY-MM-DD,過了這天 banner 自動隱藏 */
  expiresAt: string;
  /** localStorage key 識別,dismiss 後不再顯示 */
  dismissKey: string;
}

export function NewChaptersBanner({ courseId, firstNewChapterId, expiresAt, dismissKey }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // SSR-safe:client mount 才檢查
    const expired = new Date(expiresAt + "T23:59:59+08:00").getTime() < Date.now();
    if (expired) return;
    if (typeof window !== "undefined" && window.localStorage.getItem(dismissKey)) return;
    setShow(true);
  }, [dismissKey, expiresAt]);

  if (!show) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600/12 via-indigo-600/12 to-blue-600/12 border-b border-blue-500/30 px-4 lg:px-8 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles size={18} className="text-blue-600 dark:text-blue-300 shrink-0" />
          <p className="text-sm text-on-surface truncate">
            <span className="font-black text-blue-700 dark:text-blue-300 mr-2">新章節上線</span>
            久方武老師新增 #10、#11 兩章背景補充,主影片 + 背景資料學習已備齊
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/learn/${courseId}?chapter=${firstNewChapterId}&part=main`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors"
          >
            前往觀看
          </Link>
          <button
            type="button"
            aria-label="關閉通知"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.localStorage.setItem(dismissKey, "1");
              }
              setShow(false);
            }}
            className="text-on-surface/60 hover:text-on-surface p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
