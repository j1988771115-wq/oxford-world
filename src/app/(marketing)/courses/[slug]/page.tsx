import { notFound, redirect } from "next/navigation";
import { getCourseBySlug } from "@/lib/actions/courses";
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
import { hasCourseAccess } from "@/lib/access";
import { CountdownTimer } from "@/components/courses/countdown-timer";
import { FaqAccordion } from "@/components/courses/faq-accordion";

// ISR:課程詳情頁 60 秒 cache,改 DB 後最多 60 秒生效,TTFB ~50ms vs 1.3s
export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};
  const title = `${course.title} — 牛津視界`;
  const desc = course.description?.slice(0, 160) || "";
  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      locale: "zh_TW",
      url: `https://oxford-vision.com/courses/${course.slug}`,
      // 優先用 public/og/courses/{slug}.png 靜態檔(設計師版 / AI 生成版),
      // 沒檔的課程才走 /og/courses/{slug} 動態 ImageResponse fallback
      images: [{ url: `/og/courses/${course.slug}.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [`/og/courses/${course.slug}.png`],
    },
    alternates: { canonical: `https://oxford-vision.com/courses/${course.slug}` },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  // 並行打 user auth + chapters + student count(不互相依賴),省 ~150ms TTFB
  const [userResult, chaptersResult, accessCountResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("course_chapters")
      .select("*")
      .eq("course_id", course.id)
      .order("sort_order", { ascending: true }),
    // 學員人數 trust signal,只計 purchased(排除贈與 / 試讀)
    supabase
      .from("course_access")
      .select("*", { count: "exact", head: true })
      .eq("course_id", course.id)
      .eq("access_type", "purchased"),
  ]);
  const user = userResult.data.user;
  const userId = user?.id ?? null;
  const studentCount = accessCountResult.count ?? 0;

  // 一次抓 profile(含 tier + is_alumni),tier=pro 直接 hasAccess,
  // 否則才查 course_access — 砍掉 checkCourseAccess 內重複的 auth.getUser
  let hasAccess = false;
  let isAlumni = false;
  let profileId: string | null = null;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, tier, is_alumni")
      .eq("auth_id", userId)
      .maybeSingle();
    if (profile) {
      profileId = profile.id as string;
      isAlumni = !!profile.is_alumni;
      // 走 hasCourseAccess — 支援買斷 + Pro 訂閱兩種模型
      hasAccess = await hasCourseAccess(supabase, profile.id, course.id);
    }
  }

  // 已購買 → 直接帶到收看頁,不停在銷售頁
  if (hasAccess) {
    redirect(`/learn/${course.id}`);
  }

  // Legacy course gate: non-alumni can't see legacy-* pages
  const isLegacy = course.slug?.startsWith("legacy-");
  if (isLegacy && !isAlumni && !hasAccess) {
    notFound();
  }

  // Compute effective price for display
  const hasAlumniDiscount =
    isAlumni &&
    course.alumni_price !== null &&
    course.alumni_price !== undefined &&
    course.alumni_price < course.price;
  const effectivePrice = hasAlumniDiscount ? course.alumni_price : course.price;
  const isProOnly = course.access_type === "pro";

  // chapters 已在 Promise.all 取得
  const { data: chapters } = chaptersResult;

  // 找第一個免費試看章節 — 訪客 / 未購買者用此 link 試看
  const firstFreeChapter = (chapters || []).find(
    (ch: { is_free_preview?: boolean; mux_playback_id?: string | null }) =>
      ch.is_free_preview && ch.mux_playback_id
  );

  // 抓最近一次有進度的章節（讓 CTA 變「繼續學習」）
  let resumeChapterId: string | null = null;
  let resumePosition = 0;
  let resumeChapterTitle: string | null = null;
  if (hasAccess && profileId) {
    {
      const { data: lastProgress } = await supabase
        .from("course_progress")
        .select("chapter_id, last_position_seconds, completed")
        .eq("user_id", profileId)
        .eq("course_id", course.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (
        lastProgress &&
        lastProgress.last_position_seconds > 5 &&
        !lastProgress.completed
      ) {
        resumeChapterId = lastProgress.chapter_id;
        resumePosition = lastProgress.last_position_seconds;
        const ch = chapters?.find((c: any) => c.id === resumeChapterId);
        resumeChapterTitle = ch?.title ?? null;
      }
    }
  }

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  }

  // Course JSON-LD(SEO 富結果 + AEO 引用必備)
  const courseUrl = `https://oxford-vision.com/courses/${course.slug}`;
  const totalDurationSec = (chapters || []).reduce(
    (sum: number, c: { duration_seconds?: number | null }) => sum + (c.duration_seconds || 0),
    0
  );
  const totalDurationISO =
    totalDurationSec > 0 ? `PT${Math.floor(totalDurationSec / 60)}M` : undefined;
  const courseJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description,
    url: courseUrl,
    inLanguage: "zh-TW",
    provider: {
      "@type": "Organization",
      name: "牛津視界 Oxford Vision",
      sameAs: "https://oxford-vision.com",
    },
    offers: {
      "@type": "Offer",
      price: String(course.price),
      priceCurrency: "TWD",
      availability: "https://schema.org/InStock",
      url: courseUrl,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: totalDurationISO,
    },
  };
  if (course.instructor) {
    courseJsonLd.instructor = { "@type": "Person", name: course.instructor };
  }
  if (chapters && chapters.length > 0) {
    courseJsonLd.numberOfCredits = chapters.length;
    courseJsonLd.syllabusSections = chapters.map(
      (ch: { sort_order: number; title: string; takeaway_summary?: string | null }) => ({
        "@type": "Syllabus",
        name: `第 ${ch.sort_order} 章 ${ch.title}`,
        description: ch.takeaway_summary || undefined,
      })
    );
  }

  // BreadcrumbList JSON-LD (Google 麵包屑富結果)
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: "https://oxford-vision.com" },
      { "@type": "ListItem", position: 2, name: "課程", item: "https://oxford-vision.com/courses" },
      { "@type": "ListItem", position: 3, name: course.title, item: courseUrl },
    ],
  };

  // VideoObject JSON-LD per chapter — Google Video search + AI 引用
  type ChapterMeta = {
    id: string;
    sort_order: number;
    title: string;
    takeaway_summary?: string | null;
    duration_seconds?: number | null;
    mux_playback_id?: string | null;
    is_free_preview?: boolean;
  };
  const videoObjects = ((chapters || []) as ChapterMeta[])
    .filter((c) => c.mux_playback_id)
    .map((c) => ({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `第 ${c.sort_order} 章 ${c.title}`,
      description: c.takeaway_summary || course.description || course.title,
      thumbnailUrl: course.thumbnail_url ? [course.thumbnail_url] : undefined,
      uploadDate: course.created_at,
      duration: c.duration_seconds ? `PT${Math.floor(c.duration_seconds / 60)}M${c.duration_seconds % 60}S` : undefined,
      contentUrl: `https://stream.mux.com/${c.mux_playback_id}.m3u8`,
      embedUrl: `https://oxford-vision.com/learn/${course.id}?chapter=${c.id}&part=main`,
      publisher: { "@type": "Organization", name: "牛津視界 Oxford Vision", logo: { "@type": "ImageObject", url: "https://oxford-vision.com/icon.png" } },
      isAccessibleForFree: !!c.is_free_preview,
    }));

  // HowTo schema — 把 9 章學習路徑做成「How to invest in space industry」步驟結構
  // AI 引用「太空投資怎麼學」會直接拉這條
  const howToJsonLd = chapters && chapters.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `如何系統化建立太空產業投資框架(透過《${course.title}》)`,
    description: `${course.instructor || "久方武"}院長帶你 9 章建立評估太空微型股的投資框架,從產業結構、龍頭分析到政策週期。`,
    image: course.thumbnail_url ? [course.thumbnail_url] : undefined,
    totalTime: totalDurationISO,
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "TWD",
      value: String(course.price),
    },
    supply: [
      { "@type": "HowToSupply", name: "美股下單帳戶" },
      { "@type": "HowToSupply", name: "投資資金(自負盈虧能力範圍內)" },
    ],
    tool: [
      { "@type": "HowToTool", name: "AI 助教 Eyesy(課程內提供)" },
    ],
    step: chapters.map((ch: { sort_order: number; title: string; takeaway_summary?: string | null }) => ({
      "@type": "HowToStep",
      position: ch.sort_order,
      name: ch.title,
      text: ch.takeaway_summary || `第 ${ch.sort_order} 章 ${ch.title}`,
      url: `${courseUrl}#chapter-${ch.sort_order}`,
    })),
  } : null;

  // 課程專屬 FAQ — 太空產業 + 投資相關問題
  const courseFaqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `《${course.title}》適合什麼樣的學員？`,
        acceptedAnswer: { "@type": "Answer", text: "想建立太空產業投資框架的投資者(長線、波段、事件交易都用得上)、有美股下單經驗想擴張持股版圖、對 SpaceX 改寫產業這類大敘事有興趣的人。不適合只想要明牌、期待保證獲利、不打算實際投入資金的學員。" },
      },
      {
        "@type": "Question",
        name: "課程涵蓋哪些太空產業相關標的？",
        acceptedAnswer: { "@type": "Answer", text: "課程深度討論垂直整合龍頭(火箭實驗室)、銥衛星國防通訊(IRDM)、AST SpaceMobile 的衛星直連手機革命、Firefly Aerospace 機動性發射、Globalstar 巨頭夾縫策略、Planet Labs 太空數據經濟、Redwire 太空基建、Intuitive Machines 月球商業化等微型太空股的產業競爭結構。" },
      },
      {
        "@type": "Question",
        name: "課程多長時間？可以重複觀看嗎？",
        acceptedAnswer: { "@type": "Answer", text: `共 ${chapters?.length || 9} 章節,主課程約 2 小時、每章另附 NotebookLM 背景對談,合計約 3 小時內容。一次付費 NT$${course.price.toLocaleString()} 享 1 年無限觀看權限(期滿後平台贈送繼續回看),可重複回看,加贈 90 天 Pro 訂閱(享 AI 助教 Eyesy 深度模式)。` },
      },
      {
        "@type": "Question",
        name: "為什麼太空產業現在是好的投資時機？",
        acceptedAnswer: { "@type": "Answer", text: "SpaceX 把入軌成本從 1 億美金壓到 67 萬美金、太空變成可商業化產業;NASA Artemis 月球計畫 + Space Force 國防需求 + 直連手機通訊三大方向都有明確政策驅動,微型股 IPO 給散戶第一次系統性參與機會。久老師講解產業結構與評估框架,協助辨別哪些公司會是十年贏家。" },
      },
      {
        "@type": "Question",
        name: "誰是久方武院長？",
        acceptedAnswer: { "@type": "Answer", text: "久方武是巨石文化負責人 + 牛津視界院長,長期關注科技與資本市場交集、研究產業競爭結構與長期價值。除了《太空時代的資本配置》,也在牛津視界發布多元 AI 與創投主題內容。" },
      },
    ],
  };

  // Hero 是不是太空大師課:這支用 cinematic banner;其他課程後續再補
  const isMasterSpace = course.slug === "master-space-age-capital";

  return (
    <main className="pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseFaqJsonLd) }}
      />
      {howToJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
        />
      )}
      {videoObjects.map((vo, i) => (
        <script
          key={`video-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(vo) }}
        />
      ))}

      {/* === Hero 全寬 cinematic banner (太空大師課專用) === */}
      {isMasterSpace && (
        <section className="relative w-full h-[70vh] min-h-[520px] overflow-hidden">
          <Image
            src="/marketing/hero-master-space-age.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Dark gradient overlay 讓文字可讀 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30" />

          <div className="relative z-10 h-full flex items-center py-12 md:py-0">
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

              {/* 右欄:倒數 + 價格 + CTA card box(桌面側欄、手機 stack 在下方)*/}
              <div className="w-full md:w-[340px] lg:w-[380px] bg-black/50 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 md:p-7 space-y-5 shadow-2xl">
                {course.sale_ends_at && new Date(course.sale_ends_at) > new Date() && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">
                      限時特價結束倒數
                    </p>
                    <CountdownTimer endsAt={course.sale_ends_at} />
                  </div>
                )}
                {!hasAccess && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-3xl md:text-4xl font-black text-amber-300 tracking-tight">
                        NT${effectivePrice.toLocaleString()}
                      </span>
                      {course.original_price &&
                        course.original_price > effectivePrice &&
                        (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                          <span className="text-base text-white/50 line-through">
                            NT${course.original_price.toLocaleString()}
                          </span>
                        )}
                    </div>
                    {course.original_price &&
                      course.original_price > effectivePrice &&
                      (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                        <p className="text-xs text-amber-200/80">
                          省 NT${(course.original_price - effectivePrice).toLocaleString()}
                        </p>
                      )}
                  </div>
                )}
                {hasAccess ? (
                  <Link
                    href={`/learn/${course.id}`}
                    className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-4 rounded-xl text-base md:text-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    進入課程
                  </Link>
                ) : (
                  <Link
                    href={
                      userId
                        ? `/checkout?type=course&courseId=${course.id}`
                        : `/sign-in?redirect=/courses/${course.slug}`
                    }
                    className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-4 rounded-xl text-base md:text-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    {userId ? "立即購買" : "登入後購買"}
                  </Link>
                )}
                <p className="text-[11px] text-center text-white/50 leading-relaxed">
                  付款後立即解鎖 · 1 年無限觀看
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* === 免費試看 section (太空大師課專用,有 firstFreeChapter 才顯示) === */}
      {isMasterSpace && firstFreeChapter && !hasAccess && (
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

            <Link
              href={
                userId
                  ? `/learn/${course.id}?chapter=${firstFreeChapter.id}&part=main`
                  : `/sign-in?redirect=/learn/${course.id}?chapter=${firstFreeChapter.id}%26part=main`
              }
              className="group block bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 overflow-hidden transition-all"
            >
              <div className="grid md:grid-cols-[1.6fr_1fr] gap-0 items-stretch">
                {/* Left:visual block (大塊章節 visual) */}
                <div className="relative aspect-video md:aspect-auto md:min-h-[260px] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 overflow-hidden">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.5) 1px, transparent 0)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-amber-500 group-hover:bg-amber-400 group-hover:scale-110 flex items-center justify-center shadow-2xl shadow-amber-500/40 transition-all">
                      <PlayCircle size={44} className="text-slate-950 fill-current" />
                    </div>
                  </div>
                  <span className="absolute top-4 left-4 px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                    FREE
                  </span>
                </div>
                {/* Right:章節資訊 */}
                <div className="p-7 md:p-8 flex flex-col justify-center space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">
                    第 1 章 · 免費試看
                  </p>
                  <h3 className="text-xl md:text-2xl font-black text-white leading-snug">
                    {firstFreeChapter.title}
                  </h3>
                  {firstFreeChapter.duration_seconds && (
                    <p className="text-sm text-white/60">
                      時長約 {Math.floor(firstFreeChapter.duration_seconds / 60)} 分鐘
                    </p>
                  )}
                  <p className="text-sm md:text-base text-white/75 leading-relaxed">
                    {firstFreeChapter.takeaway_summary
                      ? firstFreeChapter.takeaway_summary.slice(0, 100) + "…"
                      : "看久方武院長親自講解,先抓到課程風格再決定要不要全課。"}
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 text-amber-300 font-bold group-hover:gap-3 transition-all">
                      {userId ? "立即試看" : "登入後試看"}
                      <ChevronRight size={18} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* === 痛點 section (太空大師課專用) === */}
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

      {/* === Outcome section (太空大師課專用) === */}
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
      <nav className="flex items-center gap-2 text-on-surface-variant text-sm mb-8">
        <Link href="/" className="hover:text-secondary transition-colors">
          首頁
        </Link>
        <ChevronRight size={14} />
        <Link
          href="/courses"
          className="hover:text-secondary transition-colors"
        >
          課程
        </Link>
        <ChevronRight size={14} />
        <span className="text-on-surface font-medium">{course.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-12">
          {/* 非太空大師課 fallback:沒 hero 時顯示 header */}
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

          {/* 課程簡介:hero 已展示 description,只在非 hero 頁顯示 */}
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

          {/* 本課給誰 — 邊界設定，過濾錯誤期待 */}
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-6">
              這堂課給誰
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 deep-diffusion">
                <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2 text-base">
                  <Check size={16} className="text-on-surface-variant" /> 適合
                </h3>
                <ul className="space-y-2.5 text-sm text-on-surface-variant leading-relaxed">
                  <li>想建立太空產業投資框架的投資者(長線、波段、事件交易都用得上)</li>
                  <li>願意花時間理解產業競爭結構,不只看股票代號</li>
                  <li>有美股下單經驗,想擴張持股版圖到下一個十年</li>
                  <li>對「為什麼 SpaceX 改寫產業」這類大敘事有興趣</li>
                </ul>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 deep-diffusion">
                <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2 text-base">
                  <X size={16} className="text-on-surface-variant" /> 不適合
                </h3>
                <ul className="space-y-2.5 text-sm text-on-surface-variant leading-relaxed">
                  <li>只想要明牌、不想花時間理解產業邏輯的人</li>
                  <li>期待保證獲利或無風險回報的學員</li>
                  <li>不打算實際投入資金、只想吸收財經新聞的人</li>
                  <li>認為投資課等於「老師說買什麼我就買什麼」的學員</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant mt-4 leading-relaxed">
              邊界寫清楚不是嚇你,是希望付費後你看的是真能用的內容。
            </p>
          </section>

          {/* === Module 化大綱 (太空大師課專用,代替 11 章 detail) === */}
          {isMasterSpace ? (
            <section>
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-bold text-on-surface">課程地圖</h2>
                <p className="text-sm text-on-surface-variant">
                  5 個主題 module · {chapters?.length ?? 11} 章影片
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  {
                    n: "M1",
                    title: "太空產業全景",
                    desc: "為什麼下一個十年最強敘事是太空,而不是 AI 也不是電動車。資本配置黃金窗口判斷。",
                  },
                  {
                    n: "M2",
                    title: "垂直整合與發射執行",
                    desc: "誰會吃掉整條產業鏈、誰是中型發射執行者的破壞創新——巨頭護城河與夾縫機會的選股邏輯。",
                  },
                  {
                    n: "M3",
                    title: "連線基礎設施",
                    desc: "直連手機與下一代行動通訊的衛星挑戰者:技術 thesis vs 商業 thesis 的落差怎麼看。",
                  },
                  {
                    n: "M4",
                    title: "數據經濟與賣鏟人",
                    desc: "太空數據商業模式 SaaS 化轉型 + 在軌服務太空製造的「賣鏟人」選股邏輯。",
                  },
                  {
                    n: "M5",
                    title: "政策驅動與下一波",
                    desc: "政府訂單型公司的時序風險(月球商業化、國防航太),以及還沒被主流發現的下一波概念。",
                  },
                ].map((m) => (
                  <li
                    key={m.n}
                    className="bg-surface-container-lowest rounded-xl deep-diffusion p-6 flex gap-5 items-start"
                  >
                    <span className="shrink-0 w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-black text-amber-700 dark:text-amber-300 tabular-nums">
                      {m.n}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-on-surface mb-2 leading-snug">
                        {m.title}
                      </h3>
                      <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
                        {m.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-on-surface-variant mt-5 leading-relaxed">
                每個 module 含 1-3 章影片,搭配「主影片(久方武院長親錄)+ 背景資料學習」雙軌設計。具體個股 thesis 留給付費學員,在主流發現前先佈局。
              </p>
            </section>
          ) : (
          /* 非太空大師課 fallback:走原 11 章 detail layout */
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
                chapters.map((ch: any, i: number) => {
                  const isUpcoming = !ch.mux_playback_id && !ch.mux_playback_id_bg && !ch.youtube_url;
                  const totalDur = (ch.duration_seconds || 0) + (ch.duration_seconds_bg || 0);
                  return (
                    <div
                      key={ch.id}
                      className="bg-surface-container-lowest rounded-xl deep-diffusion overflow-hidden flex flex-col sm:flex-row"
                    >
                      {/* Visual block 章節編號 + 漸層 + dot pattern */}
                      <div className="sm:w-[200px] sm:shrink-0 aspect-video sm:aspect-auto relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center overflow-hidden">
                        <div
                          className="absolute inset-0 opacity-25"
                          style={{
                            backgroundImage:
                              "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.5) 1px, transparent 0)",
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

                      {/* Content */}
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

          {/* Reviews — 太空大師課 25 人付費中,先不放 placeholder「沒評價」(削弱信任),等實際 testimonial 收齊再上 */}
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

        {/* Right Sidebar */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden deep-diffusion">
              {/* Video Preview — 點擊帶到第一個免費試看章節（未登入導去登入） */}
              {(() => {
                const previewHref = firstFreeChapter
                  ? userId
                    ? `/learn/${course.id}?chapter=${firstFreeChapter.id}`
                    : `/sign-in?redirect=${encodeURIComponent(
                        `/learn/${course.id}?chapter=${firstFreeChapter.id}`
                      )}`
                  : userId
                  ? `/checkout?type=course&courseId=${course.id}`
                  : `/sign-in?redirect=/courses/${course.slug}`;
                const previewLabel = firstFreeChapter
                  ? userId
                    ? "預覽免費試看章節"
                    : "登入後免費試看"
                  : "立即購買";
                return (
                  <Link
                    href={previewHref}
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
                        <PlayCircle
                          size={40}
                          className="text-white fill-current"
                        />
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded text-white text-xs inline-flex items-center gap-2 w-fit">
                      <Eye size={14} />
                      {previewLabel}
                    </div>
                  </Link>
                );
              })()}

              <div className="p-8 space-y-6">
                {/* Price — sale_ends_at 過期則不顯示特價 badge(cron 沒跑時的視覺保險,ISR revalidate=60s) */}
                <div className="space-y-2">
                  {course.original_price && course.original_price > effectivePrice && !hasAlumniDiscount &&
                    (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
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
                    {hasAlumniDiscount && (
                      <span className="text-xl text-on-surface-variant line-through">
                        NT${course.price.toLocaleString()}
                      </span>
                    )}
                    {!hasAlumniDiscount && course.original_price && course.original_price > effectivePrice &&
                      (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                      <span className="text-xl text-on-surface-variant line-through">
                        NT${course.original_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {hasAlumniDiscount && (
                    <p className="text-sm text-on-surface-variant">
                      老學員專屬價（您已登入為老學員）
                    </p>
                  )}
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    一次付費 · 1 年無限看 + 之後贈送回看
                    {course.pro_bundle_days > 0 ? ` · 加贈 Pro ${course.pro_bundle_days} 天` : ""}
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {hasAccess ? (
                    resumeChapterId ? (
                      <Link
                        href={`/learn/${course.id}?chapter=${resumeChapterId}`}
                        className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      >
                        繼續學習 · 上次到 {fmtTime(resumePosition)}
                        {resumeChapterTitle && (
                          <div className="text-xs font-medium opacity-90 mt-1 truncate px-4">
                            {resumeChapterTitle}
                          </div>
                        )}
                      </Link>
                    ) : (
                      <Link
                        href={`/learn/${course.id}`}
                        className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      >
                        開始學習
                      </Link>
                    )
                  ) : isProOnly ? (
                    <>
                      <Link
                        href={userId ? "/pricing" : `/sign-in?redirect=/courses/${course.slug}`}
                        className="block w-full text-center bg-gradient-to-r from-violet-500 to-fuchsia-500 py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      >
                        {userId ? "訂閱 Pro 解鎖" : "登入後訂閱 Pro"}
                      </Link>
                      {firstFreeChapter && (
                        <Link
                          href={
                            userId
                              ? `/learn/${course.id}?chapter=${firstFreeChapter.id}`
                              : `/sign-in?redirect=${encodeURIComponent(`/learn/${course.id}?chapter=${firstFreeChapter.id}`)}`
                          }
                          className="block w-full text-center border-2 border-secondary py-3 rounded-xl text-secondary font-bold text-sm hover:bg-secondary-fixed/20 transition-colors active:scale-95"
                        >
                          先免費試看一章
                        </Link>
                      )}
                    </>
                  ) : effectivePrice === 0 || course.is_free_preview ? (
                    <Link
                      href={
                        userId
                          ? `/checkout?type=course&courseId=${course.id}`
                          : `/learn/${course.id}`
                      }
                      className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                    >
                      {effectivePrice === 0 && userId ? "解鎖觀看" : "免費觀看"}
                    </Link>
                  ) : userId ? (
                    <>
                      <Link
                        href={`/checkout?type=course&courseId=${course.id}`}
                        className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      >
                        立即購買 — NT${effectivePrice.toLocaleString()}
                      </Link>
                      {firstFreeChapter && (
                        <Link
                          href={`/learn/${course.id}?chapter=${firstFreeChapter.id}`}
                          className="block w-full text-center border-2 border-secondary py-3 rounded-xl text-secondary font-bold text-sm hover:bg-secondary-fixed/20 transition-colors active:scale-95"
                        >
                          先免費試看一章
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/sign-in?redirect=/courses/${course.slug}`}
                        className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                      >
                        登入後購買
                      </Link>
                      {firstFreeChapter && (
                        <Link
                          href={`/sign-in?redirect=${encodeURIComponent(
                            `/learn/${course.id}?chapter=${firstFreeChapter.id}`
                          )}`}
                          className="block w-full text-center border-2 border-secondary py-3 rounded-xl text-secondary font-bold text-sm hover:bg-secondary-fixed/20 transition-colors active:scale-95"
                        >
                          登入免費觀看試聽章節
                        </Link>
                      )}
                    </>
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
                      {
                        icon: Layers,
                        label: "章節數",
                        value: `${chapters?.length ?? 10} 章`,
                      },
                      {
                        icon: Clock,
                        label: "總時長",
                        value: chapters && chapters.length > 0
                          ? `約 ${(
                              chapters.reduce(
                                (s: number, c: { duration_seconds?: number | null; duration_seconds_bg?: number | null }) =>
                                  s + (c.duration_seconds || 0) + (c.duration_seconds_bg || 0),
                                0
                              ) / 3600
                            ).toFixed(1)} 小時`
                          : "陸續上線",
                      },
                      {
                        icon: BarChart,
                        label: "難易度",
                        value: "中階課程",
                      },
                      {
                        icon: Award,
                        label: "課程形式",
                        value: "1 年無限看 + 之後贈送",
                      },
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
              {/* 經歷標籤化 — 正式 credentials 一目了然 */}
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
      {isMasterSpace && !hasAccess && (
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

            {/* 價格 anchor box */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-amber-500/30 rounded-2xl p-8 md:p-10 space-y-6 shadow-2xl">
              {course.original_price && course.original_price > effectivePrice &&
                (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                <div className="inline-flex items-center gap-1.5 bg-red-500/15 text-red-300 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em]">
                  <Sparkles size={12} />
                  限時特價
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-white/60">大師課單次買斷</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  {course.original_price && course.original_price > effectivePrice &&
                    (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                    <span className="text-2xl text-white/50 line-through">
                      NT${course.original_price.toLocaleString()}
                    </span>
                  )}
                  <span className="text-5xl md:text-6xl font-black text-amber-300 tracking-tight">
                    NT${effectivePrice.toLocaleString()}
                  </span>
                </div>
                {course.original_price && course.original_price > effectivePrice &&
                  (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
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
              <Link
                href={
                  userId
                    ? `/checkout?type=course&courseId=${course.id}`
                    : `/sign-in?redirect=/courses/${course.slug}`
                }
                className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 py-4 rounded-xl text-base md:text-lg shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                {userId ? "立即購買" : "登入後購買"}
              </Link>
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

      {/* === FAQ accordion (太空大師課專用) === */}
      {isMasterSpace && (
        <section className="py-16 md:py-24 bg-surface">
          <div className="max-w-[800px] mx-auto px-6 md:px-12">
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-600 dark:text-amber-400 font-bold mb-4">
              Frequently Asked
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight mb-12 leading-tight">
              常見問題
            </h2>
            <FaqAccordion
              items={[
                {
                  q: "課程多長?怎麼看?",
                  a: `${chapters?.length ?? 11} 章影片(每章主影片 + 背景補充教材),總時長約 ${
                    chapters && chapters.length > 0
                      ? (
                          chapters.reduce(
                            (s: number, c: { duration_seconds?: number | null; duration_seconds_bg?: number | null }) =>
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

      {/* === 沉式 CTA (太空大師課專用) === */}
      {isMasterSpace && !hasAccess && (
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
                  <Link
                    href={
                      userId
                        ? `/checkout?type=course&courseId=${course.id}`
                        : `/sign-in?redirect=/courses/${course.slug}`
                    }
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-8 py-4 rounded-xl text-base md:text-lg shadow-2xl shadow-amber-500/30 active:scale-95 transition-all"
                  >
                    立即購買 — NT${effectivePrice.toLocaleString()}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 手機 sticky bottom buy bar — 只在沒購買時顯示 */}
      {!hasAccess && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl border-t border-outline-variant/15 px-4 py-3 shadow-2xl">
          {isProOnly ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
                  Pro 訂閱限定
                </p>
                <p className="text-base font-black bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  訂閱即可解鎖
                </p>
              </div>
              <Link
                href={userId ? "/pricing" : `/sign-in?redirect=/courses/${course.slug}`}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-extrabold px-5 py-3 rounded-xl text-sm shadow-md active:scale-95 transition-transform shrink-0"
              >
                {userId ? "訂閱 Pro" : "登入訂閱"}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {course.original_price && course.original_price > effectivePrice && !hasAlumniDiscount &&
                  (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
                    限時特價
                  </p>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-on-surface">
                    NT${effectivePrice.toLocaleString()}
                  </span>
                  {course.original_price && course.original_price > effectivePrice &&
                    (!course.sale_ends_at || new Date(course.sale_ends_at) > new Date()) && (
                    <span className="text-xs text-on-surface-variant line-through">
                      NT${course.original_price.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {userId ? (
                <Link
                  href={`/checkout?type=course&courseId=${course.id}`}
                  className="signature-gradient text-white font-extrabold px-5 py-3 rounded-xl text-sm shadow-md active:scale-95 transition-transform shrink-0"
                >
                  立即購買
                </Link>
              ) : (
                <Link
                  href={`/sign-in?redirect=/courses/${course.slug}`}
                  className="signature-gradient text-white font-extrabold px-5 py-3 rounded-xl text-sm shadow-md active:scale-95 transition-transform shrink-0"
                >
                  登入購買
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
