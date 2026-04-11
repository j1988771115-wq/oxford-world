import { getUserProfile, getUserCourses, getUserXP } from "@/lib/actions/courses";
import { SeasonPass } from "@/components/dashboard/season-pass";
import {
  Trophy,
  BookOpen,
  Zap,
  Award,
  Star,
  Target,
  Users,
  MessageSquare,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "成就 & 通行證 — 牛津視界",
};

export default async function AchievementsPage() {
  const [profile, courses, xpData] = await Promise.all([
    getUserProfile() as Promise<{ tier?: string } | null>,
    getUserCourses() as Promise<any[]>,
    getUserXP(),
  ]);

  const courseCount = courses.length;

  const badges = [
    {
      id: "first-login",
      icon: Zap,
      title: "初次登入",
      description: "歡迎加入牛津視界！",
      unlocked: true,
    },
    {
      id: "first-course",
      icon: BookOpen,
      title: "踏出第一步",
      description: "開始第一門課程",
      unlocked: courseCount >= 1,
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
      unlocked: false,
    },
    {
      id: "community",
      icon: MessageSquare,
      title: "討論先鋒",
      description: "在討論區發表第一篇貼文",
      unlocked: false,
    },
    {
      id: "level-10",
      icon: Star,
      title: "開眼境圓滿",
      description: "達到 Lv.10",
      unlocked: xpData.level >= 10,
    },
    {
      id: "level-20",
      icon: Trophy,
      title: "望遠境圓滿",
      description: "達到 Lv.20",
      unlocked: xpData.level >= 20,
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center gap-3 px-6 lg:px-8 h-16 max-w-[1200px] mx-auto">
          <Trophy size={20} className="text-amber-500" />
          <h1 className="text-lg font-black text-on-surface">成就 & 通行證</h1>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[1200px] mx-auto space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-xl p-5 deep-diffusion text-center">
            <Zap size={20} className="text-secondary mx-auto mb-2" />
            <div className="text-2xl font-black text-on-surface">
              {xpData.xp.toLocaleString()}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">XP</div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 deep-diffusion text-center">
            <Trophy size={20} className="text-amber-500 mx-auto mb-2" />
            <div className="text-2xl font-black text-on-surface">
              {unlockedCount}/{badges.length}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              已解鎖徽章
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 deep-diffusion text-center">
            <BookOpen size={20} className="text-secondary mx-auto mb-2" />
            <div className="text-2xl font-black text-on-surface">
              {courseCount}
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              已修課程
            </div>
          </div>
        </div>

        {/* Season Pass & XP */}
        <SeasonPass
          currentXP={xpData.xp}
          level={xpData.level}
          streak={0}
          tier={(profile?.tier as "free" | "pro") || "free"}
        />

        {/* Badges */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10">
          <h2 className="text-lg font-bold text-on-surface mb-5">徽章牆</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "bg-surface-container-low rounded-xl p-5 text-center transition-all",
                  !badge.unlocked && "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center",
                    badge.unlocked
                      ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                      : "bg-surface-container text-on-surface-variant"
                  )}
                >
                  {badge.unlocked ? (
                    <badge.icon size={24} />
                  ) : (
                    <Lock size={18} />
                  )}
                </div>
                <h3 className="font-bold text-on-surface text-xs">
                  {badge.title}
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
