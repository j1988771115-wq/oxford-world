import { notFound } from "next/navigation";
import { checkCourseAccess } from "@/lib/actions/courses";
import { createClient } from "@/lib/supabase/server";
import { VideoPlayer } from "@/components/courses/video-player";
import { YouTubePlayer } from "@/components/courses/youtube-player";
import { ChapterCheckin } from "@/components/courses/chapter-checkin";
import { CourseInfoCollapse } from "@/components/courses/course-info-collapse";
import { MobileLearnNav } from "@/components/courses/mobile-learn-nav";
import Link from "next/link";
import {
  PlayCircle,
  Lock,
  Clock,
  CheckCircle2,
  ArrowLeft,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ chapter?: string; part?: "bg" | "main"; preview?: string; autoplay?: string }>;
}

interface ChapterProgress {
  chapter_id: string;
  last_position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return "學員";
  const safe = (email.match(/[A-Za-z0-9_.+-]/g) || [])
    .slice(0, 2)
    .join("");
  return `${safe || "user"}***@***`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function LearnPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const { chapter: chapterId, part: partRaw, preview: previewRaw, autoplay: autoplayRaw } = await searchParams;
  const partRequested: "bg" | "main" = partRaw === "bg" ? "bg" : "main";
  const forcePreviewBanner = previewRaw === "1"; // QA / demo:加 ?preview=1 強制顯示試看橫幅
  const autoPlayThisVideo = autoplayRaw === "1"; // 自動跳下一段時 URL 帶這個

  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();
  if (!course) notFound();

  const { data: chapters } = await supabase
    .from("course_chapters")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const hasAccess = await checkCourseAccess(courseId);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userEmail = user?.email;
  const watermarkId = maskEmail(userEmail);

