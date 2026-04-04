import { notFound } from "next/navigation";
import { checkCourseAccess } from "@/lib/actions/courses";
import { createClient } from "@/lib/supabase/server";
import { VideoPlayer } from "@/components/courses/video-player";
import Link from "next/link";
import {
  PlayCircle,
  Lock,
  Clock,
  CheckCircle2,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ chapter?: string }>;
}

export default async function LearnPage({ params, searchParams }: Props) {
  const { courseId } = await params;
  const { chapter: chapterId } = await searchParams;

  const supabase = await createClient();

  // Get course
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  // Get chapters
  const { data: chapters } = await supabase
    .from("course_chapters")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  // Check access
  const hasAccess = await checkCourseAccess(courseId);

  // Current chapter
  const currentChapter = chapterId
    ? chapters?.find((ch: any) => ch.id === chapterId)
    : chapters?.[0];

  const canPlay =
    currentChapter?.is_free_preview || hasAccess;

  function formatDuration(seconds: number | null) {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <main className="lg:pl-64 flex flex-col min-h-screen bg-surface">
      {/* Video Player */}
      <div className="w-full max-w-5xl mx-auto pt-8 px-4">
        <div className="aspect-video bg-primary-container rounded-xl overflow-hidden">
          {canPlay && currentChapter?.mux_playback_id ? (
            <VideoPlayer
              playbackId={currentChapter.mux_playback_id}
              title={currentChapter.title}
              accentColor="#00d2ff"
            />
          ) : canPlay && !currentChapter?.mux_playback_id ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <span className="text-5xl block mb-4">🎬</span>
                <p>影片即將上傳</p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-container">
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
        </div>
      </div>

      {/* Course Info + Chapter List */}
      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: Current chapter info */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-on-surface mb-1">
                {currentChapter?.title || course.title}
              </h1>
              <p className="text-on-surface-variant">
                {course.title} — 講師：{course.instructor}
              </p>
            </div>

            {course.description && (
              <p className="text-on-surface-variant leading-relaxed">
                {course.description}
              </p>
            )}

            {/* Quick actions */}
            <div className="flex gap-3">
              <Link
                href={`/ai-assistant?course=${courseId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary-fixed text-on-secondary-fixed-variant hover:bg-secondary-fixed-dim transition text-sm font-bold"
              >
                <Bot size={16} /> 問 AI 助手
              </Link>
            </div>
          </div>

          {/* Right: Chapter list */}
          <div className="md:col-span-1">
            <div className="bg-surface-container-lowest rounded-xl deep-diffusion overflow-hidden">
              <div className="p-4 bg-surface-container-low">
                <h3 className="font-bold text-on-surface text-sm">
                  課程章節 ({chapters?.length || 0})
                </h3>
              </div>
              <div className="divide-y divide-outline-variant/20">
                {chapters?.map((ch: any, i: number) => {
                  const isCurrent = ch.id === currentChapter?.id;
                  const isLocked = !ch.is_free_preview && !hasAccess;

                  return (
                    <Link
                      key={ch.id}
                      href={
                        isLocked
                          ? `/courses/${course.slug}`
                          : `/learn/${courseId}?chapter=${ch.id}`
                      }
                      className={cn(
                        "flex items-center gap-3 p-4 transition-colors",
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
                            "text-sm truncate",
                            isCurrent
                              ? "font-bold text-secondary"
                              : "text-on-surface"
                          )}
                        >
                          {ch.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ch.is_free_preview && (
                            <span className="text-[10px] font-bold text-secondary-container bg-secondary-fixed px-1.5 py-0.5 rounded">
                              免費
                            </span>
                          )}
                          {ch.duration_seconds && (
                            <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                              <Clock size={10} />
                              {formatDuration(ch.duration_seconds)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {(!chapters || chapters.length === 0) && (
                  <div className="p-4 text-center text-on-surface-variant text-sm">
                    章節即將上線
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
