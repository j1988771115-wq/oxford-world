import { notFound } from "next/navigation";
import {
  getCourses,
  getPublicCourseBySlug,
  getPublicCourseChapters,
  getPublicCourseStudentCount,
} from "@/lib/actions/courses";
import { CourseAccessProvider } from "@/components/courses/course-access-provider";
import { CourseSalesBody } from "@/components/courses/course-sales-body";

// 純 anon ISR — 不讀 cookies、不打 user-aware data。
// user-aware UI(購買/進入/resume/preview link)收進 client overlay
// (CourseAccessProvider + DynamicPurchaseLink + InlinePreviewPlayer + MobileStickyBuyBar)。
// TTFB 從 350ms (dynamic SSR opt-out ISR) 降到 cache HIT 的 50ms。
// 改 DB 後最多 5 分鐘生效。
export const revalidate = 300;

// Next 16 動態 [slug] 路由必須 generateStaticParams + revalidate 才走 ISR(否則 ƒ Dynamic)。
// build time fetch 所有非 legacy 課,prerender 出來;新加課第一訪客觸發 on-demand ISR。
export async function generateStaticParams() {
  const courses = await getCourses();
  return (courses || [])
    .filter((c: { slug: string }) => !c.slug.startsWith("legacy-"))
    .map((c: { slug: string }) => ({ slug: c.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);
  if (!course) return {};
  const isLegacy = course.slug?.startsWith("legacy-");
  const title = `${course.title} — 牛津視界`;
  const desc = course.description?.slice(0, 160) || "";
  return {
    title,
    description: desc,
    robots: isLegacy ? "noindex, nofollow" : undefined,
    openGraph: {
      title,
      description: desc,
      type: "website",
      locale: "zh_TW",
      url: `https://oxford-vision.com/courses/${course.slug}`,
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
  const course = await getPublicCourseBySlug(slug);

  if (!course) notFound();

  // Legacy 課公開 SEO 不顯示(舊學員 dashboard → /learn/${id} 進);anon 直接 404
  if (course.slug?.startsWith("legacy-")) notFound();

  // 全部 anon 平行抓
  const [chapters, studentCount] = await Promise.all([
    getPublicCourseChapters(course.id),
    getPublicCourseStudentCount(course.id),
  ]);

  const firstFreeChapter =
    chapters.find((ch) => ch.is_free_preview && ch.mux_playback_id) || null;

  // === SEO JSON-LD ===
  const courseUrl = `https://oxford-vision.com/courses/${course.slug}`;
  const totalDurationSec = chapters.reduce(
    (sum, c) => sum + (c.duration_seconds || 0),
    0,
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
  if (chapters.length > 0) {
    courseJsonLd.numberOfCredits = chapters.length;
    courseJsonLd.syllabusSections = chapters.map((ch) => ({
      "@type": "Syllabus",
      name: `第 ${ch.sort_order} 章 ${ch.title}`,
      description: ch.takeaway_summary || undefined,
    }));
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: "https://oxford-vision.com" },
      { "@type": "ListItem", position: 2, name: "課程", item: "https://oxford-vision.com/courses" },
      { "@type": "ListItem", position: 3, name: course.title, item: courseUrl },
    ],
  };

  const videoObjects = chapters
    .filter((c) => c.mux_playback_id)
    .map((c) => ({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `第 ${c.sort_order} 章 ${c.title}`,
      description: c.takeaway_summary || course.description || course.title,
      thumbnailUrl: course.thumbnail_url ? [course.thumbnail_url] : undefined,
      uploadDate: course.created_at,
      duration: c.duration_seconds
        ? `PT${Math.floor(c.duration_seconds / 60)}M${c.duration_seconds % 60}S`
        : undefined,
      contentUrl: `https://stream.mux.com/${c.mux_playback_id}.m3u8`,
      embedUrl: `https://oxford-vision.com/learn/${course.id}?chapter=${c.id}&part=main`,
      publisher: {
        "@type": "Organization",
        name: "牛津視界 Oxford Vision",
        logo: { "@type": "ImageObject", url: "https://oxford-vision.com/icon.png" },
      },
      isAccessibleForFree: !!c.is_free_preview,
    }));

  const howToJsonLd = chapters.length > 0
    ? {
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
        tool: [{ "@type": "HowToTool", name: "AI 助教 Eyesy(課程內提供)" }],
        step: chapters.map((ch) => ({
          "@type": "HowToStep",
          position: ch.sort_order,
          name: ch.title,
          text: ch.takeaway_summary || `第 ${ch.sort_order} 章 ${ch.title}`,
          url: `${courseUrl}#chapter-${ch.sort_order}`,
        })),
      }
    : null;

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
        acceptedAnswer: { "@type": "Answer", text: `共 ${chapters.length || 9} 章節,主課程約 2 小時、每章另附 NotebookLM 背景對談,合計約 3 小時內容。一次付費 NT$${course.price.toLocaleString()} 享 1 年無限觀看權限(期滿後平台贈送繼續回看),可重複回看,加贈 90 天 Pro 訂閱(享 AI 助教 Eyesy 深度模式)。` },
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

  return (
    <CourseAccessProvider
      courseSlug={course.slug}
      preFreePreviewId={firstFreeChapter?.id ?? null}
    >
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

      <CourseSalesBody
        course={course}
        chapters={chapters}
        studentCount={studentCount}
        firstFreeChapter={firstFreeChapter}
      />
    </CourseAccessProvider>
  );
}
