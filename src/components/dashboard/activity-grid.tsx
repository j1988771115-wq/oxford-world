"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ActivityGridProps {
  /** Map of "YYYY-MM-DD" → event count */
  activityData: Record<string, number>;
}

const DAYS_OF_WEEK = ["一", "", "三", "", "五", "", "日"];
const MONTHS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

function getIntensity(count: number): string {
  if (count === 0) return "bg-surface-container";
  if (count <= 1) return "bg-emerald-900/60";
  if (count <= 3) return "bg-emerald-700/70";
  if (count <= 6) return "bg-emerald-500";
  return "bg-emerald-400";
}

export function ActivityGrid({ activityData }: ActivityGridProps) {
  const { weeks, monthLabels, totalDays, activeDays } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // ~52 weeks

    // Align to Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    const weeks: { date: Date; count: number; dateStr: string }[][] = [];
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let currentWeek: { date: Date; count: number; dateStr: string }[] = [];
    let lastMonth = -1;
    let totalDays = 0;
    let activeDays = 0;

    const cursor = new Date(startDate);
    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0];
      const count = activityData[dateStr] || 0;

      if (count > 0) activeDays++;
      totalDays++;

      // Track month changes for labels
      if (cursor.getMonth() !== lastMonth) {
        lastMonth = cursor.getMonth();
        monthLabels.push({
          label: MONTHS[lastMonth],
          weekIndex: weeks.length,
        });
      }

      currentWeek.push({
        date: new Date(cursor),
        count,
        dateStr,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return { weeks, monthLabels, totalDays, activeDays };
  }, [activityData]);

  return (
    <div className="space-y-3">
      {/* Month labels */}
      <div className="flex text-[10px] text-on-surface-variant font-medium pl-8">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="absolute"
            style={{ left: `${m.weekIndex * 16 + 32}px` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 pr-2 shrink-0">
          {DAYS_OF_WEEK.map((day, i) => (
            <div
              key={i}
              className="w-4 h-[14px] text-[10px] text-on-surface-variant flex items-center justify-end"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px] overflow-x-auto no-scrollbar">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={cn(
                    "w-[14px] h-[14px] rounded-[3px] transition-colors",
                    getIntensity(day.count),
                    day.date > new Date() && "opacity-0"
                  )}
                  title={`${day.dateStr}: ${day.count} 次學習活動`}
                />
              ))}
              {/* Pad incomplete weeks */}
              {week.length < 7 &&
                Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div key={`pad-${i}`} className="w-[14px] h-[14px]" />
                ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
        <span>
          過去一年 {activeDays} 天有學習活動
        </span>
        <div className="flex items-center gap-1">
          <span>少</span>
          <div className="w-[12px] h-[12px] rounded-sm bg-surface-container" />
          <div className="w-[12px] h-[12px] rounded-sm bg-emerald-900/60" />
          <div className="w-[12px] h-[12px] rounded-sm bg-emerald-700/70" />
          <div className="w-[12px] h-[12px] rounded-sm bg-emerald-500" />
          <div className="w-[12px] h-[12px] rounded-sm bg-emerald-400" />
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
