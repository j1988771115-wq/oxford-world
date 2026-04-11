"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { enterDungeon, claimDungeonXP } from "@/lib/actions/dungeons";
import { Zap, CheckCircle2 } from "lucide-react";

interface DungeonActionsProps {
  dungeonId: string;
  entered: boolean;
  xpClaimed: boolean;
  xpReward: number;
}

export function DungeonActions({
  dungeonId,
  entered,
  xpClaimed,
  xpReward,
}: DungeonActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleEnter = () => {
    startTransition(async () => {
      const result = await enterDungeon(dungeonId);
      if (result.success) router.refresh();
    });
  };

  const handleClaimXP = () => {
    startTransition(async () => {
      const result = await claimDungeonXP(dungeonId);
      if (result.success) router.refresh();
    });
  };

  if (xpClaimed) {
    return (
      <div className="flex items-center gap-3 bg-secondary/10 text-secondary px-6 py-4 rounded-xl font-bold text-sm">
        <CheckCircle2 size={20} />
        副本已完成，XP 已領取
      </div>
    );
  }

  if (entered) {
    return (
      <button
        onClick={handleClaimXP}
        disabled={isPending}
        className="w-full py-4 rounded-xl font-bold text-sm signature-gradient text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Zap size={18} />
        {isPending ? "領取中..." : `完成副本，領取 +${xpReward} XP`}
      </button>
    );
  }

  return (
    <button
      onClick={handleEnter}
      disabled={isPending}
      className="w-full py-4 rounded-xl font-bold text-sm signature-gradient text-white hover:brightness-110 transition-all disabled:opacity-50"
    >
      {isPending ? "報名中..." : "報名參加此副本"}
    </button>
  );
}
