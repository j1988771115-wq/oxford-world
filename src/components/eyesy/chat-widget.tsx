"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function getContext(pathname: string): {
  context: string;
  courseId?: string;
  greeting: string;
  modeLabel: string;
} {
  if (pathname.startsWith("/learn/")) {
    // 取 path 第一段(/learn/{id}/...) 並去掉 trailing slash / query
    const raw = pathname.slice("/learn/".length).split("/")[0].split("?")[0];
    const courseId = raw || undefined;
    return {
      context: "teaching",
      courseId,
      greeting: "看影片有問題隨時問我 — 我有完整課程逐字稿可以引用 🎓",
      modeLabel: "課程 AI 助教",
    };
  }
  if (pathname.startsWith("/ai-assistant")) {
    return {
      context: "teaching",
      greeting: "嗨！我是 Eyesy，有什麼想學的，儘管問我 ✨",
      modeLabel: "AI 學習助教",
    };
  }
  if (pathname.startsWith("/path") || pathname.startsWith("/quiz")) {
    return {
      context: "recommendation",
      greeting: "讓我幫你找到最適合的學習路徑！",
      modeLabel: "學習顧問",
    };
  }
  return {
    context: "customer-service",
    greeting: "嗨！我是 Eyesy 👋 有任何問題都可以問我",
    modeLabel: "客服助手",
  };
}

