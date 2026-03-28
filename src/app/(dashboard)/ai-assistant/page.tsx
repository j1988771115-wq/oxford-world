"use client";

import { useChat } from "@ai-sdk/react";
import { Navbar } from "@/components/layout/navbar";
import { useRef, useEffect, useState } from "react";

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

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="px-4 py-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">AI 學習助手</h1>
          <p className="text-sm text-gray-500">
            基於課程內容回答你的問題，隨時問，不用等
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🤖</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                有什麼想問的？
              </h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                我是牛津視界的 AI
                助手，基於講師的課程內容回答問題。試試看：
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {[
                  "Go 語言的 goroutine 是什麼？",
                  "如何開始學 AI？",
                  "推薦我適合的課程",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-sm px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
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
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
                  {message.parts
                    ?.filter((p) => p.type === "text")
                    .map((p) => (p as { type: "text"; text: string }).text)
                    .join("") || ""}
                </p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-4 border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="問我任何關於課程的問題..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              送出
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
