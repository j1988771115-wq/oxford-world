import { getUserProfile, getUserCourses } from "@/lib/actions/courses";
import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";

export const metadata = {
  title: "我的學習 — 牛津視界",
};

export default async function DashboardPage() {
  const profile = await getUserProfile();
  const courses = await getUserCourses();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Welcome */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">我的學習</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-gray-500">
                會員等級：
                <span className="font-medium text-gray-900">
                  {profile?.tier === "pro" ? "Pro 會員" : "免費會員"}
                </span>
              </span>
              {profile?.tier !== "pro" && (
                <Link
                  href="/pricing"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  升級 Pro →
                </Link>
              )}
            </div>
          </div>

          {/* Streak */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500">學習連勝</div>
              <div className="text-2xl font-bold text-orange-500 mt-1">
                🔥 {profile?.current_streak || 0} 天
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500">最長連勝</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {profile?.longest_streak || 0} 天
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500">已購課程</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {courses.length} 門
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-4 mb-8">
            <Link
              href="/ai-assistant"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              🤖 AI 助手
            </Link>
            <Link
              href="/quiz"
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              🎯 學習路徑測驗
            </Link>
            <a
              href="https://discord.gg/your-invite"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              👥 Discord 社群
            </a>
          </div>

          {/* My Courses */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            我的課程
          </h2>
          {courses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500 mb-4">你還沒有任何課程</p>
              <Link
                href="/courses"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                瀏覽課程 →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((access: { course_id: string; courses: { title: string; instructor: string; slug: string } }) => (
                <Link
                  key={access.course_id}
                  href={`/learn/${access.course_id}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900">
                    {access.courses?.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {access.courses?.instructor}
                  </p>
                  <div className="mt-3 text-sm text-blue-600 font-medium">
                    繼續學習 →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
