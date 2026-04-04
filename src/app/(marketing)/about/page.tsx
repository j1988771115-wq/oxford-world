import { Crown, Code, TrendingUp } from "lucide-react";

export const metadata = {
  title: "關於我們 — 牛津視界",
  description: "牛津視界的使命：幫助每個人在 AI 時代找到方向",
};

export default function AboutPage() {
  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-7xl mx-auto px-8">
        {/* Hero */}
        <div className="max-w-3xl mb-20">
          <h1 className="text-5xl md:text-6xl font-black text-on-surface tracking-tight mb-6 leading-tight">
            關於牛津視界
          </h1>
          <p className="text-xl text-on-surface-variant leading-relaxed">
            AI 革命來了。大部分人焦慮但不知道從哪開始。少部分人行動了但像無頭蒼蠅。我們幫你找到方向。
          </p>
        </div>

        {/* Mission */}
        <section className="bg-primary-container rounded-3xl p-12 md:p-16 mb-16 relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-[#00d2ff] blur-[100px] rounded-full opacity-10" />
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl font-black text-white mb-6">我們的使命</h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              牛津視界 (Oxford Vision) 致力於成為華語圈最值得信賴的 AI 時代學習平台。我們不只是賣課程，我們提供系統化的學習路徑、講師的 AI 助手、和一群共同成長的夥伴。
            </p>
          </div>
        </section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-on-surface mb-12 tracking-tight">
            核心團隊
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Crown,
                name: "久方武",
                role: "院長",
                tag: "戰略大腦",
                desc: "產官學三棲、上市櫃輔導、證券公司副總經理、財訊資深研究員。建立品牌高度，吸引高淨值企業主。",
                color: "text-amber-500",
              },
              {
                icon: Code,
                name: "YC",
                role: "技術聯創",
                tag: "科技權威",
                desc: "微軟 Azure、Polkadot 核心開發。提供硬核技術背書，區隔一般「說書人」。",
                color: "text-blue-500",
              },
              {
                icon: TrendingUp,
                name: "黃靖哲",
                role: "持牌分析師",
                tag: "實戰教父",
                desc: "20 年投顧經驗、財經台名嘴。強大的散戶吸金招牌，直接轉化交易需求。",
                color: "text-emerald-500",
              },
            ].map((member, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest p-8 rounded-xl deep-diffusion"
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mb-6">
                  <member.icon className={member.color} size={32} />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-1">
                  {member.name}
                </h3>
                <p className="text-secondary text-sm font-bold mb-1">
                  {member.role}
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-bold mb-4">
                  {member.tag}
                </span>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {member.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Us */}
        <section>
          <h2 className="text-3xl font-black text-on-surface mb-12 tracking-tight">
            為什麼選擇我們
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                title: "不是又一個線上課程",
                desc: "我們結合 AI 個人化推薦、講師 AI 助手、和 Discord 學習社群，完成率是傳統課程的 4 倍。",
              },
              {
                num: "02",
                title: "業界實戰講師",
                desc: "講師來自業界第一線，擁有豐富的實戰經驗。他們不只教你理論，更教你如何在真實世界中應用。",
              },
              {
                num: "03",
                title: "24/7 AI 助手",
                desc: "凌晨卡關？講師的 AI 分身隨時回答你的問題，基於課程內容，不是通用答案。",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-surface-container-low p-8 rounded-xl"
              >
                <span className="text-secondary-container text-4xl font-black">
                  {item.num}
                </span>
                <h3 className="text-lg font-bold text-on-surface mt-4 mb-2">
                  {item.title}
                </h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
