"use client";

import { cn } from "@/lib/utils";
import {
  Zap,
  Star,
  Crown,
  Gift,
  Lock,
  CheckCircle2,
  Flame,
  Swords,
} from "lucide-react";
import Link from "next/link";

interface SeasonPassProps {
  currentXP: number;
  level: number;
  streak: number;
  tier: "free" | "pro";
}

const LEVELS = [
  // 開眼境 Peek — 初入門，睜開雙眼
  { level: 1, xpRequired: 0, title: "開眼境 I", titleEn: "Peek I" },
  { level: 2, xpRequired: 30, title: "開眼境 II", titleEn: "Peek II" },
  { level: 3, xpRequired: 70, title: "開眼境 III", titleEn: "Peek III" },
  { level: 4, xpRequired: 120, title: "開眼境 IV", titleEn: "Peek IV" },
  { level: 5, xpRequired: 200, title: "開眼境 V", titleEn: "Peek V" },
  { level: 6, xpRequired: 300, title: "開眼境 VI", titleEn: "Peek VI" },
  { level: 7, xpRequired: 420, title: "開眼境 VII", titleEn: "Peek VII" },
  { level: 8, xpRequired: 560, title: "開眼境 VIII", titleEn: "Peek VIII" },
  { level: 9, xpRequired: 720, title: "開眼境 IX", titleEn: "Peek IX" },
  { level: 10, xpRequired: 900, title: "開眼境 X", titleEn: "Peek X" },
  // 望遠境 Gaze — 視野拉遠，看見遠方
  { level: 11, xpRequired: 1100, title: "望遠境 I", titleEn: "Gaze I" },
  { level: 12, xpRequired: 1350, title: "望遠境 II", titleEn: "Gaze II" },
  { level: 13, xpRequired: 1650, title: "望遠境 III", titleEn: "Gaze III" },
  { level: 14, xpRequired: 2000, title: "望遠境 IV", titleEn: "Gaze IV" },
  { level: 15, xpRequired: 2400, title: "望遠境 V", titleEn: "Gaze V" },
  { level: 16, xpRequired: 2850, title: "望遠境 VI", titleEn: "Gaze VI" },
  { level: 17, xpRequired: 3350, title: "望遠境 VII", titleEn: "Gaze VII" },
  { level: 18, xpRequired: 3900, title: "望遠境 VIII", titleEn: "Gaze VIII" },
  { level: 19, xpRequired: 4500, title: "望遠境 IX", titleEn: "Gaze IX" },
  { level: 20, xpRequired: 5200, title: "望遠境 X", titleEn: "Gaze X" },
  // 通觀境 Perceive — 通曉全局，融會貫通
  { level: 21, xpRequired: 6000, title: "通觀境 I", titleEn: "Perceive I" },
  { level: 22, xpRequired: 6900, title: "通觀境 II", titleEn: "Perceive II" },
  { level: 23, xpRequired: 7900, title: "通觀境 III", titleEn: "Perceive III" },
  { level: 24, xpRequired: 9000, title: "通觀境 IV", titleEn: "Perceive IV" },
  { level: 25, xpRequired: 10200, title: "通觀境 V", titleEn: "Perceive V" },
  { level: 26, xpRequired: 11500, title: "通觀境 VI", titleEn: "Perceive VI" },
  { level: 27, xpRequired: 13000, title: "通觀境 VII", titleEn: "Perceive VII" },
  { level: 28, xpRequired: 14800, title: "通觀境 VIII", titleEn: "Perceive VIII" },
  { level: 29, xpRequired: 16800, title: "通觀境 IX", titleEn: "Perceive IX" },
  { level: 30, xpRequired: 19000, title: "通觀境 X", titleEn: "Perceive X" },
  // 洞明境 Insight — 洞察本質，明見萬理
  { level: 31, xpRequired: 21500, title: "洞明境 I", titleEn: "Insight I" },
  { level: 32, xpRequired: 24500, title: "洞明境 II", titleEn: "Insight II" },
  { level: 33, xpRequired: 28000, title: "洞明境 III", titleEn: "Insight III" },
  { level: 34, xpRequired: 32000, title: "洞明境 IV", titleEn: "Insight IV" },
  { level: 35, xpRequired: 36500, title: "洞明境 V", titleEn: "Insight V" },
  { level: 36, xpRequired: 41500, title: "洞明境 VI", titleEn: "Insight VI" },
  { level: 37, xpRequired: 47000, title: "洞明境 VII", titleEn: "Insight VII" },
  { level: 38, xpRequired: 53000, title: "洞明境 VIII", titleEn: "Insight VIII" },
  { level: 39, xpRequired: 60000, title: "洞明境 IX", titleEn: "Insight IX" },
  { level: 40, xpRequired: 68000, title: "洞明境 X", titleEn: "Insight X" },
  // 天視境 Vision — 天眼通達，即是視界
  { level: 41, xpRequired: 77000, title: "天視境 I", titleEn: "Vision I" },
  { level: 42, xpRequired: 87000, title: "天視境 II", titleEn: "Vision II" },
  { level: 43, xpRequired: 98000, title: "天視境 III", titleEn: "Vision III" },
  { level: 44, xpRequired: 110000, title: "天視境 IV", titleEn: "Vision IV" },
  { level: 45, xpRequired: 125000, title: "天視境 V", titleEn: "Vision V" },
  { level: 46, xpRequired: 142000, title: "天視境 VI", titleEn: "Vision VI" },
  { level: 47, xpRequired: 162000, title: "天視境 VII", titleEn: "Vision VII" },
  { level: 48, xpRequired: 185000, title: "天視境 VIII", titleEn: "Vision VIII" },
  { level: 49, xpRequired: 215000, title: "天視境 IX", titleEn: "Vision IX" },
  { level: 50, xpRequired: 250000, title: "天視境 X", titleEn: "Vision X" },
];

