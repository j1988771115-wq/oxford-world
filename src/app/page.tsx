import Link from "next/link";
import { Bolt, Mail, Tv, Users, Route, Bot, Users as Groups, ArrowRight, Star } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { EmailCaptureForm } from "@/components/email-capture-form";
import { DEMO_COURSES } from "@/lib/ui-data";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero Section */}
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
              技術精準分析你的職涯缺口，量身定制最高效率的學習藍圖，讓你從容應對變革。
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/quiz"
                className="signature-gradient text-white px-8 py-5 rounded-xl font-bold text-lg shadow-xl shadow-secondary/20 hover:scale-[1.02] transition-transform text-center"
              >
                免費測驗
                <br />
                找到你的學習路徑
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

      {/* Social Proof Bar */}
      <section className="bg-surface-container-low py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-wrap justify-between items-center gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            {[
              { icon: Mail, value: "700+", label: "email subscribers" },
              { icon: Tv, value: "1000+", label: "live stream viewers" },
              { icon: Users, value: "2萬+", label: "community members" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
                  <item.icon
                    className="text-secondary fill-current"
                    size={20}
                  />
                </div>
                <div>
                  <div className="text-on-surface font-bold text-lg">
                    {item.value}
                  </div>
                  <div className="text-on-surface-variant text-xs">
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
            <div className="hidden lg:block h-8 w-[1px] bg-outline-variant opacity-30" />
            <div className="text-on-surface-variant font-medium text-sm tracking-wider">
              TRUSTED BY PROFESSIONALS ACROSS ASIA
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: Route,
                title: "AI 個人化路徑",
                desc: "不只是看影片，我們的 AI 會根據您的背景與目標，動態調整學習內容，確保每一分鐘都在解決您的核心痛點。",
              },
              {
                icon: Bot,
                title: "講師 AI 助手",
                desc: "24/7 在線的高階顧問。結合課程講師的核心思維，隨時回答您在應用 AI 工具時遇到的技術難題。",
              },
              {
                icon: Groups,
                title: "同儕社群",
                desc: "與來自科技、金融、諮詢業的同儕共同協作。透過實戰專案累積真實的人脈與數位影響力。",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-surface-container-lowest p-10 rounded-xl deep-diffusion transition-all duration-300 hover:-translate-y-2"
              >
                <div className="w-16 h-16 rounded-2xl signature-gradient flex items-center justify-center mb-8 shadow-lg shadow-secondary/30">
                  <feature.icon className="text-white" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-on-surface mb-4 font-headline">
                  {feature.title}
                </h3>
                <p className="text-on-surface-variant leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Preview */}
      <section className="py-32 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-4xl font-black text-on-surface mb-4 font-headline tracking-tight">
                精選課程
              </h2>
              <p className="text-on-surface-variant text-lg">
                從基礎到進階，全方位的 AI 賦能計畫
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
            {DEMO_COURSES.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="bg-surface-container-lowest rounded-xl overflow-hidden group deep-diffusion"
              >
                <div className="aspect-video relative overflow-hidden">
                  <div className="absolute inset-0 signature-gradient opacity-20" />
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
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
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-32 bg-surface">
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
