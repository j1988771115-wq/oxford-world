"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  q: string;
  a: string;
}

interface Props {
  items: FaqItem[];
  /** 'dark' = 暗色 cinematic 風(配 slate-950 bg);'light' = 預設 surface theme */
  variant?: "light" | "dark";
}

export function FaqAccordion({ items, variant = "light" }: Props) {
  const [open, setOpen] = useState<number | null>(0);
  const dark = variant === "dark";

  return (
    <ul className={cn(
      "divide-y border-y",
      dark
        ? "divide-amber-500/15 border-amber-500/20"
        : "divide-outline-variant/15 border-outline-variant/15"
    )}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className={cn(
                "text-base md:text-lg font-bold",
                dark ? "text-white" : "text-on-surface"
              )}>
                {item.q}
              </span>
              <ChevronDown
                size={20}
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  dark ? "text-amber-300" : "text-on-surface-variant",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-200",
                isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className={cn(
                  "text-base leading-relaxed whitespace-pre-line",
                  dark ? "text-white/75" : "text-on-surface-variant"
                )}>
                  {item.a}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
