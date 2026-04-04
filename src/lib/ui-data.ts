import type { Course, Milestone, Review } from "@/types";

export const DEMO_COURSES: Course[] = [
  {
    id: "1",
    slug: "ai-decision-making",
    title: "AI 驅動決策力：經理人的數據思維",
    description:
      "學習如何運用生成式 AI 優化團隊工作流，提升 300% 的生產效率。",
    price: 2980,
    originalPrice: 4990,
    rating: 4.9,
    students: "3,200+",
    category: "商務決策",
    level: "Advanced",
    thumbnail:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    instructor: {
      name: "久方武院長",
      title: "Oxford Vision AI 實驗室院長",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dean",
    },
    isFreePreview: false,
  },
  {
    id: "2",
    slug: "prompt-engineering-masterclass",
    title: "提示工程大師班：精準溝通的藝術",
    description:
      "掌握與 LLM 互動的核心語法，將 AI 變成你最得力的數位雙生子。",
    price: 1880,
    rating: 5.0,
    students: "1,500+",
    category: "技術實作",
    level: "Foundational",
    thumbnail:
      "https://images.unsplash.com/photo-1620712943543-bcc4628c9757?auto=format&fit=crop&q=80&w=800",
    instructor: {
      name: "林偉傑",
      title: "資深 AI 工程師",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lin",
    },
    isFreePreview: false,
  },
  {
    id: "3",
    slug: "ai-trends-2026",
    title: "2026 AI 趨勢導讀：掌握技術奇點",
    description:
      "每週更新最新 AI 研究報告，為你過濾雜訊，只留下具商業價值的洞察。",
    price: 4500,
    rating: 4.8,
    students: "2,100+",
    category: "趨勢分析",
    level: "Specialized",
    thumbnail:
      "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800",
    instructor: {
      name: "張美玲",
      title: "科技趨勢分析師",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chang",
    },
    isFreePreview: false,
  },
];

export const MILESTONES: Milestone[] = [
  {
    id: "1",
    phase: "Phase 01",
    title: "AI 基礎理論與模型架構",
    description: "掌握 LLM 運作原理、Token 機制與當前 AI 技術版圖。",
    status: "completed",
  },
  {
    id: "2",
    phase: "Phase 02",
    title: "Prompt Engineering 精進",
    description: "從零開始學習如何撰寫高效指令，優化 AI 輸出品質。",
    status: "completed",
  },
  {
    id: "3",
    phase: "Phase 03",
    title: "企業級專案實作",
    description: "實戰模擬：利用 AI 建立自動化工作流與數據分析儀表板。",
    status: "current",
  },
  {
    id: "4",
    phase: "Phase 04",
    title: "進階應用：AI 策略與決策",
    description: "最後階段，學習如何將 AI 整合進組織管理與長遠決策。",
    status: "locked",
  },
];

export const REVIEWS: Review[] = [
  {
    id: "1",
    author: "陳映璇",
    rating: 5,
    date: "2024.11.15",
    title: "這不是一般的技術課，而是真正能幫助管理的課程",
    content:
      "院長講解非常清晰，把複雜的算法轉換成決策語言，對於我們這種不懂代碼的經理人來說收穫極大。",
    avatarColor: "bg-primary-fixed",
  },
  {
    id: "2",
    author: "李嘉偉",
    rating: 5,
    date: "2024.10.02",
    title: "教材非常扎實，案例分析很精彩",
    content:
      "課程附帶的決策框架表格非常好用，已經試著套用到公司下個季度的預算評估中。",
    avatarColor: "bg-secondary-fixed",
  },
];
