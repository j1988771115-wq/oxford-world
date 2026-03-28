import { getCourses } from "@/lib/actions/courses";
import { CourseCard } from "@/components/courses/course-card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "課程目錄 — 牛津視界",
  description: "系統化的 AI 時代學習課程，從入門到進階",
};

export default async function CoursesPage() {
  const courses = await getCourses();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">課程目錄</h1>
            <p className="text-gray-600 mt-2">
              系統化的學習路徑，從 AI 入門到實戰應用
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📚</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                課程即將推出
              </h2>
              <p className="text-gray-500">
                我們正在準備精彩的課程內容，請訂閱電子報獲取最新消息。
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <CourseCard
                  key={course.id}
                  slug={course.slug}
                  title={course.title}
                  description={course.description}
                  instructor={course.instructor}
                  price={course.price}
                  category={course.category}
                  thumbnailUrl={course.thumbnail_url}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
