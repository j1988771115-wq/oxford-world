"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useCourseAccess } from "./course-access-provider";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
  courseSlug: string;
  effectivePrice: number;
  originalPrice?: number | null;
  saleEndsAt?: string | null;
  isProOnly?: boolean;
  isMasterSpace?: boolean;
}

/**
 * 課程介紹頁手機 sticky bottom buy bar(client component,從 useCourseAccess
 * 拿 userId/hasAccess 動態 render)。
 *
 * 三 case:
 * - hasAccess → 隱藏(無 CTA 顯示)
 * - 已登未購 → 「立即購買 NT$XX」
 * - 未登入 → 「登入後購買 NT$XX」
 * - isProOnly → 訂閱 Pro CTA
 *
 * 太空大師課時切 dark navy theme + amber border。
 */
export function MobileStickyBuyBar({
  courseId,
  courseSlug,
  effectivePrice,
  originalPrice,
  saleEndsAt,
  isProOnly = false,
  isMasterSpace = false,
}: Props) {
  const { loading, userId, hasAccess } = useCourseAccess();

  // 已購學員不顯示 sticky bar
  if (hasAccess) return null;

  const onSale =
    originalPrice &&
    originalPrice > effectivePrice &&
    (!saleEndsAt || new Date(saleEndsAt) > new Date());

  return (
    <div
      className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl px-4 py-3 shadow-2xl border-t",
        isMasterSpace
          ? "bg-slate-950/95 border-amber-500/20"
          : "bg-surface-container-lowest/95 border-outline-variant/15"
      )}
    >
      {isProOnly ? (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
              Pro 訂閱限定
            </p>
            <p className="text-base font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              訂閱即可解鎖
            </p>
          </div>
          <Link
            href={
              userId
                ? "/pricing"
                : `/sign-in?redirect=${encodeURIComponent(`/courses/${courseSlug}`)}`
            }
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-extrabold px-5 py-3 rounded-xl text-sm shadow-md active:scale-95 transition-transform shrink-0"
          >
            {userId ? "訂閱 Pro" : "登入訂閱"}
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {onSale && (
              <p
                className={cn(
                  "text-[10px] uppercase tracking-wider font-bold inline-flex items-center gap-1",
                  isMasterSpace ? "text-amber-300" : "text-on-surface-variant"
                )}
              >
                <Sparkles size={10} />
                限時特價
              </p>
            )}
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "text-xl font-black",
                  isMasterSpace ? "text-amber-300" : "text-on-surface"
                )}
              >
                NT${effectivePrice.toLocaleString()}
              </span>
              {onSale && originalPrice && (
                <span
                  className={cn(
                    "text-xs line-through",
                    isMasterSpace ? "text-white/50" : "text-on-surface-variant"
                  )}
                >
                  NT${originalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          {loading ? (
            <span
              className={cn(
                "font-extrabold px-5 py-3 rounded-xl text-sm shrink-0 opacity-60",
                isMasterSpace
                  ? "bg-amber-500 text-slate-950"
                  : "signature-gradient text-white"
              )}
            >
              載入中…
            </span>
          ) : userId ? (
            <Link
              href={`/checkout?type=course&courseId=${courseId}`}
              className={cn(
                "font-extrabold px-5 py-3 rounded-xl text-sm shrink-0 active:scale-95 transition-transform",
                isMasterSpace
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 shadow-md"
                  : "signature-gradient text-white shadow-md"
              )}
            >
              立即購買
            </Link>
          ) : (
            <Link
              href={`/sign-in?redirect=${encodeURIComponent(`/courses/${courseSlug}`)}`}
              className={cn(
                "font-extrabold px-5 py-3 rounded-xl text-sm shrink-0 active:scale-95 transition-transform",
                isMasterSpace
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 shadow-md"
                  : "signature-gradient text-white shadow-md"
              )}
            >
              登入後購買
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
