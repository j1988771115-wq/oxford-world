"use client";

import { useEffect, useState } from "react";

interface Props {
  /** 顯示在浮水印上的識別字（通常是 email 或學號） */
  identifier: string;
}

/**
 * 防錄製浮水印：覆蓋在 MuxPlayer 上方，每 10 秒換位置。
 * 半透明白字 + 黑描邊，確保任何畫面都看得到。
 * pointer-events-none 不擋住 player 控件。
 *
 * 任何學員若把畫面外洩 / 翻拍 / 螢幕錄影,都會把自己的 identifier 一起留下。
 */
export function VideoWatermark({ identifier }: Props) {
  // 8 個隨機位置（避開正中心，免擋字幕/講者）
  const positions = [
    { top: "8%", left: "6%" },
    { top: "8%", right: "6%" },
    { top: "30%", left: "12%" },
    { top: "30%", right: "12%" },
    { bottom: "30%", left: "12%" },
    { bottom: "30%", right: "12%" },
    { bottom: "12%", left: "6%" },
    { bottom: "12%", right: "6%" },
  ];

  const [posIdx, setPosIdx] = useState(() => Math.floor(Math.random() * positions.length));

  useEffect(() => {
    const id = setInterval(() => {
      setPosIdx((prev) => {
        // 換到不同位置（不重複）
        let next = Math.floor(Math.random() * positions.length);
        while (next === prev) next = Math.floor(Math.random() * positions.length);
        return next;
      });
    }, 10_000);
    return () => clearInterval(id);
  }, [positions.length]);

  const pos = positions[posIdx];
  const now = new Date();
  const tsLabel = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        zIndex: 30,
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "12px",
        fontWeight: 600,
        color: "rgba(255,255,255,0.45)",
        textShadow:
          "0 0 2px rgba(0,0,0,0.9), 1px 1px 2px rgba(0,0,0,0.7)",
        letterSpacing: "0.02em",
        transition: "all 1.5s ease",
        whiteSpace: "nowrap",
      }}
    >
      牛津視界 · {identifier} · {tsLabel}
    </div>
  );
}
