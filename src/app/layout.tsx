import type { Metadata } from "next";
import { Inter, Noto_Sans_TC } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { EyesyChatWidget } from "@/components/eyesy/chat-widget";
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
    name: "大師課",
    itemListElement: [
      {
        "@type": "Offer",
        price: "28000",
        priceCurrency: "TWD",
        itemOffered: {
          "@type": "Course",
          name: "太空時代的資本配置：下一個十年的產業革命",
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
        text: "牛津視界目前提供大師課單課買斷，太空時代的資本配置由久方武院長親授，定價 NT$28,000，一次付費永久觀看。",
      },
    },
    {
      "@type": "Question",
      name: "牛津視界有什麼 AI 功能？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "牛津視界提供 AI 助教 Eyesy 即時問答，能回答課程內容、Go 語言相關問題與客服詢問，並基於課程內容的 RAG 語意搜尋讓學習更有效率。",
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
          <AuthProvider>
            {children}
            <EyesyChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
