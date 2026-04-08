import { getUserProfile, getUserCourses } from "@/lib/actions/courses";
import {
  Trophy,
  Flame,
  BookOpen,
  Zap,
  Award,
  Star,
  Target,
  Users,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "我的成就 — 牛津視界",
  description: "查看你的學習成就和徽章。",
};

export default async function AchievementsPage() {
  const profile = (await getUserProfile()) as {
    tier?: string;
    current_streak?: number;
    longest_streak?: number;
  } | null;
  const courses = (await getUserCourses()) as any[];

  const streak = profile?.current_streak || 0;
  const longestStreak = profile?.longest_streak || 0;
  const courseCount = courses.length;

  // Dynamically determine which badges are unlocked based on real data
  const badges = [
    {
      id: "first-login",
      icon: Zap,
      title: "初次登入",
      description: "歡迎加入牛津視界！",
      unlocked: true, // If they're here, they've logged in
    },
    {
      id: "first-course",
      icon: BookOpen,
      title: "踏出第一步",
      description: "開始第一門課程",
      unlocked: courseCount >= 1,
    },
    {
      id: "streak-7",
      icon: Flame,
      title: "七日連勝",
      description: "連續學習 7 天",
      unlocked: longestStreak >= 7,
    },
    {
      id: "streak-30",
      icon: Flame,
      title: "三十日連勝",
      description: "連續學習 30 天",
      unlocked: longestStreak >= 30,
    },
    {
      id: "three-courses",
      icon: Award,
      title: "學習達人",
      description: "擁有 3 門以上課程",
      unlocked: courseCount >= 3,
    },
    {
      id: "pro-member",
      icon: Star,
      title: "Pro 會員",
      description: "升級為 Pro 會員",
      unlocked: profile?.tier === "pro",
    },
    {
      id: "quiz-done",
      icon: Target,
      title: "路徑探索者",
      description: "完成學習路徑測驗",
      unlocked: false, // TODO: track in DB
    },
    {
      id: "community",
      icon: Users,
      title: "社群之星",
      description: "加入 Discord 社群",
      unlocked: false, // TODO: track discord_id
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <main className="lg:pl-64 pt-24 pb-12 px-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Trophy size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">
            我的成就
          </h1>
        </div>
        <p className="text-on-surface-variant mt-1">
          持續學習，解鎖更多徽章
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-surface-container-lowest rounded-2xl p-5 deep-diffusion text-center">
          <Flame size={24} className="text-orange-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-on-surface">{streak}</div>
          <div className="text-xs text-on-surface-variant font-bold mt-1">天連勝</div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 deep-diffusion text-center">
          <Flame size={24} className="text-red-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-on-surface">{longestStreak}</div>
          <div className="text-xs text-on-surface-variant font-bold mt-1">最長連勝</div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 deep-diffusion text-center">
          <Trophy size={24} className="text-amber-500 mx-auto mb-2" />
          <div className="text-3xl font-black text-on-surface">{unlockedCount}/{badges.length}</div>
          <div className="text-xs text-on-surface-variant font-bold mt-1">已解鎖徽章</div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 deep-diffusion text-center">
          <BookOpen size={24} className="text-secondary mx-auto mb-2" />
          <div className="text-3xl font-black text-on-surface">{courseCount}</div>
          <div className="text-xs text-on-surface-variant font-bold mt-1">已修課程</div>
        </div>
      </div>

      {/* Badges */}
      <section className="bg-surface-container-low rounded-3xl p-8">
        <h2 className="text-2xl font-bold text-on-surface mb-6">徽章牆</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                "bg-surface-container-lowest rounded-xl p-5 deep-diffusion text-center transition-all",
                !badge.unlocked && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center",
                  badge.unlocked
                    ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                    : "bg-surface-container text-on-surface-variant"
                )}
              >
                {badge.unlocked ? (
                  <badge.icon size={28} />
                ) : (
                  <Lock size={20} />
                )}
              </div>
              <h3 className="font-bold text-on-surface text-sm">{badge.title}</h3>
              <p className="text-xs text-on-surface-variant mt-1">{badge.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {unlockedCount < badges.length && (
        <div className="mt-8 bg-secondary-fixed/20 border border-secondary-fixed p-6 rounded-2xl flex items-center gap-4">
          <Trophy size={24} className="text-secondary shrink-0" />
          <div>
            <p className="text-on-surface font-bold text-sm">
              還有 {badges.length - unlockedCount} 個徽章等你解鎖！
            </p>
            <p className="text-on-surface-variant text-xs">
              繼續學習、升級 Pro、加入社群來解鎖更多成就
            </p>
          </div>
          <Link
            href="/courses"
            className="ml-auto signature-gradient text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition shrink-0"
          >
            繼續學習
          </Link>
        </div>
      )}
    </main>
  );
}
