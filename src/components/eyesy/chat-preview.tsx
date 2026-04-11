"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const CONVERSATION = [
  {
    role: "assistant" as const,
    text: "嗨！我是 Eyesy，你的 AI 學習夥伴。想聊什麼？",
    delay: 800,
  },
  {
    role: "user" as const,
    text: "AI 會取代我的工作嗎？",
    delay: 2000,
  },
  {
    role: "assistant" as const,
    text: "與其擔心被取代，不如學會跟 AI 協作。根據你的背景，我推薦從「AI 驅動決策力」開始，學會用 AI 強化你的判斷力，讓 AI 成為你的武器而不是對手。",
    delay: 1500,
  },
];

function TypingText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const speed = 30 + Math.random() * 20;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDone(true);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, onDone]);

  return (
    <span>
      {displayed}
      {!done && (
        <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-text-bottom" />
      )}
    </span>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      <div className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" />
      <div className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0.1s]" />
      <div className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0.2s]" />
    </div>
  );
}

export function ChatPreview() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (visibleCount >= CONVERSATION.length) {
      setTimeout(() => setShowSuggestions(true), 500);
      return;
    }

    const msg = CONVERSATION[visibleCount];
    setTyping(true);

    const timer = setTimeout(() => {
      setTyping(false);
      setVisibleCount((c) => c + 1);
    }, msg.delay + (msg.role === "assistant" ? msg.text.length * 35 : 300));

    return () => clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-6 shadow-2xl max-w-md mx-auto deep-diffusion">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-outline-variant/15">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center text-white font-bold shadow-md">
            E
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-surface-container-lowest rounded-full" />
        </div>
        <div>
          <h4 className="text-on-surface font-bold text-sm">Eyesy</h4>
          <p className="text-emerald-500 text-xs">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 min-h-[200px]">
        {CONVERSATION.slice(0, visibleCount).map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg signature-gradient flex items-center justify-center text-white font-bold text-xs shrink-0">
                E
              </div>
            )}
            <div
              className={cn(
                "rounded-2xl px-4 py-3 max-w-[85%]",
                msg.role === "user"
                  ? "signature-gradient rounded-tr-none"
                  : "bg-surface-container-low rounded-tl-none"
              )}
            >
              <p
                className={cn(
                  "text-sm leading-relaxed",
                  msg.role === "user" ? "text-white" : "text-on-surface"
                )}
              >
                {i === visibleCount - 1 && msg.role === "assistant" ? (
                  <TypingText text={msg.text} />
                ) : (
                  msg.text
                )}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && visibleCount < CONVERSATION.length && (
          <div className="flex items-start gap-3 animate-in fade-in duration-200">
            {CONVERSATION[visibleCount].role === "assistant" && (
              <div className="w-7 h-7 rounded-lg signature-gradient flex items-center justify-center text-white font-bold text-xs shrink-0">
                E
              </div>
            )}
            <div
              className={cn(
                "rounded-2xl px-4 py-3",
                CONVERSATION[visibleCount].role === "user"
                  ? "signature-gradient rounded-tr-none ml-auto"
                  : "bg-surface-container-low rounded-tl-none"
              )}
            >
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div
        className={cn(
          "mt-4 flex gap-2 transition-opacity duration-500",
          showSuggestions ? "opacity-100" : "opacity-0"
        )}
      >
        {["推薦適合的課程", "什麼是 Vibe Coding？"].map((s, i) => (
          <span
            key={i}
            className="text-[11px] px-3 py-1.5 rounded-full bg-secondary-fixed/80 text-on-secondary-fixed-variant font-medium"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
