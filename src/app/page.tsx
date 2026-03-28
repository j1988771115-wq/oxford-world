import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";
import { EmailCaptureForm } from "@/components/email-capture-form";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            牛津視界
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/courses"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              課程
            </Link>
            <Link
              href="/about"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              關於我們
            </Link>
            <Link
              href="/insights"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              最新內容
            </Link>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition">
                  登入
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
              >
                我的學習
              </Link>
            </Show>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            AI 時代，
            <br />
            <span className="text-blue-600">不再當無頭蒼蠅</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            牛津視界幫你找到方向。個人化學習路徑、講師 AI
            助手、同儕社群，讓你系統化掌握 AI 時代的關鍵技能。
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/quiz"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
            >
              免費測驗：找到你的學習路徑
            </Link>
            <Link
              href="/courses"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50 transition"
            >
              瀏覽課程
            </Link>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI 個人化學習路徑</h3>
              <p className="text-gray-600">
                5 分鐘測驗，AI
                幫你規劃專屬學習路線圖。不再浪費時間在不適合的課程上。
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">講師 AI 助手</h3>
              <p className="text-gray-600">
                凌晨 2 點卡關？講師的 AI 分身 24/7
                回答你的問題，基於課程內容，不是通用回答。
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">同儕社群</h3>
              <p className="text-gray-600">
                加入 Discord
                學習社群，和其他轉型者一起前進。排行榜、學習小組、講師直播。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Email Capture */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">免費訂閱 AI 學習週報</h2>
          <p className="text-gray-600 mb-6">
            每週精選 AI 學習資源、社群精華、實用工具推薦。
          </p>
          <EmailCaptureForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-gray-500">
          <p>&copy; 2026 牛津視界 Oxford Vision</p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-gray-900">
              關於
            </Link>
            <a
              href="https://discord.gg/your-invite"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900"
            >
              Discord
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
