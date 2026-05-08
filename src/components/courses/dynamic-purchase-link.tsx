"use client";

import Link from "next/link";
import { useCourseAccess } from "./course-access-provider";
import { cn } from "@/lib/utils";

interface Props {
  courseId: string;
  courseSlug: string;
  effectivePrice: number;
  originalPrice?: number | null;
  /** "立即購買 - NT$XX" with price inline */
  showPriceInline?: boolean;
  /** "登入後購買" 改為 "登入後試看" 之類自訂(預設「登入後購買」)*/
  unauthenticatedLabel?: string;
  /** 已購學員 redirect 目的地("/learn/<courseId>" 預設,可帶 ?chapter=&part=)*/
  authenticatedHref?: string;
  /** has-access 學員 CTA 文字(預設「進入課程」)*/
  authenticatedLabel?: string;
  /** 已登未購 CTA 文字(預設「立即購買」)*/
  paidLabel?: string;
  className?: string;
  /** anchor query string for sign-in redirect e.g. "#free-preview" — 未登入帶到 sign-in 後 redirect 回此 anchor */
  redirectAnchor?: string;
}

/**
 * 課程介紹頁的「購買 / 進入課程 / 登入後購買」CTA 按鈕,4 處共用:
 * - Hero 右側 box
 * - 沉式 CTA section
 * - 「你拿到什麼」價格 anchor box
 * - 章節 list 試看 (variant)
 *
 * Server component 純 anon ISR fetch,user-aware 邏輯靠 useCourseAccess() hook
 * client 端 fetch /api/me/course/[slug] 拿到 userId/hasAccess 後動態 swap CTA。
 */
export function DynamicPurchaseLink({
  courseId,
  courseSlug,
  effectivePrice,
  showPriceInline = false,
  unauthenticatedLabel = "登入後購買",
  authenticatedHref,
  authenticatedLabel = "進入課程",
  paidLabel = "立即購買",
  className,
  redirectAnchor,
}: Props) {
  const { loading, userId, hasAccess } = useCourseAccess();

  if (loading) {
    // Skeleton 預設按鈕(避免 layout shift),anon-default 文字
    return (
      <span
        className={cn(className, "opacity-60 cursor-progress pointer-events-none")}
      >
        {showPriceInline ? `${unauthenticatedLabel} · NT$${effectivePrice.toLocaleString()}` : unauthenticatedLabel}
      </span>
    );
  }

  if (hasAccess) {
    return (
      <Link href={authenticatedHref || `/learn/${courseId}`} className={className}>
        {authenticatedLabel}
      </Link>
    );
  }

  if (userId) {
    // 已登未購
    return (
      <Link href={`/checkout?type=course&courseId=${courseId}`} className={className}>
        {showPriceInline
          ? `${paidLabel} · NT$${effectivePrice.toLocaleString()}`
          : paidLabel}
      </Link>
    );
  }

  // 未登入
  const redirect = redirectAnchor
    ? `/courses/${courseSlug}${redirectAnchor}`
    : `/courses/${courseSlug}`;
  return (
    <Link
      href={`/sign-in?redirect=${encodeURIComponent(redirect)}`}
      className={className}
    >
      {showPriceInline
        ? `${unauthenticatedLabel} · NT$${effectivePrice.toLocaleString()}`
        : unauthenticatedLabel}
    </Link>
  );
}
