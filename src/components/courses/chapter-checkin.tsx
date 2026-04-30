"use client";

import { useState } from "react";
import { Sparkles, Send, RotateCcw, Bot } from "lucide-react";

interface Props {
  chapterId: string;
  chapterTitle: string;
}

type Phase = "idle" | "loading-q" | "answering" | "loading-g" | "graded";

export function ChapterCheckin({ chapterId, chapterTitle }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchQuestion = async () => {
    setError(null);
    setPhase("loading-q");
    try {
      const res = await fetch("/api/eyesy/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, action: "question" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "讀取題目失敗");
        setPhase("idle");
        return;
      }
      setQuestion(json.question);
      setAnswer("");
      setFeedback("");
      setPhase("answering");
    } catch (e) {
      setError(e instanceof Error ? e.message : "網路錯誤");
      setPhase("idle");
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setError(null);
    setPhase("loading-g");
    try {
      const res = await fetch("/api/eyesy/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId,
          action: "grade",
          question,
          answer,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "評分失敗");
        setPhase("answering");
        return;
      }
      setFeedback(json.feedback);
      setPhase("graded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "網路錯誤");
      setPhase("answering");
    }
  };

  const reset = () => {
    setPhase("idle");
    setQuestion("");
    setAnswer("");
    setFeedback("");
    setError(null);
  };

  if (phase === "idle") {
    return (
      <div className="bg-secondary-fixed/15 border border-secondary-fixed/40 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center text-white shrink-0 shadow-md">
            <Sparkles size={18} className="fill-current" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-on-surface mb-1">
              看完這章了？來測試一下
            </h3>
            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
              Eyesy 會根據本章內容出一道開放式思考題,你回答後會點出你抓到什麼、漏了什麼。比看第二遍更有效率。
            </p>
            <button
              onClick={fetchQuestion}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-on-secondary text-sm font-bold hover:opacity-90 transition-opacity active:scale-95"
            >
              <Bot size={16} /> 請 Eyesy 出一題
            </button>
            {error && (
              <p className="text-xs text-rose-500 mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "loading-q") {
    return (
      <div className="bg-secondary-fixed/15 border border-secondary-fixed/40 rounded-2xl p-6 text-center">
        <Bot size={28} className="mx-auto text-secondary mb-2 animate-pulse" />
        <p className="text-sm text-on-surface-variant">Eyesy 正在出題...</p>
      </div>
    );
  }

  if (phase === "answering" || phase === "loading-g") {
    return (
      <div className="bg-secondary-fixed/15 border border-secondary-fixed/40 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center text-white shrink-0 shadow-md">
            <Sparkles size={18} className="fill-current" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.18em] mb-2">
              Eyesy 提問
            </p>
            <p className="text-on-surface font-medium leading-relaxed">
              {question}
            </p>
          </div>
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="寫下你的想法...不必完整,把你抓到的核心重點說出來就好"
          rows={5}
          disabled={phase === "loading-g"}
          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-on-surface-variant/50 focus:ring-2 ring-secondary/30 focus:outline-none transition-all disabled:opacity-50 resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <button
            onClick={reset}
            className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            disabled={phase === "loading-g"}
          >
            取消
          </button>
          <button
            onClick={submitAnswer}
            disabled={!answer.trim() || phase === "loading-g"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl signature-gradient text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {phase === "loading-g" ? (
              <>
                <Bot size={16} className="animate-pulse" /> Eyesy 評分中...
              </>
            ) : (
              <>
                <Send size={14} className="fill-current" /> 提交答案
              </>
            )}
          </button>
        </div>
        {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
      </div>
    );
  }

  // graded
  return (
    <div className="bg-secondary-fixed/15 border border-secondary-fixed/40 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center text-white shrink-0 shadow-md">
          <Sparkles size={18} className="fill-current" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.18em] mb-2">
            Eyesy 提問
          </p>
          <p className="text-on-surface font-medium leading-relaxed mb-4">
            {question}
          </p>
          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.18em] mb-2">
            你的答案
          </p>
          <p className="text-sm text-on-surface-variant whitespace-pre-wrap mb-4">
            {answer}
          </p>
          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.18em] mb-2">
            Eyesy 回饋
          </p>
          <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
            {feedback}
          </p>
        </div>
      </div>
      <div className="flex justify-end pt-2 border-t border-outline-variant/15">
        <button
          onClick={fetchQuestion}
          className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:opacity-80 transition-opacity"
        >
          <RotateCcw size={14} /> 再來一題
        </button>
      </div>
    </div>
  );
}
