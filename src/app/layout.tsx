import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { zhTW } from "@clerk/localizations";
import { Noto_Sans_TC, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "牛津視界 Oxford Vision — AI 時代的學習夥伴",
  description:
    "系統化的 AI 學習路徑、講師 AI 助手、同儕社群。不再當無頭蒼蠅，找到你的方向。",
  openGraph: {
    title: "牛津視界 Oxford Vision",
    description: "AI 時代的學習夥伴",
    type: "website",
    locale: "zh_TW",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={zhTW}>
      <html
        lang="zh-TW"
        className={`${notoSansTC.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
