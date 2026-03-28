import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "最新內容 — 牛津視界",
  description: "最新的 AI 報告、影片、文章",
};

export default function InsightsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">最新內容</h1>
            <p className="text-gray-600 mt-2">
              AI 報告、影片、文章，持續更新
            </p>
          </div>

          {/* Placeholder for CMS-driven content */}
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📰</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              內容即將上線
            </h2>
            <p className="text-gray-500">
              我們正在準備精彩的報告和影片，敬請期待。
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
