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

// 行銷首頁 ISR — 每 60 秒重生成,跨海 lambda 不必每次跑
export const revalidate = 60;

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
              太空時代的資本配置
              <br />
              <span className="text-[#00D2FF]">下一個十年的產業革命</span>
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mb-12 max-w-xl">
              久方武院長親授 · 10 章深度拆解<br />
              從 SpaceX 大敘事到 8 隻精選美股，一套完整投資框架
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/courses/master-space-age-capital"
                className="signature-gradient text-white px-8 py-5 rounded-xl font-bold text-lg shadow-xl shadow-secondary/20 hover:scale-[1.02] transition-transform text-center"
              >
                立即購買 NT$24,900
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
                課程內 AI 助教
                <br />
                Eyesy 隨時待命
              </h2>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
                購買大師課後，Eyesy
                讀過完整課程教材，能基於講師原話幫你深入提問、複習重點、回答你不敢在直播問的細節。
              </p>
              <div className="space-y-4 mb-8">
                {[
                  "24/7 隨時在線，不用等下次直播",
                  "基於講師原話回答，不是 ChatGPT 罐頭",
                  "記住你看到哪一章，給你個人化複習",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check size={18} className="text-green-500 shrink-0" />
                    <span className="text-on-surface-variant text-sm">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bundle callout */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                    購買大師課加贈
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  購買「太空時代的資本配置」自動加贈 90 天 Pro 訂閱：Eyesy AI 助教全範圍開放、Pro 限定週更內容、Discord 學員專屬頻道。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/courses/master-space-age-capital"
                  className="signature-gradient text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition-transform text-center"
                >
                  查看大師課
                </Link>
                <Link
                  href="/pricing"
                  className="border-2 border-outline-variant/30 text-on-surface px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-low transition-colors text-center"
                >
                  比較 Pro 訂閱
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
                role: "牛津視界學員",
                rating: 10,
              },
              {
                quote: "五天密集訓練效果最好，課程內容扎實，感謝講師跟行政團隊的努力。",
                name: "W 同學",
                role: "牛津視界學員",
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
                美股太空科技到 AI 趨勢，由業界院長親自拆解
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

      {/* 4. 方案 — 轉換 */}
      <section className="py-32 bg-surface">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-on-surface mb-4 font-headline tracking-tight">
              選擇你的方案
            </h2>
            <p className="text-on-surface-variant text-lg">
              大師課單堂買斷 · Pro 月費吃所有持續更新內容
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* 大師課（主推） */}
            <div className="relative bg-surface-container-lowest rounded-2xl border-2 border-amber-500/40 shadow-[0_24px_48px_-12px_rgba(13,28,50,0.18)] flex flex-col overflow-hidden">
              <div className="bg-amber-500 text-white text-center py-2.5 text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <Sparkles size={12} />
                限時特價 · 5/14 結束
              </div>
              <div className="p-10 flex flex-col flex-1">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.18em] mb-4">
                    <Crown size={11} />
                    大師課
                  </div>
                  <h3 className="text-on-surface font-bold text-2xl mb-2 leading-snug">
                    太空時代的資本配置
                  </h3>
                  <p className="text-on-surface-variant text-sm mb-6">
                    久方武院長親授 · 10 章深度拆解美股太空標的
                  </p>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-xl text-on-surface-variant line-through">
                      NT$30,000
                    </span>
                    <span className="text-4xl font-black text-on-surface tracking-tight">
                      NT$24,900
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-xs">
                    一次付費 · 終身觀看 · 加贈 Pro 90 天
                  </p>
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {[
                    "10 章深度課程內容",
                    "SpaceX 等大敘事 + 8 隻精選個股",
                    "完整資本配置實戰框架",
                    "永久回看 + 不定期補充",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check size={18} className="text-amber-500 flex-shrink-0" />
                      <span className="text-on-surface text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/courses/master-space-age-capital"
                  className="block w-full py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition-opacity active:scale-[0.98] text-center"
                >
                  立即購買
                </Link>
              </div>
            </div>

            {/* Pro 訂閱 */}
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col overflow-hidden">
              <div className="py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant text-center border-b border-outline-variant/20">
                訂閱方案
              </div>
              <div className="p-10 flex flex-col flex-1">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 bg-surface-container text-on-surface-variant text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.18em] mb-4">
                    Pro
                  </div>
                  <h3 className="text-on-surface font-bold text-2xl mb-2 leading-snug">
                    Pro 訂閱
                  </h3>
                  <p className="text-on-surface-variant text-sm mb-6">
                    月付制 · 持續內容 + AI 助教
                  </p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black text-on-surface tracking-tight">
                      NT$999
                    </span>
                    <span className="text-on-surface-variant text-sm">/月</span>
                  </div>
                  <p className="text-on-surface-variant text-xs">
                    隨時可取消 · 下次扣款日前生效
                  </p>
                </div>
                <div className="space-y-3 mb-8 flex-1">
                  {[
                    "週更影片 + 文章持續發佈",
                    "AI 助教 Eyesy 全範圍開放",
                    "Discord 學員專屬頻道",
                    "Pro 限定電子報",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check size={18} className="text-on-surface-variant flex-shrink-0" />
                      <span className="text-on-surface text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/pricing"
                  className="block w-full py-4 rounded-xl font-bold text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors active:scale-[0.98] text-center border border-outline-variant/30"
                >
                  了解 Pro 方案
                </Link>
              </div>
            </div>
          </div>

          {/* Trust */}
          <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 opacity-60">
            <div className="flex items-center gap-2 text-on-surface">
              <ShieldCheck size={20} />
              <span className="text-sm font-bold">藍新金流 · 安全支付</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface">
              <RefreshCw size={20} />
              <span className="text-sm font-bold">一次購買 · 終身觀看</span>
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
