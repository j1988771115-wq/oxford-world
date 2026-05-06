import type { Metadata } from "next";
import { Inter, Noto_Sans_TC } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { LazyEyesyChatWidget } from "@/components/eyesy/lazy-chat-widget";
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
  metadataBase: new URL("https://oxford-vision.com"),
  title: "牛津視界 Oxford Vision — 太空時代的資本配置",
  description:
    "下一個十年的產業革命。久方武院長 10 章深度拆解 8 隻精選美股太空標的，從 SpaceX 大敘事到實戰資本配置框架。",
  alternates: { canonical: "/" },
  openGraph: {
    title: "太空時代的資本配置 — 牛津視界",
    description: "久方武院長親授 · 10 章深度拆解美股太空標的",
    type: "website",
    locale: "zh_TW",
    images: [{ url: "/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "太空時代的資本配置 — 牛津視界",
    description: "下一個十年的產業革命 · 久方武院長親授",
    images: ["/og"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "牛津視界 Oxford Vision",
  alternateName: "Oxford Vision",
  url: "https://oxford-vision.com",
  logo: {
    "@type": "ImageObject",
    url: "https://oxford-vision.com/icon.png",
    width: 512,
    height: 512,
  },
  image: "https://oxford-vision.com/og",
  description: "系統化的 AI 學習路徑、講師 AI 助手、同儕社群。幫助有 AI 焦慮的人找到方向。",
  sameAs: ["https://discord.gg/oxfordvision"],
  founder: {
    "@type": "Person",
    name: "久方武",
    jobTitle: "牛津視界院長",
    affiliation: {
      "@type": "Organization",
      name: "巨石文化有限公司",
    },
  },
  parentOrganization: {
    "@type": "Organization",
    name: "巨石文化有限公司",
  },
  areaServed: { "@type": "Country", name: "TW" },
  availableLanguage: "zh-TW",
  knowsAbout: ["AI 投資", "太空產業", "美股微型股", "Go 語言", "創投策略"],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "大師課",
    itemListElement: [
      {
        "@type": "Offer",
        price: "24900",
        priceCurrency: "TWD",
        url: "https://oxford-vision.com/courses/master-space-age-capital",
        availability: "https://schema.org/InStock",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: "24900",
          priceCurrency: "TWD",
        },
        itemOffered: {
          "@type": "Course",
          name: "太空時代的資本配置：下一個十年的產業革命",
          provider: { "@type": "Organization", name: "牛津視界 Oxford Vision" },
        },
      },
    ],
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "牛津視界 Oxford Vision",
  alternateName: "Oxford Vision",
  url: "https://oxford-vision.com",
  inLanguage: "zh-TW",
  publisher: { "@type": "Organization", name: "巨石文化有限公司" },
  description:
    "太空時代的資本配置教育平台。久方武院長親授 — 系統化拆解美股太空產業。",
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
        text: "牛津視界目前提供大師課單課買斷,太空時代的資本配置由久方武院長親授,原價 NT$30,000、限時優惠價 NT$24,900,一次付費永久觀看,加贈 Pro 90 天。",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
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
            <LazyEyesyChatWidget />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
