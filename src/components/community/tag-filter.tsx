"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  currentTag?: string;
  tagMap: Record<string, { label: string; color: string }>;
}

export function TagFilter({ currentTag, tagMap }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Link
        href="/community"
        className={cn(
          "text-xs font-bold px-4 py-2 rounded-full transition-colors",
          !currentTag
            ? "signature-gradient text-white shadow-sm"
            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
        )}
      >
        全部
      </Link>
      {Object.entries(tagMap).map(([key, { label }]) => (
        <Link
          key={key}
          href={`/community?tag=${key}`}
          className={cn(
            "text-xs font-bold px-4 py-2 rounded-full transition-colors",
            currentTag === key
              ? "signature-gradient text-white shadow-sm"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
