import { notFound, redirect } from "next/navigation";
import { getCourseBySlug, checkCourseAccess } from "@/lib/actions/courses";
import Link from "next/link";
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
      images: [{ url: course.thumbnail_url || "/og", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [course.thumbnail_url || "/og"],
    },
    alternates: { canonical: `https://oxford-vision.com/courses/${course.slug}` },
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const hasAccess = userId ? await checkCourseAccess(course.id) : false;

  // 已購買 → 直接帶到收看頁,不停在銷售頁
  if (hasAccess) {
    redirect(`/learn/${course.id}`);
  }

  // Fetch alumni status for pricing + visibility
  let isAlumni = false;
  if (userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_alumni")
      .eq("auth_id", userId)
      .single();
    isAlumni = !!profile?.is_alumni;
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

  // Get chapters
  const { data: chapters } = await supabase
    .from("course_chapters")
    .select("*")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  // 找第一個免費試看章節 — 訪客 / 未購買者用此 link 試看
  const firstFreeChapter = (chapters || []).find(
    (ch: { is_free_preview?: boolean; mux_playback_id?: string | null }) =>
      ch.is_free_preview && ch.mux_playback_id
  );

  // 抓最近一次有進度的章節（讓 CTA 變「繼續學習」）
  let resumeChapterId: string | null = null;
  let resumePosition = 0;
  let resumeChapterTitle: string | null = null;
  if (hasAccess && userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", userId)
      .maybeSingle();
    if (profile) {
      const { data: lastProgress } = await supabase
        .from("course_progress")
        .select("chapter_id, last_position_seconds, completed")
        .eq("user_id", profile.id)
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

  return (
    <main className="pt-12 pb-20 px-8 max-w-[1440px] mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
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

          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-4">
              課程簡介
            </h2>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              {course.description || "課程介紹即將更新。"}
            </p>
          </section>

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

          {/* Curriculum */}
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
                  const isUpcoming = !ch.mux_playback_id && !ch.youtube_url;
                  return (
                    <div
                      key={ch.id}
                      className="bg-surface-container-lowest rounded-xl deep-diffusion p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center font-bold text-xs shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-on-surface leading-snug">
                              {ch.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {ch.is_free_preview && (
                                <span className="text-[10px] font-bold text-secondary-container bg-secondary-fixed px-1.5 py-0.5 rounded">
                                  免費試看
                                </span>
                              )}
                              {isUpcoming && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                                  兩週內上線
                                </span>
                              )}
                              {ch.duration_seconds && !isUpcoming && (
                                <span className="text-xs text-on-surface-variant">
                                  {Math.floor(ch.duration_seconds / 60)}:{String(ch.duration_seconds % 60).padStart(2, "0")}
                                </span>
                              )}
                            </div>
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
                        <div className="mt-3 ml-12 pt-3 border-t border-outline-variant/15">
                          <p className="text-sm text-on-surface-variant leading-relaxed">
                            <span className="text-on-surface font-medium">你會帶走 — </span>
                            {ch.takeaway_summary}
                          </p>
                        </div>
                      )}
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

          {/* Reviews */}
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
                      <img
                        src={course.thumbnail_url}
                        alt="Video Preview"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
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
                {/* Price */}
                <div className="space-y-2">
                  {course.original_price && course.original_price > effectivePrice && !hasAlumniDiscount && (
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
                    {!hasAlumniDiscount && course.original_price && course.original_price > effectivePrice && (
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
                    一次付費 · 終身觀看
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
                          href={`/sign-in?redirect=/learn/${course.id}?chapter=${firstFreeChapter.id}`}
                          className="block w-full text-center border-2 border-secondary py-3 rounded-xl text-secondary font-bold text-sm hover:bg-secondary-fixed/20 transition-colors active:scale-95"
                        >
                          登入免費觀看試聽章節
                        </Link>
                      )}
                    </>
                  )}
                  <Link
                    href="/pricing"
                    className="block w-full text-center border-2 border-secondary py-4 rounded-xl text-secondary font-bold text-sm hover:bg-secondary-fixed/20 transition-colors active:scale-95"
                  >
                    比較 Pro 訂閱方案
                  </Link>
                  <p className="text-xs text-on-surface-variant text-center -mt-1 leading-relaxed">
                    Pro 訂閱不含大師課影片，需另購
                  </p>
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
                          ? `約 ${Math.round((chapters.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / 3600) || 0)} 小時`
                          : "陸續上線",
                      },
                      {
                        icon: BarChart,
                        label: "難易度",
                        value: "進階課程",
                      },
                      {
                        icon: Award,
                        label: "課程形式",
                        value: "永久回看",
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

            <div className="bg-secondary-fixed p-6 rounded-xl border border-secondary-container/30 flex items-start gap-4">
              <Sparkles
                size={24}
                className="text-on-secondary-fixed-variant fill-current"
              />
              <div>
                <p className="text-on-secondary-fixed-variant font-bold text-sm mb-1">
                  AI 顧問分析
                </p>
                <p className="text-on-secondary-fixed-variant/80 text-sm leading-relaxed">
                  根據您的興趣，這門課能幫助您提升專業能力。
                </p>
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
    </main>
  );
}
