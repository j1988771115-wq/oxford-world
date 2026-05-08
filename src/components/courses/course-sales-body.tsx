import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  PlayCircle,
  Lock,
  Star,
  Clock,
  Layers,
  BarChart,
  Award,
  Sparkles,
  Eye,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { COURSE_DISCLAIMER } from "@/lib/constants";
import { CountdownTimer } from "@/components/courses/countdown-timer";
import { FaqAccordion } from "@/components/courses/faq-accordion";
import { InlinePreviewPlayer } from "@/components/courses/inline-preview-player";
import { DynamicPurchaseLink } from "@/components/courses/dynamic-purchase-link";
import { MobileStickyBuyBar } from "@/components/courses/mobile-sticky-buy-bar";

// 行銷頁 Server Component body — 完全 anon ISR friendly,所有 user-aware UI 都收進
// client overlay (DynamicPurchaseLink / MobileStickyBuyBar / InlinePreviewPlayer)。
// 改文案只需動這個檔案,page.tsx 維持薄殼。

type Chapter = {
  id: string;
  title: string;
  sort_order: number;
  takeaway_summary?: string | null;
  duration_seconds?: number | null;
  duration_seconds_bg?: number | null;
  mux_playback_id?: string | null;
  mux_playback_id_bg?: string | null;
  youtube_url?: string | null;
  is_free_preview?: boolean;
};

type Course = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category?: string | null;
  instructor?: string | null;
  thumbnail_url?: string | null;
  price: number;
  original_price?: number | null;
  alumni_price?: number | null;
  sale_ends_at?: string | null;
  pro_bundle_days?: number | null;
  access_type?: string | null;
  is_free_preview?: boolean | null;
  created_at?: string | null;
};

interface Props {
  course: Course;
  chapters: Chapter[];
  studentCount: number;
  firstFreeChapter: Chapter | null;
}

