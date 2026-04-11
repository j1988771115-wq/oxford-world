import Link from "next/link";
import {
  Bolt,
  Bot,
  ArrowRight,
  Star,
  Check,
  Sparkles,
  Crown,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { EyesyCTAButton } from "@/components/eyesy/eyesy-cta-button";
import { ChatPreview } from "@/components/eyesy/chat-preview";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { EmailCaptureForm } from "@/components/email-capture-form";
import { getCourses } from "@/lib/actions/courses";

export default async function HomePage() {
  const dbCourses = await getCourses();
  const courses = dbCourses.length > 0 ? dbCourses : [];
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* 1. Hero — 痛點 + CTA */}
      <header className="relative pt-44 pb-32 overflow-hidden bg-primary-container">
        <div className="absolute top-0 right-0 w-1/2 h-full overflow-hidden opacity-40 pointer-events-none">
          <div className="absolute top-1/4 right-[-10%] w-[600px] h-[600px] bg-[#00d2ff] blur-[120px] rounded-full opacity-20" />
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] border border-[#00d2ff]/20 rounded-full rotate-12 scale-150" />
        </div>

        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-fixed/10 text-secondary-container mb-8">
              <Bolt size={14} className="fill-current" />
              <span className="text-xs font-bold tracking-widest uppercase">
                Oxford Academic x Silicon Valley AI
              </span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-8 font-headline">
              AI 時代，
              <br />
              <span className="text-[#00D2FF]">不再當無頭蒼蠅</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mb-12 max-w-xl">
              專為職場菁英打造的個人化學習路徑。透過 AI
              技術精準分析你的職涯缺口，量身定制最高效率的學習藍圖。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/sign-up?plan=pro"
                className="signature-gradient text-white px-8 py-5 rounded-xl font-bold text-lg shadow-xl shadow-secondary/20 hover:scale-[1.02] transition-transform text-center"
              >
                免費試用 Pro 7 天
              </Link>
              <Link
                href="/courses"
                className="bg-transparent border-2 border-slate-700 text-white px-8 py-5 rounded-xl font-bold text-lg hover:bg-white/5 transition-colors text-center"
              >
                瀏覽課程
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Eyesy AI — 核心賣點 + 帶 Pro */}
      <section className="py-32 bg-surface relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant mb-6">
                <Bot size={14} className="fill-current" />
                <span className="text-xs font-bold tracking-widest uppercase">
                  AI-Powered
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-on-surface leading-tight tracking-tight mb-6 font-headline">
                認識 Eyesy，
                <br />
                你的 AI 學習夥伴
              </h2>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
                不只是聊天機器人。Eyesy
                讀過所有講師的教材，能用你聽得懂的方式解釋概念、推薦課程、回答學習路上的每一個問題。
              </p>
              <div className="space-y-4 mb-8">
                {[
                  "24/7 隨時在線，不用等講師回覆",
                  "基於課程內容回答，不是罐頭答案",
                  "記住你的進度，給你個人化建議",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={18} className="text-green-500 shrink-0" />
                    <span className="text-on-surface-variant text-sm">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pro callout */}
              <div className="bg-secondary-fixed/10 border border-secondary/20 rounded-xl p-5 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-secondary" />
                  <span className="text-sm font-bold text-secondary">
                    Pro 會員專屬
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Pro 會員享有 Eyesy AI
                  助教、個人化學習路徑、市場分析報告。免費試用 7 天，隨時取消。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <EyesyCTAButton />
                <Link
                  href="/quiz"
                  className="border-2 border-outline-variant/30 text-on-surface px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-low transition-colors text-center"
                >
                  AI 學習路徑測驗
                </Link>
              </div>
            </div>

            {/* Chat Preview — animated */}
            <div className="hidden md:block">
              <ChatPreview />
            </div>
          </div>
        </div>
      </section>

      {/* 學員回饋 */}
      <section className="py-20 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "老師會補充很多相關內容，DC 也能隨時討論，學習不再孤單。整體體驗非常好！",
                name: "K 同學",
                role: "第一期區塊鏈學員",
                rating: 10,
              },
              {
                quote: "五天密集訓練效果最好，課程內容扎實，感謝 YC 老師跟行政團隊的努力。",
                name: "W 同學",
                role: "第一期區塊鏈學員",
                rating: 9,
              },
              {
                quote: "課後馬上就能動手做 side project，這種實戰感是看影片學不到的。",
                name: "L 同學",
                role: "軟體工程師",
                rating: 9,
              },
            ].map((t, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-xl p-8 deep-diffusion flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star
                      key={j}
                      size={14}
                      className="text-amber-500 fill-amber-500"
                    />
                  ))}
                </div>
                <p className="text-on-surface text-sm leading-relaxed flex-1 mb-6">
                  「{t.quote}」
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/20">
                  <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center">
                    <span className="text-on-secondary-fixed-variant font-bold text-xs">
                      {t.name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-on-surface text-sm font-bold">
                      {t.name}
                    </p>
                    <p className="text-on-surface-variant text-xs">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 課程預覽 */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-black text-on-surface mb-4 font-headline tracking-tight">
                精選課程
              </h2>
              <p className="text-on-surface-variant text-lg">
                從 Vibe Coding 到投資趨勢，跨領域的 AI 賦能計畫
              </p>
            </div>
            <Link
              href="/courses"
              className="text-secondary font-bold flex items-center gap-2 hover:underline underline-offset-8 transition-all"
            >
              查看全部課程 <ArrowRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {courses.map(
              (course: {
                id: string;
                slug: string;
                title: string;
                description: string;
                price: number;
                thumbnail_url?: string;
                thumbnail?: string;
                category?: string;
                level?: string;
                rating?: number;
              }) => (
                <Link
                  key={course.id}
                  href={`/courses/${course.slug}`}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden group deep-diffusion"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <div className="absolute inset-0 signature-gradient opacity-20" />
                    {course.thumbnail_url || course.thumbnail ? (
                      <img
                        src={course.thumbnail_url || course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full signature-gradient opacity-40" />
                    )}
                    {course.level && (
                      <div className="absolute top-4 left-4 bg-primary-container text-[#00D2FF] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">
                        {course.level}
                      </div>
                    )}
                  </div>
                  <div className="p-8">
                    <h4 className="text-xl font-bold text-on-surface mb-2 group-hover:text-secondary transition-colors">
                      {course.title}
                    </h4>
                    <p className="text-on-surface-variant text-sm line-clamp-2 mb-6">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between pt-6 border-t border-outline-variant/30">
                      <span className="text-2xl font-black text-on-surface tracking-tight">
                        NT$ {course.price.toLocaleString()}
                      </span>
                      {course.rating && (
                        <div className="flex items-center gap-1 text-on-surface-variant">
                          <Star size={14} className="fill-current" />
                          <span className="text-sm font-bold">
                            {course.rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* 4. Pro 方案 — 轉換 */}
      <section className="py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-on-surface mb-4 font-headline tracking-tight">
              選擇你的學習方案
            </h2>
            <p className="text-on-surface-variant text-lg">
              免費開始，Pro 解鎖全部潛力
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {/* 免費 */}
            <div className="bg-surface-container-lowest rounded-xl p-10 flex flex-col h-full border border-transparent hover:border-surface-container-high transition-all deep-diffusion">
              <div className="mb-8">
                <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest mb-2">
                  免費
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-on-surface">
                    NT$0
                  </span>
                </div>
              </div>
              <div className="space-y-5 mb-10 flex-grow">
                {[
                  "免費課程試看",
                  "AI 工具分享文章",
                  "Email 訂閱週報",
                  "討論區參與",
                  "等級升級（慢速）",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={18} className="text-green-500" />
                    <span className="text-on-surface text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/sign-up"
                className="block w-full py-4 rounded-xl font-bold bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors active:scale-[0.98] text-center"
              >
                免費註冊
              </Link>
            </div>

            {/* Pro */}
            <div className="relative bg-surface-container-lowest rounded-xl p-10 flex flex-col h-full border-2 border-secondary-container shadow-[0_24px_48px_-12px_rgba(13,28,50,0.12)] scale-105 z-10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-secondary-container text-[#0A192F] text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                最受歡迎
              </div>
              <div className="mb-8">
                <h3 className="text-secondary font-bold text-sm uppercase tracking-widest mb-2">
                  Pro
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-on-surface">
                    NT$999
                  </span>
                  <span className="text-on-surface-variant text-sm">/ 月</span>
                </div>
                <p className="text-secondary text-xs font-bold mt-2">
                  前 7 天免費試用
                </p>
              </div>
              <div className="space-y-5 mb-10 flex-grow">
                {[
                  "Vibe Coding 全系列課程",
                  "市場分析報告",
                  "Eyesy AI 助教",
                  "個人化學習路徑",
                  "Discord 社群",
                  "副本解鎖（工作坊、圓桌）",
                  "等級升級（加速）",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check
                      size={18}
                      className={
                        i < 3 ? "text-secondary" : "text-green-500"
                      }
                    />
                    <span className="text-on-surface text-sm font-medium">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/sign-up?plan=pro"
                className="block w-full py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity active:scale-[0.98] text-center"
              >
                免費試用 7 天
              </Link>
              <p className="text-center text-xs text-on-surface-variant mt-3">
                年繳 NT$9,990 省 17% · 隨時可取消
              </p>
            </div>

            {/* 大師課 */}
            <div className="bg-surface-container-lowest rounded-xl p-10 flex flex-col h-full border border-transparent hover:border-surface-container-high transition-all deep-diffusion">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">
                    大師課
                  </h3>
                  <Crown size={16} className="text-amber-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-on-surface">
                    依課程定價
                  </span>
                </div>
                <p className="text-on-surface-variant text-xs mt-2">
                  單課買斷，永久觀看
                </p>
              </div>
              <div className="space-y-5 mb-10 flex-grow">
                {[
                  "頂尖講師深度課程",
                  "投資趨勢 × 產業分析",
                  "一次付費，終身回看",
                  "不定期更新補充教材",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={18} className="text-amber-500" />
                    <span className="text-on-surface text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/courses"
                className="block w-full py-4 rounded-xl font-bold bg-surface-container-highest text-on-surface hover:bg-surface-dim transition-colors active:scale-[0.98] text-center"
              >
                瀏覽大師課
              </Link>
            </div>
          </div>

          {/* Trust */}
          <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 opacity-60">
            <div className="flex items-center gap-2 text-on-surface">
              <ShieldCheck size={20} />
              <span className="text-sm font-bold">安全支付</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface">
              <RefreshCw size={20} />
              <span className="text-sm font-bold">Pro 7 天免費試用</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Newsletter — 留住免費仔 */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="bg-primary-container rounded-3xl p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-[-50%] left-[-10%] w-[500px] h-[500px] bg-[#00d2ff] blur-[100px] rounded-full opacity-10" />
            <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <h2 className="text-4xl font-black text-white mb-6 font-headline tracking-tight leading-tight">
                  訂閱 AI 趨勢週報，
                  <br />
                  成為走在最前面的 1%
                </h2>
                <p className="text-slate-400 text-lg mb-0">
                  每週五發送。專注於實際應用、商業變現與全球最新技術動態。
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <EmailCaptureForm />
                <p className="text-slate-500 text-xs text-center md:text-left">
                  * 我們尊重您的隱私，隨時可以取消訂閱。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