// Dual-track rewards spread across 50 levels
const PASS_REWARDS = [
  // 新手村
  { level: 2, free: { reward: "「好奇寶寶」稱號", icon: Zap }, pro: { reward: "Eyesy AI 完整額度", icon: Zap } },
  { level: 5, free: { reward: "解鎖免費講座副本", icon: Swords }, pro: { reward: "大師課 95 折券", icon: Gift } },
  { level: 8, free: { reward: "頭像框 — 銅", icon: Star }, pro: { reward: "獨家市場分析 1 篇", icon: Swords } },
  { level: 10, free: { reward: "討論區等級顯示", icon: Crown }, pro: { reward: "大師課 9 折券", icon: Gift } },
  // 成長期
  { level: 13, free: { reward: "「學習達人」稱號", icon: Star }, pro: { reward: "解鎖工作坊副本", icon: Swords } },
  { level: 15, free: { reward: "頭像框 — 銀", icon: Star }, pro: { reward: "Pro 首月半價券", icon: Gift } },
  { level: 18, free: { reward: "排行榜永久顯示", icon: Crown }, pro: { reward: "大師課 85 折券", icon: Gift } },
  { level: 20, free: { reward: "「領域專家」徽章", icon: Crown }, pro: { reward: "獨家月報永久訂閱", icon: Swords } },
  // 高手區
  { level: 23, free: { reward: "「知識王者」稱號", icon: Star }, pro: { reward: "解鎖大師圓桌副本", icon: Swords } },
  { level: 25, free: { reward: "頭像框 — 金", icon: Crown }, pro: { reward: "大師課 8 折永久", icon: Gift } },
  { level: 28, free: { reward: "個人檔案金框", icon: Star }, pro: { reward: "1 對 1 講師問答資格", icon: Swords } },
  { level: 30, free: { reward: "「學院傳奇」徽章", icon: Crown }, pro: { reward: "解鎖所有工作坊", icon: Swords } },
  // 傳說區
  { level: 33, free: { reward: "「覺醒者」稱號", icon: Star }, pro: { reward: "大師課 75 折永久", icon: Gift } },
  { level: 35, free: { reward: "頭像框 — 鑽石", icon: Crown }, pro: { reward: "解鎖傳奇副本", icon: Swords } },
  { level: 38, free: { reward: "討論區專屬標誌", icon: Star }, pro: { reward: "新課搶先體驗資格", icon: Gift } },
  { level: 40, free: { reward: "「永恆智者」徽章", icon: Crown }, pro: { reward: "終身大師課 7 折", icon: Crown } },
  // 神話區
  { level: 43, free: { reward: "「萬物解讀者」稱號", icon: Star }, pro: { reward: "課程共同創作資格", icon: Crown } },
  { level: 45, free: { reward: "頭像框 — 傳說", icon: Crown }, pro: { reward: "院長私人群組邀請", icon: Crown } },
  { level: 48, free: { reward: "「創世紀」稱號", icon: Star }, pro: { reward: "終身所有課程 7 折", icon: Crown } },
  { level: 50, free: { reward: "「Oxford Vision」終極徽章", icon: Crown }, pro: { reward: "牛津視界終身 VIP", icon: Crown } },
];

const XP_RULES = [
  { action: "觀看課程影片", xp: 10 },
  { action: "完成一個章節", xp: 25 },
  { action: "提交作業", xp: 30 },
  { action: "發表討論", xp: 5 },
  { action: "與 Eyesy 對話", xp: 5 },
  { action: "完成學習測驗", xp: 50 },
  { action: "每日登入", xp: 10 },
  { action: "連勝加成 (×天數)", xp: 5 },
];

