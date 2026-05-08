"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface CourseAccessState {
  loading: boolean;
  userId: string | null;
  profileId: string | null;
  userEmail: string | null;
  hasAccess: boolean;
  isAlumni: boolean;
  resumeChapterId: string | null;
  resumePosition: number;
  resumeChapterTitle: string | null;
  firstFreePreviewChapterId: string | null;
}

const DEFAULT_STATE: CourseAccessState = {
  loading: true,
  userId: null,
  profileId: null,
  userEmail: null,
  hasAccess: false,
  isAlumni: false,
  resumeChapterId: null,
  resumePosition: 0,
  resumeChapterTitle: null,
  firstFreePreviewChapterId: null,
};

const CourseAccessContext = createContext<CourseAccessState>(DEFAULT_STATE);

interface ProviderProps {
  courseSlug: string;
  /** server 抓到的 firstFreePreview id 預先傳入,避免 loading 時 link href 缺失 */
  preFreePreviewId?: string | null;
  children: ReactNode;
}

/**
 * 課程介紹頁 user-aware UI 用此 provider 包起來。
 * Server component 純 anon ISR fetch 公開資料,user-aware 部分(CTA 文字 / resume /
 * preview link)透過此 provider 在 client 端 fetch /api/me/course/[slug] 拿。
 *
 * 整 page 改 ISR cache 後,大量重複訪客 TTFB 從 350ms 下降到 cache HIT 的 50ms。
 */
export function CourseAccessProvider({
  courseSlug,
  preFreePreviewId,
  children,
}: ProviderProps) {
  const [state, setState] = useState<CourseAccessState>({
    ...DEFAULT_STATE,
    firstFreePreviewChapterId: preFreePreviewId ?? null,
  });

  useEffect(() => {
    let alive = true;
    fetch(`/api/me/course/${courseSlug}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) {
          if (alive) setState((s) => ({ ...s, loading: false }));
          return;
        }
        setState({
          loading: false,
          userId: data.userId,
          profileId: data.profileId,
          userEmail: data.userEmail,
          hasAccess: data.hasAccess,
          isAlumni: data.isAlumni,
          resumeChapterId: data.resumeChapterId,
          resumePosition: data.resumePosition,
          resumeChapterTitle: data.resumeChapterTitle,
          firstFreePreviewChapterId:
            data.firstFreePreviewChapterId ?? preFreePreviewId ?? null,
        });
      })
      .catch(() => {
        if (alive) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  return (
    <CourseAccessContext.Provider value={state}>
      {children}
    </CourseAccessContext.Provider>
  );
}

export function useCourseAccess() {
  return useContext(CourseAccessContext);
}
