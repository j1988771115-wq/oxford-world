import Link from "next/link";
import {
  Swords,
  Lock,
  Crown,
  Users,
  Clock,
  Zap,
  Star,
  Shield,
} from "lucide-react";
import { getDungeons, getMyEntries } from "@/lib/actions/dungeons";
import { getUserXP } from "@/lib/actions/courses";
import { getUserProfile } from "@/lib/actions/courses";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "副本 — 牛津視界",
};

const TYPE_CONFIG = {
  lecture: {
    label: "免費講座",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    icon: Zap,
  },
  workshop: {
    label: "實戰工作坊",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    icon: Swords,
  },
  master: {
    label: "大師圓桌",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    icon: Crown,
  },
  legendary: {
    label: "傳奇副本",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    icon: Star,
  },
};

export default async function DungeonsPage() {
  const [dungeons, entries, xpData, profile] = await Promise.all([
    getDungeons(),
    getMyEntries(),
    getUserXP(),
    getUserProfile() as Promise<{ tier?: string } | null>,
  ]);

  const myLevel = xpData.level;
  const isPro = profile?.tier === "pro";
  const entryMap = new Map(
    entries.map((e: { dungeon_id: string; status: string }) => [
      e.dungeon_id,
      e.status,
    ])
  );

  return (
    <main className="lg:pl-64 pt-24 pb-12 px-8 max-w-[1200px] mx-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center">
            <Swords size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">
            副本
          </h1>
        </div>
        <p className="text-on-surface-variant">
          特殊活動與限定內容 — 等級越高，能進入的副本越多
        </p>
        <div className="mt-3 inline-flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full">
          <Shield size={14} className="text-secondary" />
          <span className="text-sm font-bold text-on-surface">
            你的等級：Lv.{myLevel}
          </span>
        </div>
      </div>

      {dungeons.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-lowest rounded-3xl deep-diffusion">
          <Swords
            size={48}
            className="mx-auto text-on-surface-variant/30 mb-4"
          />
          <p className="text-on-surface-variant text-lg">
            暫時沒有可用的副本，敬請期待
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dungeons.map(
            (d: {
              id: string;
              title: string;
              description: string;
              dungeon_type: keyof typeof TYPE_CONFIG;
              required_level: number;
              requires_pro: boolean;
              xp_reward: number;
              scheduled_at: string | null;
              duration_minutes: number | null;
              max_participants: number | null;
              status: string;
              dungeon_entries: { count: number }[];
            }) => {
              const config = TYPE_CONFIG[d.dungeon_type];
              const TypeIcon = config.icon;
              const canEnter =
                myLevel >= d.required_level &&
                (!d.requires_pro || isPro);
              const entered = entryMap.has(d.id);
              const participantCount =
                d.dungeon_entries?.[0]?.count ?? 0;

              return (
                <div
                  key={d.id}
                  className={cn(
                    "bg-surface-container-lowest rounded-2xl p-6 deep-diffusion border transition-all relative overflow-hidden",
                    canEnter
                      ? "border-outline-variant/10 hover:-translate-y-1"
                      : "border-outline-variant/10 opacity-50"
                  )}
                >
                  {/* Type badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider",
                        config.bg,
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs font-bold text-on-surface-variant">
                      Lv.{d.required_level}+
                      {d.requires_pro && " · Pro"}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-on-surface mb-2">
                    {d.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant line-clamp-2 mb-4">
                    {d.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant mb-5">
                    <span className="flex items-center gap-1 font-bold text-secondary">
                      <Zap size={12} />+{d.xp_reward} XP
                    </span>
                    {d.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {d.duration_minutes} 分鐘
                      </span>
                    )}
                    {d.max_participants && (
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {participantCount}/{d.max_participants}
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  {!canEnter ? (
                    <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                      <Lock size={16} />
                      {myLevel < d.required_level
                        ? `需要 Lv.${d.required_level}`
                        : "需要 Pro 會員"}
                    </div>
                  ) : entered ? (
                    <Link
                      href={`/dungeons/${d.id}`}
                      className="block w-full py-3 rounded-xl font-bold text-sm text-center bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                    >
                      進入副本
                    </Link>
                  ) : (
                    <Link
                      href={`/dungeons/${d.id}`}
                      className="block w-full py-3 rounded-xl font-bold text-sm text-center signature-gradient text-white hover:brightness-110 transition-all"
                    >
                      報名參加
                    </Link>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </main>
  );
}
