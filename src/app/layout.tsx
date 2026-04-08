import type { Metadata } from "next";
import { Inter, Noto_Sans_TC } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "牛津視界 Oxford Vision — AI 時代的學習夥伴",
  description:
    "系統化的 AI 學習路徑、講師 AI 助手、同儕社群。不再當無頭蒼蠅，找到你的方向。",
  openGraph: {
    title: "牛津視界 Oxford Vision",
    description: "AI 時代的學習夥伴 — 系統化的 AI 學習路徑、講師 AI 助手、同儕社群",
    type: "website",
    locale: "zh_TW",
    images: [{ url: "/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "牛津視界 Oxford Vision",
    description: "AI 時代的學習夥伴",
    images: ["/og"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "牛津視界 Oxford Vision",
  url: "https://oxford-vision.com",
  description: "系統化的 AI 學習路徑、講師 AI 助手、同儕社群。幫助有 AI 焦慮的人找到方向。",
  sameAs: ["https://discord.gg/oxfordvision"],
  founder: { "@type": "Person", name: "久方武" },
  areaServed: { "@type": "Country", name: "TW" },
  availableLanguage: "zh-TW",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "AI 學習課程",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Course",
          name: "AI 驅動決策力：經理人的數據思維",
          provider: { "@type": "Organization", name: "牛津視界 Oxford Vision" },
        },
      },
    ],
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "牛津視界是什麼？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "牛津視界 Oxford Vision 是一個 AI 學習平台，提供系統化的 AI 學習路徑、講師 AI 助手和同儕社群，幫助有 AI 焦慮的人找到學習方向。",
      },
    },
    {
      "@type": "Question",
      name: "牛津視界的課程多少錢？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "牛津視界提供免費課程試看，Pro 會員 NT$499/月或 NT$4,990/年，可解鎖所有課程、付費報告和 Discord 社群。",
      },
    },
    {
      "@type": "Question",
      name: "牛津視界有什麼 AI 功能？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "牛津視界提供 AI 助教即時問答、AI 個人化學習路徑測驗，以及基於課程內容的 RAG 語意搜尋，讓學習更有效率。",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className={`h-full antialiased ${inter.variable} ${notoSansTC.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
