import { getUserProfile, getUserCourses } from "@/lib/actions/courses";
import {
  BookOpen,
  CheckCircle2,
  Lock,
  TrendingUp,
  Flame,
  Search,
  Bell,
  HelpCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "我的學習 — 牛津視界",
};

export default async function DashboardPage() {
  const profile = (await getUserProfile()) as {
    tier?: string;
    current_streak?: number;
    longest_streak?: number;
    display_name?: string;
  } | null;
  const courses = (await getUserCourses()) as {
    course_id: string;
    courses: { title: string; instructor: string; slug: string };
  }[];

  const streak = profile?.current_streak || 0;
  const displayName = profile?.display_name || "學員";

  return (
    <main className="lg:pl-64 pt-24 pb-12 px-8 max-w-[1600px] mx-auto">
      {/* Top Bar */}
      <div className="fixed top-0 right-0 w-[calc(100%-16rem)] z-40 bg-surface/80 backdrop-blur-xl justify-between items-center px-8 h-16 hidden lg:flex">
        <h1 className="text-xl font-black text-on-surface">AI 學習學院</h1>
        <div className="flex items-center gap-6">
          <div className="relative w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              size={18}
            />
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-secondary-container transition-all"
              placeholder="搜尋課程、學習路徑..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-4 text-on-surface-variant">
            <button className="hover:text-secondary transition-colors">
              <Bell size={20} />
            </button>
            <button className="hover:text-secondary transition-colors">
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Welcome Banner */}
      <section className="mb-10 relative overflow-hidden rounded-3xl p-8 flex items-center justify-between bg-surface-container-lowest deep-diffusion border border-outline-variant/10">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-on-surface tracking-tight mb-2">
            {streak > 0 ? `歡迎回來，${displayName}！` : `嗨，${displayName}！`}
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {streak > 0 ? (
              <span className="px-4 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-sm flex items-center gap-2">
                <Flame size={18} className="fill-current" />
                已連續學習 {streak} 天
              </span>
            ) : (
              <span className="text-on-surface-variant font-medium">
                開始你的第一堂課吧！
              </span>
            )}
            <span className="text-on-surface-variant font-medium">
              {profile?.tier === "pro" ? "Pro 會員" : "免費會員"}
              {profile?.tier !== "pro" && (
                <Link
                  href="/pricing"
                  className="text-secondary ml-2 hover:underline"
                >
                  升級 Pro →
                </Link>
              )}
            </span>
          </div>
        </div>
        <div className="hidden lg:block relative z-10">
          <div className="flex gap-2">
            <div className="w-1.5 h-12 bg-secondary-container/20 rounded-full" />
            <div className="w-1.5 h-16 bg-secondary-container/40 rounded-full" />
            <div className="w-1.5 h-20 signature-gradient rounded-full" />
            <div className="w-1.5 h-14 bg-secondary-container/30 rounded-full" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-10">
          {/* My Courses */}
          {courses.length > 0 ? (
            <section className="bg-surface-container-low rounded-3xl p-8">
              <h2 className="text-2xl font-bold font-headline mb-6 text-on-surface">
                我的課程
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {courses.map((access) => (
                  <Link
                    key={access.course_id}
                    href={`/learn/${access.course_id}`}
                    className="bg-surface-container-lowest p-6 rounded-xl deep-diffusion hover:-translate-y-1 transition-all group"
                  >
                    <h3 className="font-bold text-on-surface group-hover:text-secondary transition-colors">
                      {access.courses?.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {access.courses?.instructor}
                    </p>
                    <div className="mt-3 text-sm text-secondary font-bold">
                      繼續學習 →
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <section className="bg-surface-container-low rounded-3xl p-8 text-center">
              <BookOpen size={48} className="text-on-surface-variant/30 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-on-surface mb-2">還沒有課程</h2>
              <p className="text-on-surface-variant mb-6">
                探索我們的課程，開始你的 AI 學習之旅
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 signature-gradient text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
              >
                瀏覽課程 <ArrowRight size={18} />
              </Link>
            </section>
          )}

          {/* Quick Start Guide — show when no courses */}
          {courses.length === 0 && (
            <section className="bg-surface-container-low rounded-3xl p-8">
              <h2 className="text-2xl font-bold font-headline mb-6 text-on-surface flex items-center gap-3">
                <Sparkles className="text-secondary" size={24} />
                開始指南
              </h2>
              <div className="space-y-4">
                {[
                  { step: "01", title: "完成學習路徑測驗", desc: "AI 會根據你的背景推薦最適合的課程", href: "/quiz", done: false },
                  { step: "02", title: "瀏覽並選擇課程", desc: "從免費課程開始，或升級 Pro 解鎖全部", href: "/courses", done: false },
                  { step: "03", title: "加入 Discord 社群", desc: "與同儕交流，獲得學習夥伴", href: "https://discord.gg/oxfordvision", done: false },
                ].map((item) => (
                  <Link
                    key={item.step}
                    href={item.href}
                    className="flex items-center gap-4 bg-surface-container-lowest p-5 rounded-xl deep-diffusion hover:-translate-y-0.5 transition-all"
                  >
                    <span className="w-10 h-10 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center font-bold text-sm shrink-0">
                      {item.step}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-bold text-on-surface">{item.title}</h3>
                      <p className="text-sm text-on-surface-variant">{item.desc}</p>
                    </div>
                    <ArrowRight size={18} className="text-on-surface-variant shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Widgets */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Progress Widget */}
          <div className="bg-surface-container-lowest p-8 rounded-3xl deep-diffusion text-center">
            <h4 className="text-base font-bold mb-6 text-on-surface">
              學習統計
            </h4>
            <div className="relative w-40 h-40 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  className="text-surface-container"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="12"
                />
                <circle
                  className="text-secondary"
                  cx="80"
                  cy="80"
                  fill="transparent"
                  r="70"
                  stroke="currentColor"
                  strokeDasharray="440"
                  strokeDashoffset={440 - (courses.length / Math.max(courses.length, 5)) * 440}
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-on-surface">
                  {courses.length}
                </span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  門課程
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-on-surface">{streak}</div>
                <div className="text-xs text-on-surface-variant">天連勝</div>
              </div>
              <div>
                <div className="text-2xl font-black text-on-surface">{profile?.longest_streak || 0}</div>
                <div className="text-xs text-on-surface-variant">最長連勝</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Link
              href="/ai-assistant"
              className="flex items-center gap-3 bg-surface-container-lowest p-4 rounded-xl deep-diffusion hover:-translate-y-1 transition-all"
            >
              <div className="w-10 h-10 rounded-lg signature-gradient flex items-center justify-center">
                <span className="text-white text-lg">AI</span>
              </div>
              <div>
                <div className="font-bold text-on-surface text-sm">
                  AI 助手
                </div>
                <div className="text-xs text-on-surface-variant">
                  問任何課程相關問題
                </div>
              </div>
            </Link>
            <Link
              href="/quiz"
              className="flex items-center gap-3 bg-surface-container-lowest p-4 rounded-xl deep-diffusion hover:-translate-y-1 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
                <span className="text-secondary-container text-lg">Q</span>
              </div>
              <div>
                <div className="font-bold text-on-surface text-sm">
                  學習路徑測驗
                </div>
                <div className="text-xs text-on-surface-variant">
                  找到最適合你的方向
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
