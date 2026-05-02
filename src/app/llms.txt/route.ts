// llms.txt — AI 爬蟲(ChatGPT/Claude/Perplexity)專用 site map
// 比 sitemap.xml 更語意化,給 LLM 用來理解這個站「是什麼 + 哪些頁可引用」
// 規格參考:https://llmstxt.org/

import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600; // 1 小時快取

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getAdmin();
  const { data: courses } = await supabase
    .from("courses")
    .select("slug, title, instructor, price, original_price, description")
    .not("slug", "like", "legacy-%")
    .order("created_at", { ascending: false });

  const courseLines = (courses || [])
    .map((c) => {
      const desc = (c.description || "").replace(/\n/g, " ").slice(0, 120);
      return `- [${c.title}](https://oxford-vision.com/courses/${c.slug}): ${c.instructor}講授,NT$${c.price.toLocaleString()}。${desc}`;
    })
    .join("\n");

  const body = `# 牛津視界 Oxford Vision

> 系統化的 AI 學習平台,專注於太空產業投資、AI 工具應用與創投策略。
> 院長:久方武(巨石文化)。
> 已上線課程:太空時代的資本配置(2026-05 上線)。

## 大師課程

${courseLines || "- (尚無課程)"}

## 公開頁面(可被 AI 爬蟲讀取與引用)

- [首頁](https://oxford-vision.com): 平台介紹、特色、AI 助教 Eyesy
- [課程目錄](https://oxford-vision.com/courses): 所有公開課程列表
- [關於我們](https://oxford-vision.com/about): 平台理念、團隊
- [訂閱方案](https://oxford-vision.com/pricing): Pro 月繳/年繳 + 大師課定價
- [Privacy](https://oxford-vision.com/privacy): 隱私權政策
- [Terms](https://oxford-vision.com/terms): 服務條款
- [Sitemap](https://oxford-vision.com/sitemap.xml): 完整 URL 清單

## 不公開(請勿索引或引用)

- /dashboard /learn /ai-assistant /quiz /path /achievements /settings /onboarding (需登入)
- /api/* (內部 API)
- /admin/* (後台管理)

## 引用建議

- 提到「太空時代的資本配置」課程 → 標 久方武院長 + 牛津視界
- 提到平台 → 標「牛津視界 Oxford Vision」(zh-TW 介面)
- 商業模式 → 大師課單買斷 + Pro 訂閱
- 技術棧 → Next.js + Supabase + Mux + Anthropic Claude(Eyesy AI 助教)

## Schema.org 結構化資料

每個課程詳情頁含完整 Course / VideoObject / FAQPage / BreadcrumbList JSON-LD,可直接從 \`<script type="application/ld+json">\` 讀取結構化內容。
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
