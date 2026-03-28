import { notFound, redirect } from "next/navigation";
import { checkCourseAccess } from "@/lib/actions/courses";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function LearnPage({ params }: Props) {
  const { courseId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  // Free preview courses don't need access check
  const needsAccess = course.price > 0 && !course.is_free_preview;
  if (needsAccess) {
    const hasAccess = await checkCourseAccess(courseId);
    if (!hasAccess) {
      redirect(`/courses/${course.slug}`);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950">
      <Navbar />
      <main className="flex-1 flex flex-col items-center">
        {/* Video Player */}
        <div className="w-full max-w-5xl">
          <div className="aspect-video bg-black rounded-b-xl overflow-hidden">
            {course.mux_playback_id ? (
              // Mux player will be integrated here
              // Using signed URLs for paid content
              <div className="w-full h-full flex items-center justify-center text-white">
                <p>影片播放器（Mux Playback ID: {course.mux_playback_id}）</p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <span className="text-5xl block mb-4">🎬</span>
                  <p>影片即將上傳</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Course Info + AI Assistant */}
        <div className="w-full max-w-5xl px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h1 className="text-2xl font-bold text-white mb-2">
                {course.title}
              </h1>
              <p className="text-gray-400">講師：{course.instructor}</p>
              {course.description && (
                <p className="text-gray-300 mt-4 leading-relaxed">
                  {course.description}
                </p>
              )}
            </div>

            <div className="md:col-span-1">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h3 className="font-semibold text-white mb-3">學習工具</h3>
                <div className="space-y-2">
                  <Link
                    href={`/ai-assistant?course=${courseId}`}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 transition text-sm"
                  >
                    🤖 問 AI 助手
                  </Link>
                  <a
                    href="https://discord.gg/your-invite"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition text-sm"
                  >
                    👥 討論區
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
