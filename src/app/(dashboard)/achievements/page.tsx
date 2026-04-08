import { getUserProfile, getUserCourses } from "@/lib/actions/courses";
import {
  Trophy,
  Flame,
  BookOpen,
  Target,
  Star,
  Zap,
  Award,
  Users,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "我的成就 — 牛津視界",
  description: "查看你的學習成就、徽章和排行榜。",
};

const BADGES = [
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
    unlocked: true,
  },
  {
    id: "streak-7",
    icon: Flame,
    title: "七日連勝",
    description: "連續學習 7 天",
    unlocked: false,
  },
  {
    id: "streak-30",
    icon: Flame,
    title: "三十日連勝",
    description: "連續學習 30 天",
    unlocked: false,
  },
  {
    id: "complete-course",
    icon: Award,
    title: "完課達人",
    description: "完成一門完整課程",
    unlocked: false,
  },
  {
    id: "ai-explorer",
    icon: Star,
    title: "AI 探索者",
    description: "使用 AI 助手 10 次",
    unlocked: false,
  },
  {
    id: "quiz-master",
    icon: Target,
    title: "測驗大師",
    description: "完成學習路徑測驗",
    unlocked: false,
  },
  {
    id: "community",
    icon: Users,
    title: "社群之星",
    description: "加入 Discord 社群",
    unlocked: false,
  },
];

const LEADERBOARD = [
  { rank: 1, name: "陳映璇", xp: 2450 },
  { rank: 2, name: "李嘉偉", xp: 1980 },
  { rank: 3, name: "黃淑芬", xp: 1850 },
  { rank: 4, name: "周建宇", xp: 1720 },
  { rank: 5, name: "張宇翔", xp: 1650 },
];

export default async function AchievementsPage() {
  const profile = await getUserProfile() as { tier?: string; current_streak?: number; longest_streak?: number } | null;
  const courses = await getUserCourses();

  const streak = profile?.current_streak || 0;
  const longestStreak = profile?.longest_streak || 0;
  const unlockedCount = BADGES.filter((b) => b.unlocked).length;

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
          持續學習，解鎖更多徽章和獎勵
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
          <div className="text-3xl font-black text-on-surface">{unlockedCount}/{BADGES.length}</div>
          <div className="text-xs text-on-surface-variant font-bold mt-1">已解鎖徽章</div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 deep-diffusion text-center">
          <BookOpen size={24} className="text-secondary mx-auto mb-2" />
          <div className="text-3xl font-black text-on-surface">{(courses as any[]).length}</div>
          <div className="text-xs text-on-surface-variant font-bold mt-1">已修課程</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Badges */}
        <section className="lg:col-span-8">
          <div className="bg-surface-container-low rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-on-surface mb-6">徽章牆</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {BADGES.map((badge) => (
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
          </div>
        </section>

        {/* Leaderboard */}
        <section className="lg:col-span-4">
          <div className="bg-surface-container-lowest rounded-3xl deep-diffusion overflow-hidden">
            <div className="p-6 bg-surface-container-low">
              <h2 className="font-bold text-on-surface text-lg">排行榜</h2>
              <p className="text-xs text-on-surface-variant mt-1">本月學習排名</p>
            </div>
            <div className="p-4 space-y-2">
              {LEADERBOARD.map((user) => (
                <div
                  key={user.rank}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors"
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black",
                      user.rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                      user.rank === 2 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" :
                      user.rank === 3 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                      "bg-surface-container text-on-surface-variant"
                    )}
                  >
                    {user.rank}
                  </span>
                  <span className="flex-1 text-sm font-medium text-on-surface">{user.name}</span>
                  <span className="text-xs font-bold text-on-surface-variant">
                    {user.xp.toLocaleString()} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
