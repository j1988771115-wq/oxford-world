import { notFound, redirect } from "next/navigation";
import { getDungeon, getMyEntries } from "@/lib/actions/dungeons";
import { getUserXP, getUserProfile } from "@/lib/actions/courses";
import { DungeonActions } from "@/components/dungeons/dungeon-actions";
import { Swords, Clock, Users, Zap, Shield, Lock } from "lucide-react";

export default async function DungeonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [dungeon, entries, xpData, profile] = await Promise.all([
    getDungeon(id),
    getMyEntries(),
    getUserXP(),
    getUserProfile() as Promise<{ tier?: string } | null>,
  ]);

  if (!dungeon) notFound();

  const myLevel = xpData.level;
  const isPro = profile?.tier === "pro";
  const canEnter =
    myLevel >= dungeon.required_level &&
    (!dungeon.requires_pro || isPro);

  const entry = entries.find(
    (e: { dungeon_id: string }) => e.dungeon_id === id
  );

  return (
    <main className="lg:pl-64 pt-24 pb-12 px-8 max-w-[800px] mx-auto">
      <div className="bg-surface-container-lowest rounded-3xl p-8 deep-diffusion border border-outline-variant/10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Swords size={20} className="text-secondary" />
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">
            {dungeon.dungeon_type === "lecture" && "免費講座"}
            {dungeon.dungeon_type === "workshop" && "實戰工作坊"}
            {dungeon.dungeon_type === "master" && "大師圓桌"}
            {dungeon.dungeon_type === "legendary" && "傳奇副本"}
          </span>
          <span className="text-xs text-on-surface-variant ml-auto">
            Lv.{dungeon.required_level}+
            {dungeon.requires_pro && " · Pro"}
          </span>
        </div>

        <h1 className="text-3xl font-black text-on-surface mb-4">
          {dungeon.title}
        </h1>

        <p className="text-on-surface-variant leading-relaxed mb-6">
          {dungeon.description}
        </p>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant mb-8 pb-8 border-b border-outline-variant/15">
          <span className="flex items-center gap-1 font-bold text-secondary">
            <Zap size={14} />+{dungeon.xp_reward} XP
          </span>
          {dungeon.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {dungeon.duration_minutes} 分鐘
            </span>
          )}
          {dungeon.scheduled_at && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {new Date(dungeon.scheduled_at).toLocaleDateString("zh-TW", {
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Shield size={14} />
            你的等級：Lv.{myLevel}
          </span>
        </div>

        {/* Content or Lock */}
        {!canEnter ? (
          <div className="text-center py-12">
            <Lock size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
            <p className="text-on-surface-variant text-lg font-bold mb-2">
              {myLevel < dungeon.required_level
                ? `需要 Lv.${dungeon.required_level} 才能進入`
                : "需要 Pro 會員資格"}
            </p>
            <p className="text-on-surface-variant text-sm">
              {myLevel < dungeon.required_level
                ? "繼續學習賺取 XP 來提升等級"
                : "升級 Pro 解鎖所有副本"}
            </p>
          </div>
        ) : (
          <>
            {/* Video embed */}
            {dungeon.video_url && (
              <div className="aspect-video rounded-xl overflow-hidden mb-6 bg-black">
                <iframe
                  src={dungeon.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Markdown content */}
            {dungeon.content_md && (
              <div className="prose prose-sm prose-invert max-w-none text-on-surface mb-8 whitespace-pre-wrap">
                {dungeon.content_md}
              </div>
            )}

            <DungeonActions
              dungeonId={dungeon.id}
              entered={!!entry}
              xpClaimed={entry?.xp_claimed || false}
              xpReward={dungeon.xp_reward}
            />
          </>
        )}
      </div>
    </main>
  );
}
