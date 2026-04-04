import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

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
    <html lang="zh-TW" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