export function SeasonPass({ currentXP, level, streak, tier }: SeasonPassProps) {
  const currentLevel = LEVELS.find((l) => l.level === level) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === level + 1);

  const xpInCurrentLevel = nextLevel
    ? currentXP - currentLevel.xpRequired
    : 0;
  const xpNeededForNext = nextLevel
    ? nextLevel.xpRequired - currentLevel.xpRequired
    : 1;
  const progressPercent = nextLevel
    ? Math.min(100, (xpInCurrentLevel / xpNeededForNext) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Level & XP Header */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 deep-diffusion border border-outline-variant/10">
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full signature-gradient flex items-center justify-center shadow-lg">
              <span className="text-3xl font-black text-white">{level}</span>
            </div>
            {streak > 0 && (
              <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow">
                <Flame size={14} className="fill-current" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-black text-on-surface">
                {currentLevel.title}
              </h3>
              <span className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                {currentLevel.titleEn}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mb-3">
              {currentXP.toLocaleString()} XP
              {nextLevel && ` / ${nextLevel.xpRequired.toLocaleString()} XP`}
            </p>

            {nextLevel ? (
              <div className="h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full signature-gradient rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            ) : (
              <p className="text-xs text-secondary font-bold">已達最高等級！</p>
            )}
          </div>
        </div>

        {/* XP Rules */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {XP_RULES.map((rule, i) => (
            <div
              key={i}
              className="bg-surface-container-low rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <span className="text-xs font-bold text-secondary">
                +{rule.xp}
              </span>
              <span className="text-xs text-on-surface-variant">
                {rule.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dual-Track Pass */}
      <div className="bg-surface-container-lowest rounded-3xl p-8 deep-diffusion border border-outline-variant/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface">學習通行證</h3>
            <p className="text-xs text-on-surface-variant mt-1">
              升等解鎖獎勵，Pro 通行證解鎖專屬副本
            </p>
          </div>
          <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
            Season 1
          </span>
        </div>

        {/* Track Headers */}
        <div className="grid grid-cols-[60px_1fr_1fr] gap-3 mb-4">
          <div />
          <div className="text-center text-xs font-bold text-on-surface-variant bg-surface-container-low rounded-lg py-2">
            免費軌道
          </div>
          <div className="text-center text-xs font-bold text-secondary bg-secondary/10 rounded-lg py-2">
            Pro 副本軌道
            {tier !== "pro" && (
              <Link
                href="/pricing"
                className="ml-1 underline underline-offset-2"
              >
                解鎖
              </Link>
            )}
          </div>
        </div>

        {/* Reward Rows */}
        <div className="space-y-2">
          {PASS_REWARDS.map((row) => {
            const unlocked = level >= row.level;
            const FreeIcon = row.free.icon;
            const ProIcon = row.pro.icon;

            return (
              <div
                key={row.level}
                className="grid grid-cols-[60px_1fr_1fr] gap-3"
              >
                {/* Level marker */}
                <div
                  className={cn(
                    "w-[60px] h-full flex items-center justify-center rounded-lg font-bold text-sm",
                    unlocked
                      ? "signature-gradient text-white"
                      : "bg-surface-container text-on-surface-variant"
                  )}
                >
                  {unlocked ? <CheckCircle2 size={18} /> : `Lv.${row.level}`}
                </div>

                {/* Free track */}
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    unlocked
                      ? "bg-surface-container-low border-outline-variant/20"
                      : "bg-surface-container-low/50 border-outline-variant/10 opacity-40"
                  )}
                >
                  <FreeIcon
                    size={18}
                    className={
                      unlocked ? "text-green-500" : "text-on-surface-variant/30"
                    }
                  />
                  <span className="text-xs font-medium text-on-surface">
                    {row.free.reward}
                  </span>
                </div>

                {/* Pro track */}
                <div
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    unlocked && tier === "pro"
                      ? "bg-secondary/5 border-secondary/20"
                      : unlocked && tier !== "pro"
                        ? "bg-surface-container-low border-outline-variant/20 opacity-60"
                        : "bg-surface-container-low/50 border-outline-variant/10 opacity-40"
                  )}
                >
                  {unlocked && tier !== "pro" ? (
                    <Lock size={16} className="text-on-surface-variant/40" />
                  ) : (
                    <ProIcon
                      size={18}
                      className={
                        unlocked && tier === "pro"
                          ? "text-secondary"
                          : "text-on-surface-variant/30"
                      }
                    />
                  )}
                  <span className="text-xs font-medium text-on-surface">
                    {row.pro.reward}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
