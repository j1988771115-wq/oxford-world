"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState } from "react";
import {
  Bot,
  User,
  Send,
  PlusCircle,
  Lightbulb,
  FileText,
  TrendingUp,
  MoreVertical,
  School,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIAssistantPage() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
  };

  const handleSuggestion = (text: string) => {
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
  };

  return (
    <main className="lg:pl-64 flex flex-col relative h-screen bg-surface">
      {/* Top App Bar */}
      <header className="sticky top-0 z-30 bg-surface-container-lowest/80 dark:bg-surface-container/80 backdrop-blur-xl shadow-sm">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
                <Bot
                  className="text-secondary-container fill-current"
                  size={24}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-surface-container-lowest rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-on-surface">
                  AI 助教
                </span>
                <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">
                  Powered by AI
                </span>
              </div>
              <p className="text-xs text-on-surface-variant flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                Online
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center px-4 py-2 bg-surface-container rounded-full text-on-surface-variant text-sm font-medium">
            <School size={16} className="mr-2" />
            基於課程內容回答
          </div>

          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 max-w-5xl mx-auto w-full no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-primary-container flex items-center justify-center mx-auto mb-6">
              <Bot
                className="text-secondary-container fill-current"
                size={40}
              />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">
              有什麼想問的？
            </h2>
            <p className="text-on-surface-variant text-sm max-w-md mx-auto mb-8">
              我是牛津視界的 AI
              助手，基於講師的課程內容回答問題。試試以下問題：
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                "Go 語言的 goroutine 是什麼？",
                "如何開始學 AI？",
                "推薦我適合的課程",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className="px-4 py-2 bg-secondary-fixed text-on-secondary-fixed-variant text-sm font-bold rounded-full hover:bg-secondary-fixed-dim transition-colors shadow-sm"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-start gap-4",
              message.role === "user" && "flex-row-reverse"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                message.role === "user"
                  ? "bg-secondary"
                  : "bg-primary-container"
              )}
            >
              {message.role === "user" ? (
                <User className="text-white" size={20} />
              ) : (
                <Bot
                  className="text-secondary-container fill-current"
                  size={20}
                />
              )}
            </div>
            <div className="space-y-2 max-w-[85%]">
              <div
                className={cn(
                  "p-5 rounded-2xl shadow-sm",
                  message.role === "user"
                    ? "signature-gradient text-white rounded-tr-none"
                    : "bg-surface-container-lowest dark:bg-surface-container rounded-tl-none border border-outline-variant/10"
                )}
              >
                <p
                  className={cn(
                    "leading-relaxed whitespace-pre-wrap text-sm",
                    message.role !== "user" && "text-on-surface"
                  )}
                >
                  {message.parts
                    ?.filter((p) => p.type === "text")
                    .map((p) => (p as { type: "text"; text: string }).text)
                    .join("") || ""}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
              <Bot
                className="text-secondary-container fill-current"
                size={20}
              />
            </div>
            <div className="bg-surface-container-lowest dark:bg-surface-container rounded-2xl rounded-tl-none px-5 py-4 border border-outline-variant/10">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-on-surface-variant rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <footer className="p-4 md:p-6 bg-surface-container-lowest dark:bg-surface-container border-t border-outline-variant/15">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { icon: Lightbulb, text: "這個概念能再解釋一次嗎？" },
              { icon: FileText, text: "給我一個實際案例" },
              { icon: TrendingUp, text: "下一步該學什麼？" },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={() => handleSuggestion(btn.text)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 text-xs font-bold rounded-full flex items-center gap-2 transition-colors",
                  i === 0
                    ? "bg-secondary-fixed text-on-secondary-fixed-variant hover:bg-secondary-fixed-dim shadow-sm"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
                )}
              >
                <btn.icon size={14} />
                {btn.text}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="relative flex items-center gap-2 bg-surface-container-low p-2 rounded-2xl shadow-inner focus-within:ring-2 ring-secondary-container/30 transition-all"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder-on-surface-variant/50 text-sm py-3 px-2"
              placeholder="輸入您的訊息..."
              type="text"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-12 h-12 signature-gradient text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0 disabled:opacity-50"
            >
              <Send size={20} className="fill-current" />
            </button>
          </form>
          <p className="text-center text-[10px] text-on-surface-variant/60">
            AI 助教可能會產生不準確的內容，請確認重要資訊。
          </p>
        </div>
      </footer>
    </main>
  );
}
