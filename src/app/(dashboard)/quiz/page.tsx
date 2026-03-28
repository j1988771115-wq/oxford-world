"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";

interface QuizStep {
  question: string;
  options: { label: string; value: string }[];
}

const QUIZ_STEPS: QuizStep[] = [
  {
    question: "你目前的職業是什麼？",
    options: [
      { label: "軟體工程師", value: "engineer" },
      { label: "設計師", value: "designer" },
      { label: "行銷 / 業務", value: "marketing" },
      { label: "管理層", value: "management" },
      { label: "學生", value: "student" },
      { label: "其他", value: "other" },
    ],
  },
  {
    question: "你對 AI 的了解程度？",
    options: [
      { label: "完全不了解", value: "none" },
      { label: "聽過但沒用過", value: "heard" },
      { label: "用過 ChatGPT 等工具", value: "used" },
      { label: "有開發 AI 應用的經驗", value: "developer" },
    ],
  },
  {
    question: "你最想學什麼？",
    options: [
      { label: "AI 工具實戰應用", value: "tools" },
      { label: "程式語言（Python / Go）", value: "programming" },
      { label: "AI 應用開發", value: "ai-dev" },
      { label: "AI 商業策略", value: "strategy" },
      { label: "區塊鏈 / Web3", value: "blockchain" },
    ],
  },
  {
    question: "你每週能投入多少時間學習？",
    options: [
      { label: "1-2 小時", value: "1-2h" },
      { label: "3-5 小時", value: "3-5h" },
      { label: "5-10 小時", value: "5-10h" },
      { label: "10+ 小時（全職學習）", value: "10h+" },
    ],
  },
];

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [step]: value };
    setAnswers(newAnswers);

    if (step < QUIZ_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      generatePath(newAnswers);
    }
  };

  const generatePath = async (allAnswers: Record<number, string>) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `根據以下測驗結果，幫我規劃一個 AI 學習路徑：

職業：${allAnswers[0]}
AI 了解程度：${allAnswers[1]}
想學的方向：${allAnswers[2]}
每週學習時間：${allAnswers[3]}

請提供：
1. 建議的學習路線圖（按順序列出 3-5 個階段）
2. 每個階段的重點
3. 推薦的牛津視界課程（如果有的話）
4. 預計完成時間

用繁體中文回答，語氣鼓勵但實際。`,
            },
          ],
        }),
      });

      const text = await response.text();
      setResult(text);
    } catch {
      setResult("抱歉，生成學習路徑時發生錯誤。請稍後再試。");
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="max-w-xl mx-auto px-4 py-12 w-full">
          {!result && !isLoading && (
            <>
              {/* Progress */}
              <div className="flex gap-1 mb-8">
                {QUIZ_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full ${
                      i <= step ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                找到你的 AI 學習路徑
              </h1>
              <p className="text-gray-500 mb-8">
                第 {step + 1} / {QUIZ_STEPS.length} 題
              </p>

              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {QUIZ_STEPS[step].question}
              </h2>

              <div className="space-y-3">
                {QUIZ_STEPS[step].options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition text-gray-700 hover:text-blue-700"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  ← 上一題
                </button>
              )}
            </>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">
                AI 正在分析你的答案...
              </h2>
              <p className="text-gray-500 mt-2">
                根據你的背景和目標，生成個人化學習路線圖
              </p>
            </div>
          )}

          {result && (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                🎯 你的專屬學習路徑
              </h1>
              <p className="text-gray-500 mb-6">
                根據你的背景和目標，AI 為你規劃的學習路線
              </p>
              <div className="bg-white rounded-xl border border-gray-200 p-6 prose prose-gray max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {result}
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <a
                  href="/courses"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  瀏覽推薦課程
                </a>
                <button
                  onClick={() => {
                    setStep(0);
                    setAnswers({});
                    setResult(null);
                  }}
                  className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  重新測驗
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
