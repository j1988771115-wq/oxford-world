import {
  getUserProfile,
  getUserCourses,
  getActivityData,
  getUserXP,
  getCourses,
} from "@/lib/actions/courses";
import { getLatestInsight } from "@/lib/actions/insights";
import { ActivityGrid } from "@/components/dashboard/activity-grid";
import {
  BookOpen,
  ArrowRight,
  Sparkles,
  Swords,
  MessageSquare,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "我的學習 — 牛津視界",
};

export default async function DashboardPage() {
  const [profile, courses, activityData, xpData, allCourses, latestInsight] = await Promise.all([
    getUserProfile() as Promise<{
      tier?: string;
      current_streak?: number;
      longest_streak?: number;
      display_name?: string;
      email?: string;
      avatar_url?: string;
    } | null>,
    getUserCourses() as Promise<
      {
        course_id: string;
        courses: { title: string; instructor: string; slug: string };
      }[]
    >,
    getActivityData(),
    getUserXP(),
    getCourses() as Promise<{ id: string; slug: string; title: string; price: number; category?: string }[]>,
    getLatestInsight(),
  ]);

  const displayName = profile?.display_name || "學員";
  const initial = displayName[0] || "U";

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 lg:px-8 h-16 max-w-[1400px] mx-auto">
          <h1 className="text-lg font-black text-on-surface">我的學習</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/achievements"
              className="flex items-center gap-2 bg-surface-container-low hover:bg-surface-container px-3 py-1.5 rounded-full transition-colors"
            >
              <Zap size={14} className="text-secondary" />
              <span className="text-xs font-bold text-on-surface">
                Lv.{xpData.level}
              </span>
              <span className="text-xs text-on-surface-variant">
                {xpData.xp.toLocaleString()} XP
              </span>
            </Link>
            <Link href="/settings" className="shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-9 h-9 rounded-full object-cover shadow-md"
                />
              ) : (
                <div className="w-9 h-9 rounded-full signature-gradient flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {initial}
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[1400px] mx-auto space-y-8">
        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl p-8 bg-primary-container">
          <div className="absolute top-0 right-0 w-1/3 h-full overflow-hidden opacity-30 pointer-events-none">
            <div className="absolute top-1/4 right-[-10%] w-[300px] h-[300px] bg-[#00d2ff] blur-[100px] rounded-full opacity-30" />
          </div>

          <div className="flex items-center gap-5 relative z-10">
            {/* Avatar */}
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl signature-gradient flex items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
                {initial}
              </div>
            )}

            <div className="flex-1">
              <h2 className="text-2xl font-black text-white tracking-tight">
                嗨，{displayName}！
              </h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-slate-400 text-sm">
                  {profile?.tier === "pro" ? (
                    <span className="text-[#00D2FF] font-bold">Pro 會員</span>
                  ) : (
                    <>
                      免費會員
                      <Link
                        href="/pricing"
                        className="text-[#00D2FF] ml-2 hover:underline font-bold"
                      >
                        升級 Pro →
                      </Link>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <Link
            href="/achievements"
            className="bg-surface-container-lowest rounded-xl p-5 deep-diffusion text-center hover:-translate-y-1 transition-all"
          >
            <div className="text-2xl font-black text-secondary">
              Lv.{xpData.level}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              查看等級 →
            </div>
          </Link>
          <div className="bg-surface-container-lowest rounded-xl p-5 deep-diffusion text-center">
            <div className="text-2xl font-black text-on-surface">
              {xpData.xp.toLocaleString()}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">XP</div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 deep-diffusion text-center">
            <div className="text-2xl font-black text-on-surface">
              {courses.length}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">門課程</div>
          </div>
        </div>

        {/* Activity Grid */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10">
          <h2 className="text-base font-bold text-on-surface mb-4">
            學習足跡
          </h2>
          <ActivityGrid activityData={activityData} />
        </section>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* My Courses */}
            {courses.length > 0 ? (
              <section className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10">
                <h2 className="text-lg font-bold text-on-surface mb-4">
                  我的課程
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {courses.map((access) => (
                    <Link
                      key={access.course_id}
                      href={`/learn/${access.course_id}`}
                      className="bg-surface-container-low p-5 rounded-xl hover:bg-surface-container transition-colors group"
                    >
                      <h3 className="font-bold text-on-surface text-sm group-hover:text-secondary transition-colors">
                        {access.courses?.title}
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {access.courses?.instructor}
                      </p>
                      <div className="mt-3 text-xs text-secondary font-bold">
                        繼續學習 →
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : (
              <section className="bg-surface-container-lowest rounded-2xl p-8 deep-diffusion border border-outline-variant/10 text-center">
                <BookOpen
                  size={40}
                  className="text-on-surface-variant/30 mx-auto mb-3"
                />
                <h2 className="text-lg font-bold text-on-surface mb-2">
                  還沒有課程
                </h2>
                <p className="text-on-surface-variant text-sm mb-5">
                  探索課程，開始你的 AI 學習之旅
                </p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 signature-gradient text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition"
                >
                  瀏覽課程 <ArrowRight size={16} />
                </Link>
              </section>
            )}

            {/* Quick Start Guide */}
            {courses.length === 0 && (
              <section className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10">
                <h2 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                  <Sparkles className="text-secondary" size={20} />
                  開始指南
                </h2>
                <div className="space-y-3">
                  {[
                    {
                      step: "01",
                      title: "完成學習路徑測驗",
                      desc: "AI 根據你的背景推薦課程",
                      href: "/quiz",
                    },
                    {
                      step: "02",
                      title: "瀏覽課程",
                      desc: "免費試看，或升級 Pro 解鎖全部",
                      href: "/courses",
                    },
                    {
                      step: "03",
                      title: "加入 Discord 社群",
                      desc: "與同儕交流",
                      href: "https://discord.gg/oxfordvision",
                    },
                  ].map((item) => (
                    <Link
                      key={item.step}
                      href={item.href}
                      className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl hover:bg-surface-container transition-colors"
                    >
                      <span className="w-9 h-9 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center font-bold text-xs shrink-0">
                        {item.step}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-bold text-on-surface text-sm">
                          {item.title}
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          {item.desc}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-on-surface-variant shrink-0"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recommended Courses */}
            {allCourses.length > 0 && (
              <section className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <Sparkles size={18} className="text-secondary" />
                    推薦課程
                  </h2>
                  <Link href="/courses" className="text-xs text-secondary font-bold hover:underline">
                    全部課程 →
                  </Link>
                </div>
                <div className="space-y-3">
                  {allCourses.slice(0, 3).map((c) => (
                    <Link
                      key={c.id}
                      href={`/courses/${c.slug}`}
                      className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl hover:bg-surface-container transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg signature-gradient flex items-center justify-center shrink-0">
                        <BookOpen size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-on-surface text-sm truncate">{c.title}</h3>
                        <p className="text-xs text-on-surface-variant">{c.category || "課程"}</p>
                      </div>
                      <span className="text-sm font-bold text-on-surface shrink-0">
                        {c.price === 0 ? "免費" : `NT$${c.price.toLocaleString()}`}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Latest Insight */}
            {latestInsight && (
              <Link
                href={`/insights/${latestInsight.slug}`}
                className="block bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-secondary" />
                  <span className="text-xs font-bold text-secondary">最新 Insight</span>
                  {latestInsight.is_pro && (
                    <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">PRO</span>
                  )}
                </div>
                <h3 className="font-bold text-on-surface text-sm mb-1">{latestInsight.title}</h3>
                <p className="text-xs text-on-surface-variant line-clamp-2">{latestInsight.summary}</p>
              </Link>
            )}
          </div>

          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Eyesy AI CTA */}
            <div className="bg-primary-container rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d2ff] blur-[80px] rounded-full opacity-15 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl signature-gradient flex items-center justify-center text-white font-bold text-lg shadow-lg mb-4">
                  E
                </div>
                <h4 className="text-base font-black text-white mb-1">
                  問 Eyesy 任何問題
                </h4>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  課程、方案、學習方向 — 都能幫你
                </p>
                <Link
                  href="/ai-assistant"
                  className="block w-full py-2.5 rounded-xl font-bold text-sm text-center signature-gradient text-white shadow-lg hover:brightness-110 transition-all mb-2"
                >
                  開始對話
                </Link>
                <Link
                  href="/quiz"
                  className="block w-full py-2.5 rounded-xl font-bold text-sm text-center bg-white/10 text-white hover:bg-white/15 transition-colors"
                >
                  AI 學習路徑測驗
                </Link>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-2">
              {[
                {
                  href: "/dungeons",
                  icon: Swords,
                  label: "副本",
                  desc: "講座、工作坊、大師圓桌",
                  color: "text-purple-400",
                  bg: "bg-purple-500/15",
                },
                {
                  href: "/community",
                  icon: MessageSquare,
                  label: "討論區",
                  desc: "與同學交流 +5 XP",
                  color: "text-blue-400",
                  bg: "bg-blue-500/15",
                },
                {
                  href: "/achievements",
                  icon: Trophy,
                  label: "成就 & 通行證",
                  desc: "查看等級與獎勵",
                  color: "text-amber-400",
                  bg: "bg-amber-500/15",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 bg-surface-container-lowest p-4 rounded-xl deep-diffusion hover:-translate-y-0.5 transition-all border border-outline-variant/10"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}
                  >
                    <item.icon size={18} className={item.color} />
                  </div>
                  <div>
                    <div className="font-bold text-on-surface text-sm">
                      {item.label}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {item.desc}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