export function CourseSalesBody({
  course,
  chapters,
  studentCount,
  firstFreeChapter,
}: Props) {
  // anon-default effective price(alumni 折扣不在 anon ISR 階段算 — alumni 進來會被
  // CourseAccessProvider client redirect / DynamicPurchaseLink swap 處理)
  const effectivePrice = course.price;
  const isProOnly = course.access_type === "pro";
  const isMasterSpace = course.slug === "master-space-age-capital";
  const onSale =
    course.original_price &&
    course.original_price > effectivePrice &&
    (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date());

  return (
    <main className={cn("pb-20", isMasterSpace && "bg-slate-950")}>
      {/* === Hero 全寬 cinematic banner (太空大師課專用) === */}
      {/* min-h 讓 mobile content 可撐高,避免 hero card stack 後被頂部 nav 遮 */}
      {isMasterSpace && (
        <section className="relative w-full min-h-[70vh] md:min-h-[520px] overflow-hidden">
          <Image
            src="/marketing/hero-master-space-age.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />

          <div className="relative z-10 min-h-[70vh] md:min-h-[520px] flex items-center py-16 md:py-12">
            <div className="max-w-[1440px] mx-auto w-full px-6 md:px-12 grid md:grid-cols-[1fr_auto] gap-8 md:gap-12 items-center">
              {/* 左欄:title + description + instructor */}
              <div className="space-y-5 md:space-y-6 max-w-xl">
                {course.category && (
                  <span className="inline-block px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-200 text-[11px] font-black uppercase tracking-[0.2em] border border-amber-500/30">
                    {course.category}
                  </span>
                )}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
                  {course.title.split("：")[0]}
                  {course.title.includes("：") && (
                    <span className="block mt-2 text-2xl md:text-3xl lg:text-4xl font-bold text-amber-200/90">
                      {course.title.split("：")[1]}
                    </span>
                  )}
                </h1>
                <p className="text-base md:text-lg text-white/85 leading-relaxed">
                  {course.description}
                </p>
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <div className="w-10 h-px bg-amber-300/60" />
                  <p className="text-amber-100 font-medium">
                    {course.instructor} 院長 親授
                  </p>
                  {studentCount > 0 && (
                    <>
                      <span className="text-amber-300/60">·</span>
                      <p className="text-amber-100/80 text-sm">
                        累計 <span className="text-amber-200 font-bold">{studentCount}</span> 位學員加入
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 右欄:倒數 + 價格 + CTA card box */}
              <div className="w-full md:w-[340px] lg:w-[380px] bg-black/50 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 md:p-7 space-y-5 shadow-2xl">
                {course.sale_ends_at && new Date(course.sale_ends_at) > new Date() && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">
                      限時特價結束倒數
                    </p>
                    <CountdownTimer endsAt={course.sale_ends_at} />
                  </div>
                )}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-3xl md:text-4xl font-black text-amber-300 tracking-tight">
                      NT${effectivePrice.toLocaleString()}
                    </span>
                    {onSale && course.original_price && (
                      <span className="text-base text-white/50 line-through">
                        NT${course.original_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {onSale && course.original_price && (
                    <p className="text-xs text-amber-200/80">
                      省 NT${(course.original_price - effectivePrice).toLocaleString()}
                    </p>
                  )}
                </div>
                <DynamicPurchaseLink
                  courseId={course.id}
                  courseSlug={course.slug}
                  effectivePrice={effectivePrice}
                  className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-4 rounded-xl text-base md:text-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                />
                <p className="text-[11px] text-center text-white/50 leading-relaxed">
                  付款後立即解鎖 · 1 年無限觀看
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === 免費試看 section === */}
      {isMasterSpace && firstFreeChapter && (
        <section className="bg-slate-950 py-14 md:py-20">
          <div className="max-w-[1100px] mx-auto px-6 md:px-12">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80 font-bold mb-2">
                  Free Preview
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  先聽聽看課程風格
                </h2>
              </div>
              <p className="text-sm text-white/60 max-w-md">
                不確定要不要買?先看完整第一章再決定。登入即可觀看,不收費。
              </p>
            </div>

            <InlinePreviewPlayer
              chapterId={firstFreeChapter.id}
              chapterTitle={firstFreeChapter.title}
              takeawaySummary={firstFreeChapter.takeaway_summary}
              durationSeconds={firstFreeChapter.duration_seconds}
              thumbnailUrl={course.thumbnail_url || "/covers/main-space-age-capital.png"}
              courseSlug={course.slug}
            />
          </div>
        </section>
      )}

      {/* === 痛點 section === */}
      {isMasterSpace && (
        <section className="bg-slate-950 py-16 md:py-24">
          <div className="max-w-[1100px] mx-auto px-6 md:px-12">
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80 font-bold mb-4">
              The Pain Point
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-12 leading-tight">
              你是不是也卡在這？
            </h2>
            <ul className="grid md:grid-cols-3 gap-6">
              {[
                {
                  num: "01",
                  title: "AI 漲完了，下一波看不出來",
                  body: "市場開始問下一個故事，搜「太空概念股」一堆名詞跳出來。看不出哪家是真材實料、哪家是 hype。",
                },
                {
                  num: "02",
                  title: "看到太空題材想跟，又怕被套",
                  body: "新聞一報就漲，要不要進場？沒框架判斷哪些是 thesis driven、哪些只是被動跟風。",
                },
                {
                  num: "03",
                  title: "想佈局新敘事，但產業看不懂",
                  body: "衛星、發射、數據、國防、月球——5 個次產業競爭結構搞不清，根本下不了手。",
                },
              ].map((p) => (
                <li
                  key={p.num}
                  className="bg-slate-900/60 border border-amber-500/15 rounded-2xl p-6 md:p-7"
                >
                  <p className="text-amber-300/70 font-black text-sm tracking-wider mb-3">
                    {p.num}
                  </p>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-3 leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-sm md:text-base text-white/70 leading-relaxed">
                    {p.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-amber-200/80 text-base md:text-lg mt-10 max-w-2xl">
              這堂課不給你明牌，給你一套自己判斷的框架——讓你接下來十年看到任何太空題材，都知道怎麼拆、怎麼配、怎麼下。
            </p>
          </div>
        </section>
      )}

      {/* === Outcome section === */}
      {isMasterSpace && (
        <section className="bg-slate-900 py-16 md:py-24">
          <div className="max-w-[1100px] mx-auto px-6 md:px-12">
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80 font-bold mb-4">
              What You Get
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3 leading-tight">
              上完這堂課，你會帶走
            </h2>
            <p className="text-base md:text-lg text-white/60 mb-12 max-w-2xl">
              不是名單、不是 hype，是接下來十年都用得上的判斷框架。
            </p>
            <ul className="grid md:grid-cols-2 gap-5">
              {[
                {
                  title: "產業地圖",
                  body: "看懂太空 5 大次產業競爭結構，知道每塊是兆元級市場還是噱頭、誰在哪裡卡住。",
                },
                {
                  title: "個股拆解框架",
                  body: "一套判斷哪家公司值得佈局的標準：財報健康度、護城河厚度、估值落差訊號。",
                },
                {
                  title: "時序判斷",
                  body: "哪些公司現在還是故事、哪些已經有訂單、哪些訂單還在沒人看到——進場時機不靠運氣。",
                },
                {
                  title: "資本配置 framework",
                  body: "從持股比例、加減碼、停損到 exit 的完整邏輯，把太空配置融進你整個資產配置裡。",
                },
              ].map((o) => (
                <li
                  key={o.title}
                  className="bg-slate-950/50 border border-amber-500/20 rounded-2xl p-6 md:p-7 flex gap-5"
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Check size={22} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 leading-snug">
                      {o.title}
                    </h3>
                    <p className="text-sm md:text-base text-white/75 leading-relaxed">
                      {o.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="pt-12 px-8 max-w-[1440px] mx-auto">
        {/* Breadcrumb */}
        <nav className={cn(
          "flex items-center gap-2 text-sm mb-8",
          isMasterSpace ? "text-white/60" : "text-on-surface-variant"
        )}>
          <Link href="/" className={cn(
            "transition-colors",
            isMasterSpace ? "hover:text-amber-300" : "hover:text-secondary"
          )}>
            首頁
          </Link>
          <ChevronRight size={14} />
          <Link
            href="/courses"
            className={cn(
              "transition-colors",
              isMasterSpace ? "hover:text-amber-300" : "hover:text-secondary"
            )}
          >
            課程
          </Link>
          <ChevronRight size={14} />
          <span className={cn(
            "font-medium",
            isMasterSpace ? "text-white" : "text-on-surface"
          )}>{course.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column */}
          <div className={cn(
            "space-y-12",
            isMasterSpace ? "lg:col-span-12" : "lg:col-span-7"
          )}>
            {!isMasterSpace && (
              <header>
                <h1 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-6 leading-tight">
                  {course.title}
                </h1>
                {course.category && (
                  <span className="inline-block px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant text-xs font-bold uppercase tracking-wider mb-4">
                    {course.category}
                  </span>
                )}
                <p className="text-on-surface-variant">
                  講師：{course.instructor}
                </p>
              </header>
            )}

            {!isMasterSpace && (
              <section>
                <h2 className="text-2xl font-bold text-on-surface mb-4">
                  課程簡介
                </h2>
                <p className="text-lg text-on-surface-variant leading-relaxed">
                  {course.description || "課程介紹即將更新。"}
                </p>
              </section>
            )}

            {/* 本課給誰 */}
            <section>
              <h2 className={cn(
                "text-2xl font-bold mb-6",
                isMasterSpace ? "text-white" : "text-on-surface"
              )}>
                這堂課給誰
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className={cn(
                  "rounded-xl p-6",
                  isMasterSpace
                    ? "bg-slate-900/60 border border-emerald-500/20"
                    : "bg-surface-container-lowest border border-outline-variant/30 deep-diffusion"
                )}>
                  <h3 className={cn(
                    "font-bold mb-4 flex items-center gap-2 text-base",
                    isMasterSpace ? "text-emerald-300" : "text-on-surface"
                  )}>
                    <Check size={16} /> 適合
                  </h3>
                  <ul className={cn(
                    "space-y-2.5 text-sm leading-relaxed",
                    isMasterSpace ? "text-white/75" : "text-on-surface-variant"
                  )}>
                    <li>想建立太空產業投資框架的投資者(長線、波段、事件交易都用得上)</li>
                    <li>願意花時間理解產業競爭結構,不只看股票代號</li>
                    <li>有美股下單經驗,想擴張持股版圖到下一個十年</li>
                    <li>對「為什麼 SpaceX 改寫產業」這類大敘事有興趣</li>
                  </ul>
                </div>
                <div className={cn(
                  "rounded-xl p-6",
                  isMasterSpace
                    ? "bg-slate-900/60 border border-rose-500/20"
                    : "bg-surface-container-lowest border border-outline-variant/30 deep-diffusion"
                )}>
                  <h3 className={cn(
                    "font-bold mb-4 flex items-center gap-2 text-base",
                    isMasterSpace ? "text-rose-300" : "text-on-surface"
                  )}>
                    <X size={16} /> 不適合
                  </h3>
                  <ul className={cn(
                    "space-y-2.5 text-sm leading-relaxed",
                    isMasterSpace ? "text-white/75" : "text-on-surface-variant"
                  )}>
                    <li>只想要明牌、不想花時間理解產業邏輯的人</li>
                    <li>期待保證獲利或無風險回報的學員</li>
                    <li>不打算實際投入資金、只想吸收財經新聞的人</li>
                    <li>認為投資課等於「老師說買什麼我就買什麼」的學員</li>
                  </ul>
                </div>
              </div>
              <p className={cn(
                "text-xs mt-4 leading-relaxed",
                isMasterSpace ? "text-white/50" : "text-on-surface-variant"
              )}>
                邊界寫清楚不是嚇你,是希望付費後你看的是真能用的內容。
              </p>
            </section>

            {/* === Module map (太空大師課) / 章節 list (其他) === */}
            {isMasterSpace ? (
              <section>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-white">課程地圖</h2>
                  <p className="text-sm text-white/60">
                    5 個主題 module · {chapters?.length ?? 11} 章影片
                  </p>
                </div>
                <ul className="space-y-4">
                  {[
                    { n: "M1", title: "太空產業全景", desc: "為什麼下一個十年最強敘事是太空,而不是 AI 也不是電動車。資本配置黃金窗口判斷。" },
                    { n: "M2", title: "垂直整合與發射執行", desc: "誰會吃掉整條產業鏈、誰是中型發射執行者的破壞創新——巨頭護城河與夾縫機會的選股邏輯。" },
                    { n: "M3", title: "連線基礎設施", desc: "直連手機與下一代行動通訊的衛星挑戰者:技術 thesis vs 商業 thesis 的落差怎麼看。" },
                    { n: "M4", title: "數據經濟與賣鏟人", desc: "太空數據商業模式 SaaS 化轉型 + 在軌服務太空製造的「賣鏟人」選股邏輯。" },
                    { n: "M5", title: "政策驅動與下一波", desc: "政府訂單型公司的時序風險(月球商業化、國防航太),以及還沒被主流發現的下一波概念。" },
                  ].map((m) => (
                    <li
                      key={m.n}
                      className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-6 flex gap-5 items-start"
                    >
                      <span className="shrink-0 w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center font-black text-amber-300 tabular-nums">
                        {m.n}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                          {m.title}
                        </h3>
                        <p className="text-sm md:text-base text-white/75 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-white/50 mt-5 leading-relaxed">
                  每個 module 含 1-3 章影片,搭配「主影片(久方武院長親錄)+ 背景資料學習」雙軌設計。具體個股 thesis 留給付費學員,在主流發現前先佈局。
                </p>
              </section>
            ) : (
              <section>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-on-surface">課程大綱</h2>
                  {chapters && chapters.length > 0 && (
                    <p className="text-sm text-on-surface-variant">
                      共 {chapters.length} 個章節
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  {chapters && chapters.length > 0 ? (
                    chapters.map((ch, i) => {
                      const isUpcoming = !ch.mux_playback_id && !ch.mux_playback_id_bg && !ch.youtube_url;
                      const totalDur = (ch.duration_seconds || 0) + (ch.duration_seconds_bg || 0);
                      return (
                        <div
                          key={ch.id}
                          className="bg-surface-container-lowest rounded-xl deep-diffusion overflow-hidden flex flex-col sm:flex-row"
                        >
                          <div className="sm:w-[200px] sm:shrink-0 aspect-video sm:aspect-auto relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center overflow-hidden">
                            <div
                              className="absolute inset-0 opacity-25"
                              style={{
                                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.5) 1px, transparent 0)",
                                backgroundSize: "18px 18px",
                              }}
                            />
                            <span className="text-5xl sm:text-6xl font-black text-amber-300/70 tabular-nums tracking-tight relative z-10">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {ch.is_free_preview && (
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                                FREE
                              </span>
                            )}
                            {isUpcoming && (
                              <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-amber-500/90 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                                即將上線
                              </span>
                            )}
                          </div>

                          <div className="flex-1 p-5 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-on-surface leading-snug text-base">
                                  {ch.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-on-surface-variant">
                                  {ch.mux_playback_id && (
                                    <span className="inline-flex items-center gap-1">
                                      <PlayCircle size={12} /> 主影片
                                    </span>
                                  )}
                                  {ch.mux_playback_id_bg && (
                                    <span className="inline-flex items-center gap-1">
                                      <Layers size={12} /> 背景資料
                                    </span>
                                  )}
                                  {totalDur > 0 && (
                                    <span>
                                      · {Math.floor(totalDur / 60)}:
                                      {String(totalDur % 60).padStart(2, "0")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 mt-1">
                                {isUpcoming ? (
                                  <Clock size={18} className="text-amber-700 dark:text-amber-300" />
                                ) : ch.is_free_preview ? (
                                  <PlayCircle size={20} className="text-secondary-container fill-current" />
                                ) : (
                                  <Lock size={18} className="text-on-surface-variant" />
                                )}
                              </div>
                            </div>
                            {ch.takeaway_summary && (
                              <div className="mt-3 pt-3 border-t border-outline-variant/15">
                                <p className="text-sm text-on-surface-variant leading-relaxed">
                                  <span className="text-on-surface font-medium">你會帶走 — </span>
                                  {ch.takeaway_summary}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-surface-container-low p-8 rounded-xl text-center text-on-surface-variant">
                      課程章節即將上線
                    </div>
                  )}
                </div>
              </section>
            )}

            {!isMasterSpace && (
              <section>
                <h2 className="text-2xl font-bold text-on-surface mb-8">
                  學員評價
                </h2>
                <div className="bg-surface-container-low p-8 rounded-xl text-center">
                  <Star size={32} className="text-on-surface-variant/30 mx-auto mb-3" />
                  <p className="text-on-surface-variant">
                    還沒有評價。成為第一個完課並留下評價的學員！
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Right Sidebar — 太空大師課隱藏(Hero 右 card / 你拿到什麼 / 沉式 CTA 已含購買) */}
          <div className={cn(
            "lg:col-span-5",
            isMasterSpace && "hidden"
          )}>
            <div className="sticky top-28 space-y-6">
              <div className="bg-surface-container-lowest rounded-xl overflow-hidden deep-diffusion">
                {/* Video Preview */}
                <Link
                  href={firstFreeChapter ? `/courses/${course.slug}#free-preview` : `#`}
                  className="relative aspect-video group cursor-pointer overflow-hidden block"
                >
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={`《${course.title}》課程縮圖 — ${course.instructor || "牛津視界"}`}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 600px"
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary-container flex items-center justify-center">
                      <PlayCircle size={64} className="text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary-container/40 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                      <PlayCircle size={40} className="text-white fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded text-white text-xs inline-flex items-center gap-2 w-fit">
                    <Eye size={14} />
                    {firstFreeChapter ? "預覽免費試看章節" : "立即購買"}
                  </div>
                </Link>

                <div className="p-8 space-y-6">
                  {/* Price */}
                  <div className="space-y-2">
                    {onSale && (
                      <div className="inline-flex items-center gap-1.5 bg-red-500/15 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        <Sparkles size={10} />
                        {course.sale_ends_at
                          ? (() => {
                              const d = new Date(course.sale_ends_at);
                              return `特價期間 · ${d.getMonth() + 1}/${d.getDate()} 結束`;
                            })()
                          : "特價期間"}
                      </div>
                    )}
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-4xl font-extrabold text-on-surface">
                        {effectivePrice === 0
                          ? "免費"
                          : `NT$${effectivePrice.toLocaleString()}`}
                      </span>
                      {onSale && course.original_price && (
                        <span className="text-xl text-on-surface-variant line-through">
                          NT${course.original_price.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      一次付費 · 1 年無限看 + 之後贈送回看
                      {course.pro_bundle_days && course.pro_bundle_days > 0 ? ` · 加贈 Pro ${course.pro_bundle_days} 天` : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    {isProOnly ? (
                      <DynamicPurchaseLink
                        courseId={course.id}
                        courseSlug={course.slug}
                        effectivePrice={effectivePrice}
                        authenticatedHref="/pricing"
                        authenticatedLabel="進入課程"
                        paidLabel="訂閱 Pro 解鎖"
                        unauthenticatedLabel="登入後訂閱 Pro"
                        className="block w-full text-center bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      />
                    ) : effectivePrice === 0 || course.is_free_preview ? (
                      <DynamicPurchaseLink
                        courseId={course.id}
                        courseSlug={course.slug}
                        effectivePrice={effectivePrice}
                        paidLabel="解鎖觀看"
                        unauthenticatedLabel="免費觀看"
                        className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      />
                    ) : (
                      <DynamicPurchaseLink
                        courseId={course.id}
                        courseSlug={course.slug}
                        effectivePrice={effectivePrice}
                        showPriceInline
                        paidLabel="立即購買"
                        unauthenticatedLabel="登入後購買"
                        className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      />
                    )}
                    {!isProOnly && (
                      <>
                        <Link
                          href="/pricing"
                          className="block w-full text-center border-2 border-secondary py-4 rounded-xl text-secondary font-bold text-sm hover:bg-secondary-fixed/20 transition-colors active:scale-95"
                        >
                          比較 Pro 訂閱方案
                        </Link>
                        <p className="text-xs text-on-surface-variant text-center -mt-1 leading-relaxed">
                          Pro 訂閱不含大師課影片，需另購
                        </p>
                      </>
                    )}
                  </div>

                  {/* Details */}
                  <div className="pt-6 border-t border-outline-variant/30 space-y-4">
                    <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                      課程詳情
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { icon: Layers, label: "章節數", value: `${chapters?.length ?? 10} 章` },
                        {
                          icon: Clock,
                          label: "總時長",
                          value: chapters && chapters.length > 0
                            ? `約 ${(
                                chapters.reduce(
                                  (s: number, c) => s + (c.duration_seconds || 0) + (c.duration_seconds_bg || 0),
                                  0
                                ) / 3600
                              ).toFixed(1)} 小時`
                            : "陸續上線",
                        },
                        { icon: BarChart, label: "難易度", value: "中階課程" },
                        { icon: Award, label: "課程形式", value: "1 年無限看 + 之後贈送" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <item.icon size={20} className="text-secondary" />
                          <div>
                            <p className="text-[10px] text-on-surface-variant font-bold leading-none mb-1">
                              {item.label}
                            </p>
                            <p className="text-sm font-bold text-on-surface">
                              {item.value}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-xl">
                <p className="text-amber-700 dark:text-amber-300 font-black text-xs uppercase tracking-wider mb-3">
                  {COURSE_DISCLAIMER.title} ({COURSE_DISCLAIMER.titleEn})
                </p>
                <div className="space-y-2 text-on-surface-variant text-xs leading-relaxed">
                  {COURSE_DISCLAIMER.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === 講師大幅形象 (太空大師課專用) === */}
      {isMasterSpace && (
        <section className="mt-16 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-20 overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-10 items-center">
            <div className="relative aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 order-2 md:order-1">
              <Image
                src="/covers/main-space-age-capital.png"
                alt={`${course.instructor} 院長`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover object-right"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">
                Course Instructor
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                {course.instructor}
                <span className="block text-xl md:text-2xl text-amber-200/90 font-bold mt-2">
                  牛津視界院長 · 巨石文化負責人
                </span>
              </h2>
              <ul className="flex flex-wrap gap-2 pt-1">
                {[
                  "產官學三棲",
                  "上市櫃輔導",
                  "證券公司副總經理",
                  "財訊資深研究員",
                ].map((cred) => (
                  <li
                    key={cred}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm"
                  >
                    {cred}
                  </li>
                ))}
              </ul>
              <p className="text-base md:text-lg text-white/85 leading-relaxed pt-2">
                專長太空產業與美股微型股投資。
                過去三年深入鑽研太空產業大敘事到下一波概念股的投資 thesis,
                把研究心得拆解成可執行的資本配置框架。
              </p>
              <blockquote className="border-l-2 border-amber-300/60 pl-5 py-2">
                <p className="text-amber-100/90 italic text-base md:text-lg leading-relaxed">
                  「太空不是科幻,是下一個資本配置必修課。」
                </p>
              </blockquote>
            </div>
          </div>
        </section>
      )}

      {/* === 你拿到什麼 + 價格 anchor (太空大師課專用) === */}
      {isMasterSpace && (
        <section className="bg-slate-950 py-16 md:py-24">
          <div className="max-w-[1100px] mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80 font-bold">
                What&apos;s Included
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                你拿到的不只是 9 章影片
              </h2>
              <ul className="space-y-4 text-white/85">
                {[
                  "9 章久方武院長親錄主影片(從產業大圖到個股 thesis)",
                  `${chapters?.length ?? 11} 章背景補充教材(NotebookLM 風格 deep dive)`,
                  "1 年無限觀看 + 期滿後平台贈送繼續回看",
                  "Eyesy AI 助教 24/7 在線,看不懂可隨時問",
                  "完整資本配置 framework,從建倉到 exit 全套邏輯",
                  "太空產業判斷框架,套接下來十年都用得上",
                ].map((line, i) => (
                  <li key={i} className="flex gap-3 text-base md:text-lg leading-relaxed">
                    <Check size={20} className="shrink-0 text-amber-300 mt-1" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-2xl p-8 md:p-10 space-y-6 shadow-2xl">
              {onSale && (
                <div className="inline-flex items-center gap-1.5 bg-red-500/15 text-red-300 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em]">
                  <Sparkles size={12} />
                  限時特價
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-white/60">大師課單次買斷</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  {onSale && course.original_price && (
                    <span className="text-2xl text-white/50 line-through">
                      NT${course.original_price.toLocaleString()}
                    </span>
                  )}
                  <span className="text-5xl md:text-6xl font-black text-amber-300 tracking-tight">
                    NT${effectivePrice.toLocaleString()}
                  </span>
                </div>
                {onSale && course.original_price && (
                  <p className="text-amber-200 font-bold text-sm">
                    省 NT${(course.original_price - effectivePrice).toLocaleString()}
                  </p>
                )}
              </div>
              {course.sale_ends_at && new Date(course.sale_ends_at) > new Date() && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80">
                    特價結束倒數
                  </p>
                  <CountdownTimer endsAt={course.sale_ends_at} />
                </div>
              )}
              <DynamicPurchaseLink
                courseId={course.id}
                courseSlug={course.slug}
                effectivePrice={effectivePrice}
                className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-4 rounded-xl text-base md:text-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              />
              <p className="text-xs text-center text-white/50 leading-relaxed">
                付款後立即解鎖全部章節 · 無下載限制 · 1 年無限觀看
              </p>
              {studentCount > 0 && (
                <p className="text-xs text-center text-amber-200/80 leading-relaxed pt-2 border-t border-white/10">
                  累計 <span className="font-bold text-amber-200">{studentCount}</span> 位學員已加入
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* === FAQ accordion === */}
      {isMasterSpace && (
        <section className="py-16 md:py-24 bg-slate-950">
          <div className="max-w-[800px] mx-auto px-6 md:px-12">
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80 font-bold mb-4">
              Frequently Asked
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-12 leading-tight">
              常見問題
            </h2>
            <FaqAccordion
              variant="dark"
              items={[
                {
                  q: "課程多長?怎麼看?",
                  a: `${chapters?.length ?? 11} 章影片(每章主影片 + 背景補充教材),總時長約 ${
                    chapters && chapters.length > 0
                      ? (
                          chapters.reduce(
                            (s: number, c) =>
                              s + (c.duration_seconds || 0) + (c.duration_seconds_bg || 0),
                            0,
                          ) / 3600
                        ).toFixed(1)
                      : "8-10"
                  } 小時。可在桌面、手機、平板隨時觀看,進度自動同步。`,
                },
                {
                  q: "我可以看多久?",
                  a: "付款後 1 年內無限觀看,期滿後平台贈送繼續回看(此為平台善意,非合約義務)。沒有觀看次數限制、沒有下載限制。",
                },
                {
                  q: "退費政策?",
                  a: "依消費者權益法數位內容例外準則,大師課單次買斷不退費。建議先看免費試看章節確認講師風格再下單。",
                },
                {
                  q: "跟 Pro 訂閱有什麼差別?",
                  a: "大師課是針對單一主題的深度內容(這堂是太空產業),買斷後 1 年無限看。Pro 訂閱(NT$999/月)是平台所有持續更新內容的訂閱權。兩者獨立,可分開買。",
                },
                {
                  q: "不會看財報能上嗎?",
                  a: "可以。課程從產業大敘事切入,逐章帶到個股拆解,財報相關語法會邊講邊解釋。如果完全沒美股經驗,建議先看免費試看章節評估難度。",
                },
                {
                  q: "有試看嗎?",
                  a: "有。第 1 章「先導:為什麼太空是下一個科技週期」開放免費試看,登入即可觀看完整章節。",
                },
                {
                  q: "課程會持續更新嗎?",
                  a: "會。久方武院長持續追蹤太空產業動態,新章節會以「背景資料學習」形式補進來,你購買後可看到所有後續更新。",
                },
              ]}
            />
          </div>
        </section>
      )}

      {/* === 沉式 CTA === */}
      {isMasterSpace && (
        <section className="relative mt-16 w-full overflow-hidden">
          <div className="relative aspect-[3/2] md:aspect-[3/1] min-h-[400px]">
            <Image
              src="/marketing/cta-master-space-age.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6 max-w-3xl space-y-6">
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300/80 font-bold">
                  The Final Call
                </p>
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  在主流醒來前
                  <span className="block mt-2">先佔好你的位置</span>
                </h2>
                <p className="text-base md:text-lg text-white/85 max-w-xl mx-auto">
                  AI 漲完了,大資金正在悄悄佈局太空。每一塊都是兆元級市場,每一塊都還沒擠進主流投資人視野。
                </p>
                {course.sale_ends_at && new Date(course.sale_ends_at) > new Date() && (
                  <div className="pt-2">
                    <CountdownTimer endsAt={course.sale_ends_at} />
                  </div>
                )}
                <div className="pt-4">
                  <DynamicPurchaseLink
                    courseId={course.id}
                    courseSlug={course.slug}
                    effectivePrice={effectivePrice}
                    showPriceInline
                    paidLabel="立即購買"
                    unauthenticatedLabel="登入後購買"
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-8 py-4 rounded-xl text-base md:text-lg shadow-2xl shadow-amber-500/30 active:scale-95 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 手機 sticky bottom buy bar — hasAccess 自動隱藏 */}
      <MobileStickyBuyBar
        courseId={course.id}
        courseSlug={course.slug}
        effectivePrice={effectivePrice}
        originalPrice={course.original_price}
        saleEndsAt={course.sale_ends_at}
        isProOnly={isProOnly}
        isMasterSpace={isMasterSpace}
      />
    </main>
  );
}
