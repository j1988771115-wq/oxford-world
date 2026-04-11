import {
  getLeaderboard,
  getWeeklyLeaderboard,
  getMyRank,
  getUserXP,
} from "@/lib/actions/courses";
import {
  Trophy,
  Medal,
  Zap,
  Crown,
  BookOpen,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "排行榜 — 牛津視界",
};

function getLevel(xp: number): number {
  const levels = [
    0, 30, 70, 120, 200, 300, 420, 560, 720, 900,
    1100, 1350, 1650, 2000, 2400, 2850, 3350, 3900, 4500, 5200,
    6000, 6900, 7900, 9000, 10200, 11500, 13000, 14800, 16800, 19000,
    21500, 24500, 28000, 32000, 36500, 41500, 47000, 53000, 60000, 68000,
    77000, 87000, 98000, 110000, 125000, 142000, 162000, 185000, 215000, 250000,
  ];
  let level = 1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) { level = i + 1; break; }
  }
  return level;
}

function getTier(xp: number): string {
  const level = getLevel(xp);
  if (level <= 10) return "開眼境";
  if (level <= 20) return "望遠境";
  if (level <= 30) return "通觀境";
  if (level <= 40) return "洞明境";
  return "天視境";
}

const RANK_ICONS = [Crown, Medal, Medal];
const RANK_COLORS = ["text-amber-400", "text-slate-300", "text-amber-700"];

export default async function LeaderboardPage() {
  const [allTime, weekly, myRank] = await Promise.all([
    getLeaderboard(),
    getWeeklyLeaderboard(),
    getMyRank(),
  ]);

  return (
    <main className="lg:pl-64 min-h-screen bg-surface">
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
        <div className="flex items-center gap-3 px-6 lg:px-8 h-16 max-w-[1200px] mx-auto">
          <Trophy size={20} className="text-amber-500" />
          <h1 className="text-lg font-black text-on-surface">排行榜</h1>
          {myRank && (
            <span className="ml-auto text-sm text-on-surface-variant">
              你的排名：
              <span className="font-bold text-secondary">第 {myRank} 名</span>
            </span>
          )}
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* All-time — main column */}
          <div className="lg:col-span-2">
            <section className="bg-surface-container-lowest rounded-2xl deep-diffusion border border-outline-variant/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <h2 className="font-bold text-on-surface">總排行</h2>
              </div>

              {allTime.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant text-sm">
                  還沒有排名數據，開始學習賺 XP 吧！
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/10">
                  {allTime.map((user, i) => {
                    const level = getLevel(user.xp);
                    const tier = getTier(user.xp);
                    const RankIcon = RANK_ICONS[i];

                    return (
                      <div
                        key={user.id}
                        className={cn(
                          "px-6 py-5 transition-colors",
                          i < 3 && "bg-surface-container-low/30"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className="w-8 text-center shrink-0">
                            {i < 3 && RankIcon ? (
                              <RankIcon size={20} className={RANK_COLORS[i]} />
                            ) : (
                              <span className="text-sm font-bold text-on-surface-variant">
                                {i + 1}
                              </span>
                            )}
                          </div>

                          {/* Avatar */}
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.displayName}
                              className="w-11 h-11 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
                              <span className="text-on-secondary-fixed-variant font-bold text-sm">
                                {user.displayName[0]}
                              </span>
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-on-surface text-sm truncate">
                                {user.displayName}
                              </p>
                              {user.tier === "pro" && (
                                <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                                  PRO
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant">
                              {tier} · Lv.{level}
                            </p>
                          </div>

                          {/* XP */}
                          <div className="text-right shrink-0">
                            <p className="font-black text-on-surface text-sm">
                              {user.xp.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-on-surface-variant">
                              XP
                            </p>
                          </div>
                        </div>

                        {/* Extra info row */}
                        <div className="ml-12 mt-3 flex flex-wrap items-center gap-3">
                          {/* Courses */}
                          {user.courses.length > 0 && (
                            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                              <BookOpen size={12} />
                              <span>
                                {user.courses.length > 2
                                  ? `${user.courses.slice(0, 2).join("、")} 等 ${user.courses.length} 門`
                                  : user.courses.join("、")}
                              </span>
                            </div>
                          )}

                          {/* Latest post */}
                          {user.latestPost && (
                            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                              <MessageSquare size={12} />
                              <span className="truncate max-w-[200px]">
                                {user.latestPost.title}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Weekly — sidebar */}
          <div className="space-y-6">
            <section className="bg-surface-container-lowest rounded-2xl deep-diffusion border border-outline-variant/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
                <Zap size={18} className="text-secondary" />
                <h2 className="font-bold text-on-surface">本週榜</h2>
              </div>

              {weekly.length === 0 ? (
                <div className="p-6 text-center text-on-surface-variant text-sm">
                  本週還沒有人上榜
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/10">
                  {weekly.map((user, i) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3.5",
                        i < 3 && "bg-surface-container-low/30"
                      )}
                    >
                      <span className="w-6 text-center text-xs font-bold text-on-surface-variant">
                        {i + 1}
                      </span>

                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
                          <span className="text-on-secondary-fixed-variant font-bold text-xs">
                            {user.displayName[0]}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-on-surface text-xs truncate">
                          {user.displayName}
                        </p>
                        {user.tier === "pro" && (
                          <span className="text-[9px] font-bold text-secondary">
                            PRO
                          </span>
                        )}
                      </div>

                      <span className="font-black text-secondary text-xs">
                        +{user.xp.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* XP Tips */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border border-outline-variant/10">
              <h3 className="font-bold text-on-surface text-sm mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-secondary" />
                快速衝榜
              </h3>
              <div className="space-y-2">
                {[
                  { action: "看課程影片", xp: "+10" },
                  { action: "完成章節", xp: "+25" },
                  { action: "提交作業", xp: "+30" },
                  { action: "完成測驗", xp: "+50" },
                  { action: "發表討論", xp: "+5" },
                ].map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-on-surface-variant">
                      {tip.action}
                    </span>
                    <span className="font-bold text-secondary">{tip.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
