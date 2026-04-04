import { notFound, redirect } from "next/navigation";
import { checkCourseAccess } from "@/lib/actions/courses";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function LearnPage({ params }: Props) {
  const { courseId } = await params;

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  return (
    <main className="lg:pl-64 flex flex-col min-h-screen bg-surface">
      {/* Video Player */}
      <div className="w-full max-w-5xl mx-auto pt-8">
        <div className="aspect-video bg-primary-container rounded-xl overflow-hidden">
          {course.mux_playback_id ? (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p>影片播放器（Mux Playback ID: {course.mux_playback_id}）</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <span className="text-5xl block mb-4">🎬</span>
                <p>影片即將上傳</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course Info + AI Assistant */}
      <div className="w-full max-w-5xl mx-auto px-8 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <h1 className="text-2xl font-bold text-on-surface mb-2">
              {course.title}
            </h1>
            <p className="text-on-surface-variant">
              講師：{course.instructor}
            </p>
            {course.description && (
              <p className="text-on-surface-variant mt-4 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          <div className="md:col-span-1">
            <div className="bg-surface-container-lowest rounded-xl p-4 deep-diffusion">
              <h3 className="font-bold text-on-surface mb-3">學習工具</h3>
              <div className="space-y-2">
                <Link
                  href={`/ai-assistant?course=${courseId}`}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant hover:bg-secondary-fixed-dim transition text-sm font-bold"
                >
                  🤖 問 AI 助手
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
