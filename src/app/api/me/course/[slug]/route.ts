import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasCourseAccess } from "@/lib/access";

/**
 * 公開 API:回該 user 對某 course 的個人化狀態。
 *
 * 用途:課程介紹頁從 server-side dynamic SSR(讀 cookies)改成 anon ISR cache
 * 後,user-aware UI(購買 vs 進入 / resume / preview link)在 client 端
 * fetch 此 endpoint 拿身份。整 page 變成可 ISR cached,TTFB 大幅下降。
 *
 * 沒登入 → 回 anonymous payload(userId 等都 null)。永遠 200。
 *
 * Cache:必須 no-store(每次拿最新 user state),否則 user 切帳號 cache 撞舊資料。
 */
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface MeResponse {
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();

  // 抓 course id (公開讀)
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!course) {
    return NextResponse.json({ error: "course not found" }, { status: 404 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;

  // 找該課的 free preview chapter id (anonymous 也回,client 顯示「免費試看」link 用)
  const { data: freeChapter } = await supabase
    .from("course_chapters")
    .select("id")
    .eq("course_id", course.id)
    .eq("is_free_preview", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const baseResponse: MeResponse = {
    userId: null,
    profileId: null,
    userEmail: null,
    hasAccess: false,
    isAlumni: false,
    resumeChapterId: null,
    resumePosition: 0,
    resumeChapterTitle: null,
    firstFreePreviewChapterId: freeChapter?.id ?? null,
  };

  if (!userId) {
    return NextResponse.json(baseResponse);
  }

  // 抓 profile + access
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, is_alumni")
    .eq("auth_id", userId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ ...baseResponse, userId, userEmail });
  }

  const hasAccess = await hasCourseAccess(supabase, profile.id, course.id);

  // 已購學員的 resume:抓最近一次有進度的章節
  let resumeChapterId: string | null = null;
  let resumePosition = 0;
  let resumeChapterTitle: string | null = null;
  if (hasAccess) {
    const { data: latestProgress } = await supabase
      .from("course_progress")
      .select("chapter_id, last_position_seconds")
      .eq("user_id", profile.id)
      .eq("course_id", course.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestProgress) {
      resumeChapterId = latestProgress.chapter_id;
      resumePosition = latestProgress.last_position_seconds ?? 0;
      const { data: ch } = await supabase
        .from("course_chapters")
        .select("title")
        .eq("id", latestProgress.chapter_id)
        .maybeSingle();
      resumeChapterTitle = ch?.title ?? null;
    }
  }

  return NextResponse.json({
    userId,
    profileId: profile.id,
    userEmail,
    hasAccess,
    isAlumni: !!profile.is_alumni,
    resumeChapterId,
    resumePosition,
    resumeChapterTitle,
    firstFreePreviewChapterId: freeChapter?.id ?? null,
  });
}
