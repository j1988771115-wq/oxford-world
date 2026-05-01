import { notFound } from "next/navigation";
import { checkCourseAccess } from "@/lib/actions/courses";
import { createClient } from "@/lib/supabase/server";
import { VideoTabs } from "@/components/courses/video-tabs";
import { YouTubePlayer } from "@/components/courses/youtube-player";
import { ChapterCheckin } from "@/components/courses/chapter-checkin";
import { CourseInfoCollapse } from "@/components/courses/course-info-collapse";
import Link from "next/link";
import {
  PlayCircle,
  Lock,
  Clock,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ chapter?: string }>;
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
  const { chapter: chapterId } = await searchParams;

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

      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main column: video + checkin + course info */}
          <div className="lg:col-span-8 space-y-6 min-w-0">
            {/* Chapter title */}
            <div>
              <p className="text-xs text-on-surface-variant mb-1">
                第 {currentChapter?.sort_order || "-"} 章
              </p>
              <h2 className="text-2xl font-bold text-on-surface">
                {currentChapter?.title || course.title}
              </h2>
            </div>

            {/* Video area: Tab if has bg, else single player */}
            {canPlay && currentChapter?.mux_playback_id ? (
              <VideoTabs
                chapterId={currentChapter.id}
                chapterTitle={currentChapter.title}
                hasMain={!!currentChapter.mux_playback_id}
                hasBg={!!currentChapter.mux_playback_id_bg}
                durationMain={currentChapter.duration_seconds}
                durationBg={currentChapter.duration_seconds_bg}
                resumeAt={resumeAt}
                watermarkId={watermarkId}
              />
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

            {/* 學後思考題 */}
            {canPlay &&
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
          <aside className="lg:col-span-4">
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
                      mux_playback_id_bg?: string | null;
                    }) => {
                      const isCurrent = ch.id === currentChapter?.id;
                      const isLocked = !ch.is_free_preview && !hasAccess;
                      const progress = progressByChapter.get(ch.id);
                      const hasProgress =
                        !!progress && progress.last_position_seconds > 5;
                      const isCompleted = !!progress?.completed;

                      return (
                        <Link
                          key={ch.id}
                          href={
                            isLocked
                              ? `/courses/${course.slug}`
                              : `/learn/${courseId}?chapter=${ch.id}`
                          }
                          className={cn(
                            "flex items-center gap-3 p-3 transition-colors group",
                            isCurrent
                              ? "bg-secondary-fixed/20"
                              : "hover:bg-surface-container"
                          )}
                        >
                          <div className="shrink-0">
                            {isLocked ? (
                              <Lock
                                size={16}
                                className="text-on-surface-variant"
                              />
                            ) : isCompleted ? (
                              <CheckCircle2
                                size={16}
                                className="text-emerald-500 fill-emerald-500/20"
                              />
                            ) : isCurrent ? (
                              <PlayCircle
                                size={16}
                                className="text-secondary fill-current"
                              />
                            ) : (
                              <CheckCircle2
                                size={16}
                                className="text-on-surface-variant"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-sm leading-snug line-clamp-2",
                                isCurrent
                                  ? "font-bold text-secondary"
                                  : "text-on-surface group-hover:text-on-surface"
                              )}
                            >
                              {ch.sort_order}. {ch.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {ch.is_free_preview && (
                                <span className="text-[10px] font-bold text-secondary bg-secondary-fixed px-1.5 py-0.5 rounded">
                                  免費
                                </span>
                              )}
                              {ch.mux_playback_id_bg && (
                                <span className="text-[10px] text-on-surface-variant">
                                  +背景
                                </span>
                              )}
                              {ch.duration_seconds && (
                                <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatDuration(ch.duration_seconds)}
                                </span>
                              )}
                              {isCompleted ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  已看完
                                </span>
                              ) : hasProgress ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                  到 {formatDuration(progress!.last_position_seconds)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </Link>
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
    </main>
  );
}
