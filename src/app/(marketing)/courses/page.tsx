import { getCourses } from "@/lib/actions/courses";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "課程目錄 — 牛津視界",
  description: "系統化的 AI 時代學習課程，從入門到進階",
};

export default async function CoursesPage() {
  const courses = await getCourses();
  const supabase = await createClient();

  // 抓每課程的章節數（用來判斷「預告中」— 沒影片的課程）
  const { data: chapterCounts } = await supabase
    .from("course_chapters")
    .select("course_id, mux_playback_id, youtube_url");

  const upcomingCourseIds = new Set<string>();
  if (chapterCounts) {
    const courseIdToHasVideo = new Map<string, boolean>();
    for (const ch of chapterCounts as Array<{
      course_id: string;
      mux_playback_id: string | null;
      youtube_url: string | null;
    }>) {
      if (ch.mux_playback_id || ch.youtube_url) {
        courseIdToHasVideo.set(ch.course_id, true);
      } else if (!courseIdToHasVideo.has(ch.course_id)) {
        courseIdToHasVideo.set(ch.course_id, false);
      }
    }
    for (const c of courses) {
      if (!courseIdToHasVideo.has(c.id) || courseIdToHasVideo.get(c.id) === false) {
        upcomingCourseIds.add(c.id);
      }
    }
  }

  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-16">
          <h1 className="text-5xl font-black text-on-surface tracking-tight mb-4 font-headline">
            課程目錄
          </h1>
          <p className="text-on-surface-variant text-lg">
            從基礎到進階，全方位的 AI 賦能計畫
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-24 bg-surface-container-lowest rounded-3xl deep-diffusion">
            <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📚</span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">
              課程即將推出
            </h2>
            <p className="text-on-surface-variant max-w-md mx-auto">
              我們正在準備精彩的課程內容，請訂閱電子報獲取最新消息。
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map(
              (course: {
                id: string;
                slug: string;
                title: string;
                description: string;
                instructor: string;
                price: number;
                category: string;
                thumbnail_url?: string;
              }) => {
                const isUpcoming = upcomingCourseIds.has(course.id);
                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.slug}`}
                    className="bg-surface-container-lowest rounded-xl overflow-hidden group deep-diffusion hover:-translate-y-2 transition-all duration-300"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <div className="absolute inset-0 signature-gradient opacity-20" />
                      {course.thumbnail_url && (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${isUpcoming ? "opacity-60" : ""}`}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      {course.category && (
                        <div className="absolute top-4 left-4 bg-primary-container text-[#00D2FF] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                          {course.category}
                        </div>
                      )}
                      {isUpcoming && (
                        <div className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                          預告中
                        </div>
                      )}
                    </div>
                    <div className="p-8">
                      <h4 className="text-xl font-bold text-on-surface mb-2 group-hover:text-secondary transition-colors">
                        {course.title}
                      </h4>
                      <p className="text-on-surface-variant text-sm line-clamp-2 mb-4">
                        {course.description}
                      </p>
                      <p className="text-on-surface-variant text-xs mb-6">
                        講師：{course.instructor}
                      </p>
                      <div className="flex items-center justify-between pt-6 border-t border-outline-variant/30">
                        {isUpcoming ? (
                          <span className="text-base font-bold text-amber-700 dark:text-amber-300">
                            敬請期待 · 訂閱電子報先收到通知
                          </span>
                        ) : (
                          <span className="text-2xl font-black text-on-surface tracking-tight">
                            {course.price === 0
                              ? "免費"
                              : `NT$ ${course.price.toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </main>
  );
}