  const progressByChapter = new Map<string, ChapterProgress>();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (profile) {
      const { data: rows } = await supabase
        .from("course_progress")
        .select(
          "chapter_id, last_position_seconds, duration_seconds, completed"
        )
        .eq("user_id", profile.id)
        .eq("course_id", courseId);
      for (const r of (rows || []) as ChapterProgress[]) {
        progressByChapter.set(r.chapter_id, r);
      }
    }
  }

  const currentChapter = chapterId
    ? chapters?.find((ch: { id: string }) => ch.id === chapterId)
    : chapters?.[0];

  const canPlay = currentChapter?.is_free_preview || hasAccess;
  const currentProgress = currentChapter
    ? progressByChapter.get(currentChapter.id)
    : undefined;
  const resumeAt = currentProgress?.last_position_seconds ?? 0;

  // 決定當下播哪個 part:
  // - 如果章節沒 bg,只能 main
  // - 如果章節有 bg 但 user 沒指定 part,預設 bg(背景先聽)
  // - 否則用 user 指定的 part
  const hasBg = !!currentChapter?.mux_playback_id_bg;
  const hasMain = !!currentChapter?.mux_playback_id;
  // 兩段都有時預設 bg(JD 設計:背景先聽);只有一段時用該段
  let currentPart: "bg" | "main";
  if (!hasBg) currentPart = "main";
  else if (!hasMain) currentPart = "bg";
  else currentPart = partRaw === "main" ? "main" : "bg";

  // 算「下一段」連結 — bg 完看 main, main 完看下章 bg(沒 bg 直接 main)
  function buildPartUrl(chId: string, part: "bg" | "main") {
    return `/learn/${courseId}?chapter=${chId}&part=${part}`;
  }
  let nextPartUrl: string | null = null;
  let nextPartLabel = "";
  if (currentChapter && chapters) {
    const idx = chapters.findIndex((c: { id: string }) => c.id === currentChapter.id);
    if (currentPart === "bg" && hasMain) {
      nextPartUrl = buildPartUrl(currentChapter.id, "main");
      nextPartLabel = "看久老師正片";
    } else if (idx >= 0 && idx + 1 < chapters.length) {
      const next = chapters[idx + 1];
      const nextHasBg = !!next.mux_playback_id_bg;
      nextPartUrl = buildPartUrl(next.id, nextHasBg ? "bg" : "main");
      nextPartLabel = `下一章 第 ${next.sort_order} 章`;
    }
  }

  // 章節 nav:上一章 / 下一章(大按鈕用)
  const currentIdx = currentChapter && chapters
    ? chapters.findIndex((c: { id: string }) => c.id === currentChapter.id)
    : -1;
  const prevChapter = chapters && currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = chapters && currentIdx >= 0 && currentIdx + 1 < chapters.length
    ? chapters[currentIdx + 1]
    : null;
  function chapterUrl(ch: { id: string; mux_playback_id_bg?: string | null }) {
    const part = ch.mux_playback_id_bg ? "bg" : "main";
    return `/learn/${courseId}?chapter=${ch.id}&part=${part}`;
  }
  function fmtDur(s: number | null | undefined) {
    if (!s) return "";
    return `${Math.floor(s / 60)}m`;
  }

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/15">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-14 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">我的學習</span>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-on-surface truncate">
              {course.title}
            </h1>
            <p className="text-xs text-on-surface-variant truncate">
              講師：{course.instructor}
            </p>
          </div>
        </div>
      </header>

      {/* 試看中提示 — 已登入但沒購買時最上方顯示(?preview=1 可強制顯示用於 demo) */}
      {(forcePreviewBanner || (!hasAccess && currentChapter?.is_free_preview)) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-b border-amber-500/30 px-4 lg:px-8 py-3">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-amber-700 dark:text-amber-300 font-black text-xs uppercase tracking-widest shrink-0">
                試看中
              </span>
              <p className="text-sm text-on-surface truncate">
                您正在觀看免費試看章節 · 完整 9 章課程 + 90 天 Pro 一次解鎖
              </p>
            </div>
            <Link
              href={`/courses/${course.slug}`}
              className="signature-gradient text-white font-extrabold px-5 py-2 rounded-lg text-sm shrink-0 active:scale-95 transition-transform whitespace-nowrap"
            >
              立即解鎖 NT$24,900
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main column: video + checkin + course info */}
          <div className="lg:col-span-8 space-y-4 min-w-0">
            {/* Chapter title — 段落標示由下方大按鈕呈現,標題簡化 */}
            <div>
              <p className="text-xs text-on-surface-variant mb-1 font-bold uppercase tracking-wider">
                第 {currentChapter?.sort_order || "-"} 章 / {chapters?.length || 9}
              </p>
              <h2 className="text-xl lg:text-2xl font-bold text-on-surface leading-tight">
                {currentChapter?.title || course.title}
              </h2>
            </div>

            {/* Video player — 單一,根據 part 決定 main / bg */}
            {canPlay && (currentPart === "bg" ? hasBg : hasMain) ? (
              <div className="aspect-video bg-primary-container rounded-xl overflow-hidden">
                <VideoPlayer
                  key={`${currentChapter.id}-${currentPart}`}
                  chapterId={currentChapter.id}
                  title={
                    currentPart === "bg"
                      ? `${currentChapter.title} - 背景`
                      : currentChapter.title
                  }
                  accentColor="#00d2ff"
                  startTime={currentPart === "main" ? resumeAt : undefined}
                  watermarkId={watermarkId}
                  variant={currentPart}
                  conversionPrompt={
                    !hasAccess && currentChapter?.is_free_preview
                      ? {
                          courseSlug: course.slug,
                          courseTitle: course.title,
                          price: course.price,
                        }
                      : undefined
                  }
                  autoNextUrl={hasAccess && nextPartUrl ? nextPartUrl : undefined}
                  autoNextLabel={hasAccess && nextPartUrl ? nextPartLabel : undefined}
                  autoPlay={autoPlayThisVideo}
                />
              </div>
            ) : canPlay && currentChapter?.youtube_url ? (
              <div className="aspect-video bg-primary-container rounded-xl overflow-hidden">
                <YouTubePlayer
                  url={currentChapter.youtube_url}
                  title={currentChapter.title}
                />
              </div>
            ) : canPlay ? (
              <div className="aspect-video bg-primary-container rounded-xl overflow-hidden flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <span className="text-5xl block mb-4">🎬</span>
                  <p>影片即將上傳</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-primary-container rounded-xl overflow-hidden flex items-center justify-center">
                <div className="text-center text-white">
                  <Lock size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-bold mb-2">需要購買才能觀看</p>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="signature-gradient text-white px-6 py-3 rounded-xl font-bold inline-block hover:opacity-90 transition mt-2"
                  >
                    前往購買
                  </Link>
                </div>
              </div>
            )}

            {/* BG / 正片 切換 — 大按鈕對齊兩段並排 */}
            {currentChapter && (hasBg || hasMain) && (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={hasBg ? buildPartUrl(currentChapter.id, "bg") : "#"}
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm border-2 transition-all active:scale-95",
                    currentPart === "bg" && hasBg
                      ? "signature-gradient text-white border-transparent"
                      : hasBg
                      ? "bg-surface-container border-outline-variant/30 text-on-surface"
                      : "bg-surface-container/50 border-outline-variant/15 text-on-surface-variant/40 pointer-events-none"
                  )}
                >
                  <BookOpen size={18} className="shrink-0" />
                  <span>背景資料</span>
                  {currentChapter.duration_seconds_bg && (
                    <span className="text-xs opacity-70">{fmtDur(currentChapter.duration_seconds_bg)}</span>
                  )}
                </Link>
                <Link
                  href={hasMain ? buildPartUrl(currentChapter.id, "main") : "#"}
                  className={cn(
                    "flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm border-2 transition-all active:scale-95",
                    currentPart === "main" && hasMain
                      ? "signature-gradient text-white border-transparent"
                      : hasMain
                      ? "bg-surface-container border-outline-variant/30 text-on-surface"
                      : "bg-surface-container/50 border-outline-variant/15 text-on-surface-variant/40 pointer-events-none"
                  )}
                >
                  <GraduationCap size={18} className="shrink-0" />
                  <span>久老師正片</span>
                  {currentChapter.duration_seconds && (
                    <span className="text-xs opacity-70">{fmtDur(currentChapter.duration_seconds)}</span>
                  )}
                </Link>
              </div>
            )}

            {/* 桌面版才顯示上一章/下一章大按鈕(手機改用底部 smart nav) */}
            {(prevChapter || nextChapter) && (
              <div className="hidden lg:grid grid-cols-2 gap-2">
                {prevChapter ? (
                  <Link
                    href={chapterUrl(prevChapter)}
                    className="flex items-center gap-3 px-4 py-4 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm active:scale-95 transition-transform"
                  >
                    <ArrowLeft size={18} className="shrink-0 text-on-surface-variant" />
                    <div className="min-w-0 text-left">
                      <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">上一章</div>
                      <div className="font-bold truncate">第 {prevChapter.sort_order} 章 · {prevChapter.title.slice(0, 12)}</div>
                    </div>
                  </Link>
                ) : <div />}
                {nextChapter ? (
                  <Link
                    href={chapterUrl(nextChapter)}
                    className="flex items-center gap-3 px-4 py-4 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface text-sm active:scale-95 transition-transform justify-end"
                  >
                    <div className="min-w-0 text-right">
                      <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">下一章</div>
                      <div className="font-bold truncate">第 {nextChapter.sort_order} 章 · {nextChapter.title.slice(0, 12)}</div>
                    </div>
                    <ArrowLeft size={18} className="shrink-0 text-on-surface-variant rotate-180" />
                  </Link>
                ) : <div />}
              </div>
            )}

            {/* 版權 + 免責聲明 — 縮成小字 group,不打斷視覺流 */}
            <div className="space-y-1.5 px-1">
              <p className="text-[10.5px] text-on-surface-variant/60 leading-relaxed">
                © 2026 巨石文化有限公司 · 講師久方武授權 · 浮水印標記 {watermarkId} · 未經授權散播依《著作權法》追訴
              </p>
              <p className="text-[10.5px] text-on-surface-variant/60 leading-relaxed">
                <strong className="text-on-surface-variant">免責聲明</strong>:本影片內容僅供教學與學術探討之用,不構成任何買賣推薦或投資建議。太空與航太微型股票具備極高波動性與流動性風險,包含本金完全損失風險。投資人應自行審慎評估財務狀況,並對所有投資決策自負盈虧。
              </p>
            </div>

            {/* 學後思考題 — 看完正片後才出現 */}
            {canPlay &&
              currentPart === "main" &&
              currentChapter &&
              (currentChapter.mux_playback_id ||
                currentChapter.youtube_url) && (
                <ChapterCheckin
                  key={currentChapter.id}
                  chapterId={currentChapter.id}
                  chapterTitle={currentChapter.title}
                />
              )}

            {/* 關於課程 折疊 */}
            <CourseInfoCollapse
              courseTitle={course.title}
              instructor={course.instructor}
              description={course.description}
            />
          </div>

          {/* Right rail: chapter list (sticky on desktop) */}
          <aside id="chapter-list" className="lg:col-span-4 scroll-mt-16 hidden lg:block">
            <div className="lg:sticky lg:top-20">
              <div className="bg-surface-container-lowest rounded-xl deep-diffusion overflow-hidden border border-outline-variant/15">
                <div className="p-4 bg-surface-container-low border-b border-outline-variant/15">
                  <h3 className="font-bold text-on-surface text-sm">
                    課程章節（{chapters?.length || 0}）
                  </h3>
                </div>
                <div className="divide-y divide-outline-variant/15 max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {chapters?.map(
                    (ch: {
                      id: string;
                      title: string;
                      sort_order: number;
                      is_free_preview: boolean;
                      duration_seconds: number | null;
                      duration_seconds_bg?: number | null;
                      mux_playback_id?: string | null;
                      mux_playback_id_bg?: string | null;
                    }) => {
                      const isCurrentChapter = ch.id === currentChapter?.id;
                      const isLocked = !ch.is_free_preview && !hasAccess;
                      const progress = progressByChapter.get(ch.id);
                      const hasProgress =
                        !!progress && progress.last_position_seconds > 5;
                      const isCompleted = !!progress?.completed;
                      const chHasBg = !!ch.mux_playback_id_bg;
                      const chHasMain = !!ch.mux_playback_id;

                      return (
                        <div key={ch.id} className="bg-surface-container-lowest">
                          {/* 章節標題列(非 link, 視覺分組) */}
                          <div
                            className={cn(
                              "px-3 pt-3 pb-1.5 flex items-center gap-2",
                              isCurrentChapter && "bg-secondary-fixed/10"
                            )}
                          >
                            <span className="text-xs font-bold text-on-surface-variant w-6 text-right">
                              {ch.sort_order}
                            </span>
                            <p
                              className={cn(
                                "text-sm font-bold leading-snug flex-1 min-w-0 truncate",
                                isCurrentChapter
                                  ? "text-secondary"
                                  : "text-on-surface"
                              )}
                            >
                              {ch.title}
                            </p>
                            {ch.is_free_preview && (
                              <span className="text-[9px] font-bold text-secondary bg-secondary-fixed px-1 py-0.5 rounded shrink-0">
                                免費
                              </span>
                            )}
                            {isCompleted && (
                              <CheckCircle2
                                size={14}
                                className="text-emerald-500 fill-emerald-500/20 shrink-0"
                              />
                            )}
                          </div>

                          {/* 背景 row(若有) */}
                          {chHasBg && (
                            <Link
                              href={
                                isLocked
                                  ? `/courses/${course.slug}`
                                  : `/learn/${courseId}?chapter=${ch.id}&part=bg`
                              }
                              className={cn(
                                "flex items-center gap-2.5 pl-11 pr-3 py-3 text-sm transition-colors group min-h-[44px]",
                                isCurrentChapter && currentPart === "bg"
                                  ? "bg-secondary-fixed/30 text-secondary font-bold"
                                  : "text-on-surface-variant hover:bg-surface-container"
                              )}
                            >
                              {isLocked ? (
                                <Lock size={14} className="shrink-0" />
                              ) : isCurrentChapter && currentPart === "bg" ? (
                                <PlayCircle size={14} className="shrink-0 fill-current" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border border-current opacity-40 shrink-0" />
                              )}
                              <span className="flex-1 truncate flex items-center gap-1.5"><BookOpen size={14} className="shrink-0" />背景資料學習</span>
                              {ch.duration_seconds_bg && (
                                <span className="opacity-70 shrink-0 text-xs">
                                  {formatDuration(ch.duration_seconds_bg)}
                                </span>
                              )}
                            </Link>
                          )}

                          {/* 正片 row */}
                          {chHasMain ? (
                            <Link
                              href={
                                isLocked
                                  ? `/courses/${course.slug}`
                                  : `/learn/${courseId}?chapter=${ch.id}&part=main`
                              }
                              className={cn(
                                "flex items-center gap-2.5 pl-11 pr-3 py-3 text-sm transition-colors group min-h-[44px]",
                                isCurrentChapter && currentPart === "main"
                                  ? "bg-secondary-fixed/30 text-secondary font-bold"
                                  : "text-on-surface-variant hover:bg-surface-container"
                              )}
                            >
                              {isLocked ? (
                                <Lock size={14} className="shrink-0" />
                              ) : isCompleted ? (
                                <CheckCircle2 size={14} className="text-emerald-500 fill-emerald-500/20 shrink-0" />
                              ) : isCurrentChapter && currentPart === "main" ? (
                                <PlayCircle size={14} className="shrink-0 fill-current" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border border-current opacity-40 shrink-0" />
                              )}
                              <span className="flex-1 truncate flex items-center gap-1.5"><GraduationCap size={14} className="shrink-0" />久老師正片</span>
                              {hasProgress && !isCompleted && (
                                <span className="text-amber-600 dark:text-amber-400 shrink-0 text-xs">
                                  到 {formatDuration(progress!.last_position_seconds)}
                                </span>
                              )}
                              {ch.duration_seconds && (
                                <span className="opacity-70 shrink-0 text-xs">
                                  {formatDuration(ch.duration_seconds)}
                                </span>
                              )}
                            </Link>
                          ) : (
                            <div className="pl-11 pr-3 py-3 text-sm text-on-surface-variant/50 min-h-[44px] flex items-center">
                              影片即將上傳
                            </div>
                          )}

                          {/* 章節間距 */}
                          <div className="h-1.5" />
                        </div>
                      );
                    }
                  )}
                  {(!chapters || chapters.length === 0) && (
                    <div className="p-4 text-center text-on-surface-variant text-sm">
                      章節即將上線
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 手機底部 smart nav — 章節抽屜 + 動態下一段 CTA */}
      <MobileLearnNav
        chapters={chapters || []}
        currentChapterId={currentChapter?.id || null}
        currentPart={currentPart}
        hasAccess={hasAccess}
        courseId={courseId}
        courseSlug={course.slug}
        progressByChapter={Object.fromEntries(progressByChapter)}
        nextPartUrl={nextPartUrl}
        nextPartLabel={nextPartLabel}
        totalChapters={chapters?.length || 0}
      />
    </main>
  );
}
