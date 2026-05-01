"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  courseTitle: string;
  instructor: string;
  description?: string | null;
}

export function CourseInfoCollapse({
  courseTitle,
  instructor,
  description,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-surface-container-lowest rounded-xl deep-diffusion overflow-hidden border border-outline-variant/15">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-container transition-colors text-left"
      >
        <div>
          <p className="text-sm font-bold text-on-surface">關於本課程</p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {courseTitle} · 講師：{instructor}
          </p>
        </div>
        {open ? (
          <ChevronUp size={18} className="text-on-surface-variant shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-on-surface-variant shrink-0" />
        )}
      </button>
      {open && description && (
        <div className="px-4 pb-4 text-sm text-on-surface-variant leading-relaxed border-t border-outline-variant/15 pt-4">
          {description}
        </div>
      )}
    </div>
  );
}
