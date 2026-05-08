"use client";

import { useEffect, useState } from "react";

interface Props {
  /** ISO string,例 2026-05-18T15:59:59+00:00 */
  endsAt: string;
  /** 過期後是否完全隱藏 */
  hideWhenExpired?: boolean;
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86400_000);
  const hours = Math.floor((ms % 86400_000) / 3600_000);
  const minutes = Math.floor((ms % 3600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

export function CountdownTimer({ endsAt, hideWhenExpired = true }: Props) {
  const target = new Date(endsAt);
  const [t, setT] = useState<ReturnType<typeof diff>>(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);

  if (!t) {
    if (hideWhenExpired) return null;
    return (
      <span className="text-sm text-on-surface-variant">特價已結束</span>
    );
  }

  const cell = (n: number, label: string) => (
    <div className="flex flex-col items-center min-w-[48px]">
      <span className="text-2xl md:text-3xl font-black tabular-nums text-amber-300 leading-none">
        {String(n).padStart(2, "0")}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-amber-100/70 mt-1">
        {label}
      </span>
    </div>
  );

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 backdrop-blur border border-amber-500/30">
      {cell(t.days, "天")}
      <span className="text-amber-300 text-2xl pb-3">:</span>
      {cell(t.hours, "時")}
      <span className="text-amber-300 text-2xl pb-3">:</span>
      {cell(t.minutes, "分")}
      <span className="text-amber-300 text-2xl pb-3">:</span>
      {cell(t.seconds, "秒")}
    </div>
  );
}