export function EyesyChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading } = useAuth();

  const { context, courseId, greeting, modeLabel } = getContext(pathname);

  // 課程內顯示 quota(Sonnet token 剩多少)
  const [quota, setQuota] = useState<{
    monthlyRemaining: number;
    monthlyMax: number;
    topupBalance: number;
    inQ1: boolean;
    resetsAt: string;
  } | null>(null);
  useEffect(() => {
    if (context !== "teaching" || !isOpen) return;
    fetch("/api/chat/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setQuota(d))
      .catch(() => {});
  }, [context, isOpen]);

  const [bubbleMsg, setBubbleMsg] = useState<string>("");

  // Auto-show greeting bubble after 3s (first time per session)
  useEffect(() => {
    if (bubbleDismissed || isOpen) return;
    const seen = sessionStorage.getItem("eyesy_greeted");
    if (seen) return;

    const timer = setTimeout(() => {
      setBubbleMsg(greeting);
      setShowBubble(true);
      sessionStorage.setItem("eyesy_greeted", "1");
    }, 3000);
    return () => clearTimeout(timer);
  }, [bubbleDismissed, isOpen, greeting]);

  // 主動關心:在 /learn 頁面待 5 分鐘 → 提醒可問問題
  useEffect(() => {
    if (context !== "teaching" || !courseId || isOpen || bubbleDismissed) return;
    const key = `eyesy_5min_${courseId}`;
    if (sessionStorage.getItem(key)) return;
    const timer = setTimeout(() => {
      setBubbleMsg("看到一半了嗎?有不懂的概念我可以幫你整理一下 ✏️");
      setShowBubble(true);
      sessionStorage.setItem(key, "1");
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [context, courseId, isOpen, bubbleDismissed]);

  // 主動關心:在 /learn 頁面待 15 分鐘 → 鼓勵思考題
  useEffect(() => {
    if (context !== "teaching" || !courseId || isOpen || bubbleDismissed) return;
    const key = `eyesy_15min_${courseId}`;
    if (sessionStorage.getItem(key)) return;
    const timer = setTimeout(() => {
      setBubbleMsg("看了一段時間了!可以挑一個剛學到的概念跟我聊聊,反芻會記更久 🧠");
      setShowBubble(true);
      sessionStorage.setItem(key, "1");
    }, 15 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [context, courseId, isOpen, bubbleDismissed]);

  const { messages, sendMessage, status, setMessages } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    // Prepend context hint as a hidden part for the API to pick up
    const contextHint = `[ctx:${context}${courseId ? `:${courseId}` : ""}]`;
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: contextHint + text }],
    });
    setInput("");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  // Don't show on admin pages
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-2xl border border-outline-variant/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-outline-variant/15 bg-surface-container-low/50 flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center text-white font-bold text-sm shadow-md">
                E
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-surface-container-lowest rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-on-surface text-sm truncate">Eyesy</h3>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                    context === "teaching"
                      ? "bg-secondary text-on-secondary"
                      : "bg-surface-container-high text-on-surface-variant"
                  )}
                >
                  {modeLabel}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant truncate">
                {context === "teaching" && quota
                  ? `深度模式剩 ${formatTokens(quota.monthlyRemaining + quota.topupBalance)} · ${quota.inQ1 ? "Q1 期間" : "已過 Q1"}`
                  : context === "teaching"
                  ? "可引用課程逐字稿 · 看影片有疑問就問"
                  : "牛津視界 AI 助手"}
              </p>
            </div>
            <button
              onClick={() => setMessages([])}
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
              title="重新開始對話"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
            {/* 未登入提示 */}
            {!authLoading && !user && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg signature-gradient flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                  E
                </div>
                <div className="bg-surface-container-low dark:bg-surface-container-high rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%] space-y-2">
                  <p className="text-sm text-on-surface leading-relaxed">
                    嗨！我先請你登入再聊 — 這樣我才能依你的學習進度回答 ✨
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/sign-in?redirect=${encodeURIComponent(pathname)}`}
                      className="text-xs font-bold signature-gradient text-white px-3 py-1.5 rounded-lg"
                    >
                      登入
                    </Link>
                    <Link
                      href={`/sign-up?redirect=${encodeURIComponent(pathname)}`}
                      className="text-xs font-bold border border-secondary text-secondary px-3 py-1.5 rounded-lg"
                    >
                      註冊免費試看
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome message — 已登入才顯示 */}
            {!authLoading && user && messages.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg signature-gradient flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                  E
                </div>
                <div className="bg-surface-container-low dark:bg-surface-container-high rounded-2xl rounded-tl-none px-4 py-3 max-w-[85%]">
                  <p className="text-sm text-on-surface leading-relaxed">
                    {greeting}
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg signature-gradient flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                    E
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 max-w-[85%]",
                    message.role === "user"
                      ? "signature-gradient text-white rounded-tr-none"
                      : "bg-surface-container-low dark:bg-surface-container-high rounded-tl-none"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap",
                      message.role !== "user" && "text-on-surface"
                    )}
                  >
                    {(message.parts
                      ?.filter((p) => p.type === "text")
                      .map((p) => (p as { type: "text"; text: string }).text)
                      .join("") || "").replace(/^\[ctx:[^\]]+\]/, "")}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg signature-gradient flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                  E
                </div>
                <div className="bg-surface-container-low dark:bg-surface-container-high rounded-2xl rounded-tl-none px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-on-surface-variant/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions — 已登入才出 */}
          {user && messages.length === 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {(context === "customer-service"
                ? ["太空課在講什麼？", "Pro 方案有什麼？", "退款政策？"]
                : context === "teaching"
                  ? ["幫我解釋這個概念", "給我一個實例", "下一步該學什麼？"]
                  : ["推薦適合我的課程", "我該從哪裡開始？"]
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary-fixed/80 text-on-secondary-fixed-variant font-medium hover:bg-secondary-fixed-dim transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Input — 未登入禁用,提示先登入 */}
          <form
            onSubmit={handleFormSubmit}
            className="px-4 py-3 border-t border-outline-variant/15 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={user ? "輸入訊息..." : "請先登入再聊"}
              className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-2 ring-secondary/30 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !user}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !user}
              className="w-10 h-10 signature-gradient text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform shrink-0 disabled:opacity-40"
            >
              <Send size={16} className="fill-current" />
            </button>
          </form>
        </div>
      )}

      {/* Greeting Bubble */}
      {showBubble && !isOpen && (
        <div className={cn(
          "fixed bottom-24 z-50 max-w-[260px] animate-in slide-in-from-bottom-2 duration-300",
          // 配合 FAB:課程詳情頁手機 left-6,其他維持 right-6
          pathname.startsWith("/courses/") && pathname !== "/courses"
            ? "left-6 lg:left-auto lg:right-6"
            : "right-6"
        )}>
          <div className={cn(
            "bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-xl border border-outline-variant/20 px-4 py-3 relative",
            // 對話泡尖角:右下/左下視 FAB 而定
            pathname.startsWith("/courses/") && pathname !== "/courses"
              ? "rounded-bl-none lg:rounded-bl-2xl lg:rounded-br-none"
              : "rounded-br-none"
          )}>
            <button
              onClick={() => {
                setShowBubble(false);
                setBubbleDismissed(true);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-surface-container-highest rounded-full flex items-center justify-center text-on-surface-variant text-xs hover:text-on-surface"
            >
              &times;
            </button>
            <p className="text-sm text-on-surface font-medium">
              {bubbleMsg || greeting}
            </p>
            <button
              onClick={() => {
                setShowBubble(false);
                setBubbleDismissed(true);
                setIsOpen(true);
              }}
              className="text-xs text-secondary font-bold mt-2 hover:underline"
            >
              跟 Eyesy 聊聊 &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        data-eyesy-trigger
        onClick={() => {
          setIsOpen(!isOpen);
          setShowBubble(false);
          setBubbleDismissed(true);
        }}
        className={cn(
          "fixed z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 active:scale-90",
          // 學習頁手機底部有 nav bar(64px),把 FAB 抬高避免疊;其他頁面跟桌面維持原位
          pathname.startsWith("/learn/")
            ? "right-6 bottom-24 lg:bottom-6"
            // 課程詳情頁手機底部有 sticky 購買 CTA bar,FAB 改 left-6 避開右側「立即購買」按鈕;桌面側欄 sticky 不衝突,維持 right-6
            : pathname.startsWith("/courses/") && pathname !== "/courses"
            ? "left-6 bottom-6 lg:left-auto lg:right-6"
            : "right-6 bottom-6",
          isOpen
            ? "bg-surface-container-highest text-on-surface"
            : "signature-gradient text-white hover:scale-105 hover:shadow-2xl",
          showBubble && !isOpen && "animate-bounce"
        )}
      >
        {isOpen ? (
          <X size={22} />
        ) : (
          <MessageCircle size={22} className="fill-current" />
        )}
      </button>
    </>
  );
}
