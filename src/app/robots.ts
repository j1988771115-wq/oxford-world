import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://oxford-vision.com";

// AI 爬蟲明確 allow(AEO/AIPR)— 不 allow 等於 AI 看不見你
const AI_BOTS = [
  "GPTBot",            // OpenAI / ChatGPT
  "ChatGPT-User",      // ChatGPT 即時瀏覽
  "OAI-SearchBot",     // ChatGPT Search
  "ClaudeBot",         // Anthropic Claude
  "Claude-Web",        // Claude.ai 瀏覽
  "anthropic-ai",      // Anthropic 爬蟲
  "PerplexityBot",     // Perplexity
  "Perplexity-User",   // Perplexity 即時
  "Google-Extended",   // Google Gemini / AI Overview
  "Bingbot",           // Bing / Copilot
  "Applebot-Extended", // Apple Intelligence
  "CCBot",             // Common Crawl(LLM 訓練資料源)
  "Bytespider",        // 字節跳動 / 豆包
  "Amazonbot",         // Amazon Q
  "Meta-ExternalAgent",// Meta AI
];

export default function robots(): MetadataRoute.Robots {
  const sharedRules = {
    allow: "/",
    disallow: ["/dashboard", "/learn", "/ai-assistant", "/api/", "/admin", "/onboarding"],
  };

  return {
    rules: [
      { userAgent: "*", ...sharedRules },
      ...AI_BOTS.map((ua) => ({ userAgent: ua, ...sharedRules })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
