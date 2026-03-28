import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "關於我們 — 牛津視界",
  description: "牛津視界的使命：幫助每個人在 AI 時代找到方向",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">關於牛津視界</h1>

          <div className="space-y-6 text-gray-600 leading-relaxed">
            <p className="text-xl">
              AI 革命來了。大部分人焦慮但不知道從哪開始。少部分人行動了但像無頭蒼蠅。我們幫你找到方向。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 pt-4">
              我們的使命
            </h2>
            <p>
              牛津視界 (Oxford Vision)
              致力於成為華語圈最值得信賴的 AI 時代學習平台。我們不只是賣課程，我們提供系統化的學習路徑、講師的
              AI 助手、和一群共同成長的夥伴。
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 pt-4">
              為什麼選擇我們
            </h2>
            <ul className="space-y-3">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">1.</span>
                <span>
                  <strong>不是又一個線上課程。</strong>
                  我們結合 AI 個人化推薦、講師 AI 助手、和 Discord
                  學習社群，完成率是傳統課程的 4 倍。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">2.</span>
                <span>
                  <strong>講師品牌。</strong>
                  久方武院長、YC 老師等業界實戰講師，不是學院派理論。
                </span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">3.</span>
                <span>
                  <strong>24/7 AI 助手。</strong>
                  凌晨卡關？講師的 AI
                  分身隨時回答你的問題，基於課程內容，不是通用答案。
                </span>
              </li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 pt-4">
              講師團隊
            </h2>
            <p>
              我們的講師來自業界第一線，擁有豐富的實戰經驗。他們不只教你理論，更教你如何在真實世界中應用。
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
