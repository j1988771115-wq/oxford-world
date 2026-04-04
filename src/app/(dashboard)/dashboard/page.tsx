import { getUserProfile, getUserCourses } from "@/lib/actions/courses";
import { MILESTONES } from "@/lib/ui-data";
import {
  BookOpen,
  CheckCircle2,
  Lock,
  Verified,
  TrendingUp,
  Flame,
  Search,
  Bell,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "我的學習 — 牛津視界",
};

export default async function DashboardPage() {
  const realProfile = await getUserProfile() as { tier?: string; current_streak?: number; longest_streak?: number } | null;
  const realCourses = await getUserCourses() as { course_id: string; courses: { title: string; instructor: string; slug: string } }[];

  const profile = realProfile || {
    tier: "pro",
    current_streak: 7,
    longest_streak: 14,
  };
  const courses = realCourses.length > 0 ? realCourses : [
    { course_id: "1", courses: { title: "AI 驅動決策力：經理人的數據思維", instructor: "久方武院長", slug: "ai-decision-making" } },
    { course_id: "2", courses: { title: "提示工程大師班：精準溝通的藝術", instructor: "林偉傑", slug: "prompt-engineering-masterclass" } },
    { course_id: "3", courses: { title: "2026 AI 趨勢導讀：掌握技術奇點", instructor: "張美玲", slug: "ai-trends-2026" } },
  ];

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
            歡迎回來！
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-4 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-bold text-sm flex items-center gap-2">
              <Flame size={18} className="fill-current" />
              已連續學習 {profile?.current_streak || 0} 天
            </span>
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
          {courses.length > 0 && (
            <section className="bg-surface-container-low rounded-3xl p-8">
              <h2 className="text-2xl font-bold font-headline mb-6 text-on-surface">
                我的課程
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {courses.map(
                  (access: {
                    course_id: string;
                    courses: {
                      title: string;
                      instructor: string;
                      slug: string;
                    };
                  }) => (
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
                  )
                )}
              </div>
            </section>
          )}

          {/* Learning Path Timeline */}
          <section className="bg-surface-container-low rounded-3xl p-8 relative overflow-hidden">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-2xl font-bold font-headline flex items-center gap-3 text-on-surface">
                <BookOpen className="text-secondary" size={24} />
                學習里程碑
              </h2>
              <span className="text-sm font-medium text-secondary">
                預計耗時：12 週
              </span>
            </div>

            <div className="relative space-y-12 pl-8 border-l-2 border-outline-variant/30">
              {MILESTONES.map((m) => (
                <div key={m.id} className="relative">
                  <div
                    className={cn(
                      "absolute -left-[41px] top-0 w-5 h-5 rounded-full ring-8",
                      m.status === "completed"
                        ? "bg-secondary ring-secondary-container/20"
                        : m.status === "current"
                          ? "bg-secondary-container ring-secondary-container/10"
                          : "bg-surface-container-highest ring-surface-container"
                    )}
                  >
                    {m.status === "completed" && (
                      <CheckCircle2
                        size={20}
                        className="text-white absolute -top-0.5 -left-0.5"
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      "bg-surface-container-lowest p-6 rounded-xl deep-diffusion flex flex-col gap-2 transition-all",
                      m.status === "locked" && "opacity-60"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-bold uppercase tracking-widest",
                        m.status === "locked"
                          ? "text-on-surface-variant"
                          : "text-secondary-container"
                      )}
                    >
                      {m.phase}
                    </span>
                    <h3 className="text-xl font-bold font-headline flex items-center gap-2 text-on-surface">
                      {m.title}
                      {m.status === "locked" && (
                        <Lock size={16} className="text-on-surface-variant" />
                      )}
                    </h3>
                    <p className="text-on-surface-variant text-sm">
                      {m.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar Widgets */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* Progress Widget */}
          <div className="bg-surface-container-lowest p-8 rounded-3xl deep-diffusion text-center">
            <h4 className="text-base font-bold mb-6 text-on-surface">
              本週目標進度
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
                  strokeDashoffset="176"
                  strokeWidth="12"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-on-surface">
                  {courses.length}
                </span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  Courses
                </span>
              </div>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="bg-surface-container-lowest rounded-3xl deep-diffusion overflow-hidden">
            <div className="p-6 bg-surface-container-low flex justify-between items-center">
              <h4 className="font-bold text-on-surface">排行榜 (Top 5)</h4>
              <TrendingUp className="text-secondary" size={20} />
            </div>
            <div className="p-4 space-y-2">
              {[
                { rank: 1, name: "陳映璇", xp: "2,450 XP" },
                { rank: 2, name: "你", xp: "2,120 XP", active: true },
                { rank: 3, name: "李嘉偉", xp: "1,980 XP" },
                { rank: 4, name: "黃淑芬", xp: "1,850 XP" },
                { rank: 5, name: "周建宇", xp: "1,720 XP" },
              ].map((user) => (
                <div
                  key={user.rank}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl transition-colors",
                    user.active
                      ? "bg-secondary-fixed/20 border border-secondary-fixed"
                      : "hover:bg-surface-container"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 text-sm font-black",
                      user.active ? "text-secondary" : "text-on-surface-variant"
                    )}
                  >
                    {user.rank}
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-sm text-on-surface",
                      user.active ? "font-bold" : "font-medium"
                    )}
                  >
                    {user.name}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      user.active ? "text-secondary" : "text-on-surface-variant"
                    )}
                  >
                    {user.xp}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Certification Preview */}
          <div className="bg-surface-container-low p-6 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <Verified size={16} className="fill-current" />
              <span className="text-xs font-bold tracking-wider uppercase">
                課程證書認可
              </span>
            </div>
            <p className="text-xs text-on-surface-variant italic">
              完成此路徑後，你將獲得由 Oxford Vision
              頒發的數位證書，可直接同步至 LinkedIn Profile。
            </p>
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
