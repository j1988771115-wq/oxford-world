"use client";

import { useState } from "react";
import {
  Code,
  Palette,
  Megaphone,
  BarChart3,
  GraduationCap,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Sparkles,
  Brain,
  Clock,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface QuizStep {
  question: string;
  icon: React.ElementType;
  options: { id: string; icon: React.ElementType; label: string }[];
}

const QUIZ_STEPS: QuizStep[] = [
  {
    question: "你目前的職業是？",
    icon: Briefcase,
    options: [
      { id: "engineer", icon: Code, label: "工程師" },
      { id: "designer", icon: Palette, label: "設計師" },
      { id: "marketing", icon: Megaphone, label: "行銷" },
      { id: "manager", icon: BarChart3, label: "管理層" },
      { id: "student", icon: GraduationCap, label: "學生" },
      { id: "other", icon: MoreHorizontal, label: "其他" },
    ],
  },
  {
    question: "你對 AI 的了解程度？",
    icon: Brain,
    options: [
      { id: "none", icon: MoreHorizontal, label: "完全不了解" },
      { id: "heard", icon: MoreHorizontal, label: "聽過但沒用過" },
      { id: "used", icon: MoreHorizontal, label: "用過 ChatGPT 等工具" },
      { id: "developer", icon: Code, label: "有開發 AI 應用的經驗" },
    ],
  },
  {
    question: "你最想學什麼？",
    icon: Target,
    options: [
      { id: "tools", icon: MoreHorizontal, label: "AI 工具實戰應用" },
      { id: "programming", icon: Code, label: "程式語言（Python / Go）" },
      { id: "ai-dev", icon: MoreHorizontal, label: "AI 應用開發" },
      { id: "strategy", icon: BarChart3, label: "AI 商業策略" },
      { id: "blockchain", icon: MoreHorizontal, label: "區塊鏈 / Web3" },
    ],
  },
  {
    question: "你每週能投入多少時間學習？",
    icon: Clock,
    options: [
      { id: "1-2h", icon: MoreHorizontal, label: "1-2 小時" },
      { id: "3-5h", icon: MoreHorizontal, label: "3-5 小時" },
      { id: "5-10h", icon: MoreHorizontal, label: "5-10 小時" },
      { id: "10h+", icon: MoreHorizontal, label: "10+ 小時（全職學習）" },
    ],
  },
];

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const totalSteps = QUIZ_STEPS.length;

  const handleSelect = (value: string) => {
    setAnswers({ ...answers, [step]: value });
  };

  const handleNext = () => {
    if (!answers[step]) return;
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      generatePath(answers);
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

  const currentStep = QUIZ_STEPS[step];

  return (
    <main className="lg:pl-64 pt-8 pb-32 px-4 max-w-4xl mx-auto">
      {!result && !isLoading && (
        <>
          {/* Header + Progress */}
          <div className="mb-12">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-on-surface font-bold text-3xl tracking-tight mb-1">
                  量身打造你的 AI 學習路徑
                </h2>
                <p className="text-on-surface-variant">
                  只需 {totalSteps} 個步驟，我們將為你匹配最合適的教學資源。
                </p>
              </div>
              <div className="text-right">
                <span className="text-secondary font-bold text-sm tracking-widest uppercase">
                  Step {step + 1}/{totalSteps}
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className="h-full signature-gradient transition-all duration-500"
                style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <section className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center text-secondary-container">
                <currentStep.icon size={24} className="fill-current" />
              </div>
              <h3 className="text-2xl font-bold text-on-surface">
                Q{step + 1}: {currentStep.question}
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {currentStep.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={cn(
                    "group flex flex-col items-center p-6 bg-surface-container-lowest rounded-xl deep-diffusion transition-all border-2",
                    answers[step] === opt.id
                      ? "border-secondary-container ring-2 ring-secondary-container/20 ring-offset-2"
                      : "border-transparent hover:ring-2 hover:ring-secondary-container/20"
                  )}
                >
                  <div
                    className={cn(
                      "w-16 h-16 mb-4 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                      answers[step] === opt.id
                        ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                        : "bg-surface-container-low text-secondary"
                    )}
                  >
                    <opt.icon size={32} />
                  </div>
                  <span className="font-bold text-on-surface">{opt.label}</span>
                  {answers[step] === opt.id && (
                    <div className="mt-2 h-1.5 w-1.5 rounded-full bg-secondary-container" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Navigation */}
          <div className="mt-16 flex justify-between items-center">
            <button
              onClick={() => step > 0 && setStep(step - 1)}
              className={cn(
                "px-8 py-3 text-on-surface-variant font-bold hover:bg-surface-container-low rounded-xl transition-all flex items-center gap-2",
                step === 0 && "invisible"
              )}
            >
              <ArrowLeft size={20} />
              上一步
            </button>
            <button
              onClick={handleNext}
              disabled={!answers[step]}
              className="px-10 py-4 signature-gradient text-white font-bold rounded-xl deep-diffusion hover:opacity-90 transition-all flex items-center gap-2 group disabled:opacity-50"
            >
              {step < totalSteps - 1 ? "下一步" : "生成學習路徑"}
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-24 relative">
            <div className="absolute -top-6 -left-6 w-24 h-24 signature-gradient rounded-full opacity-10 blur-2xl" />
            <div className="bg-primary-container p-8 rounded-3xl text-white relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="max-w-md">
                  <h4 className="text-xl font-bold mb-2">
                    為什麼我們需要這些資訊？
                  </h4>
                  <p className="text-on-primary-container text-sm leading-relaxed">
                    牛津視界 Oxford Vision 的 AI
                    會根據您的職業背景，自動篩選最相關的案例研究與實作工具。
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="bg-surface-container-lowest/10 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                    <Sparkles
                      size={40}
                      className="text-secondary-container fill-current"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {isLoading && (
        <div className="text-center py-24">
          <div className="animate-spin w-10 h-10 border-3 border-secondary-container border-t-transparent rounded-full mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-on-surface mb-2">
            AI 正在分析你的答案...
          </h2>
          <p className="text-on-surface-variant">
            根據你的背景和目標，生成個人化學習路線圖
          </p>
        </div>
      )}

      {result && (
        <div className="pt-8">
          <h1 className="text-3xl font-black text-on-surface mb-2 tracking-tight">
            你的專屬學習路徑
          </h1>
          <p className="text-on-surface-variant mb-8">
            根據你的背景和目標，AI 為你規劃的學習路線
          </p>
          <div className="bg-surface-container-lowest rounded-2xl deep-diffusion p-8">
            <div className="whitespace-pre-wrap text-on-surface leading-relaxed">
              {result}
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <Link
              href="/courses"
              className="signature-gradient text-white px-8 py-4 rounded-xl font-bold hover:opacity-90 transition"
            >
              瀏覽推薦課程
            </Link>
            <button
              onClick={() => {
                setStep(0);
                setAnswers({});
                setResult(null);
              }}
              className="border-2 border-outline-variant text-on-surface px-8 py-4 rounded-xl font-bold hover:bg-surface-container transition"
            >
              重新測驗
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
