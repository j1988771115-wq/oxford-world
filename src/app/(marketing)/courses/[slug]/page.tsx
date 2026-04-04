import { notFound } from "next/navigation";
import { getCourseBySlug, checkCourseAccess } from "@/lib/actions/courses";
import { REVIEWS } from "@/lib/ui-data";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  const userId = null; // TODO: re-enable when auth is configured
  const hasAccess = false;

  return (
    <main className="pt-12 pb-20 px-8 max-w-[1440px] mx-auto">
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

          {/* Curriculum */}
          <section>
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-bold text-on-surface">課程大綱</h2>
            </div>
            <div className="space-y-4">
              <div className="bg-surface-container-lowest rounded-xl deep-diffusion p-1 overflow-hidden">
                <details className="group" open>
                  <summary className="flex justify-between items-center p-5 cursor-pointer list-none">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center font-bold text-xs">
                        01
                      </span>
                      <h3 className="font-bold text-lg text-on-surface">
                        模組 1：核心概論
                      </h3>
                    </div>
                    <ChevronRight className="group-open:rotate-90 transition-transform text-on-surface-variant" />
                  </summary>
                  <div className="px-5 pb-5 pt-2 space-y-4 border-t border-surface-container">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <PlayCircle
                          size={18}
                          className="text-secondary-container fill-current"
                        />
                        <span className="text-on-surface">課程介紹</span>
                      </div>
                      <span className="text-on-surface-variant">15:00</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <PlayCircle
                          size={18}
                          className="text-on-surface-variant"
                        />
                        <span className="text-on-surface">基礎概念</span>
                      </div>
                      <span className="text-on-surface-variant">22:45</span>
                    </div>
                  </div>
                </details>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["進階應用", "實戰練習", "案例分析", "總結與評估"].map(
                  (mod, i) => (
                    <div
                      key={i}
                      className="bg-surface-container-low p-5 rounded-xl flex items-center justify-between opacity-80"
                    >
                      <span className="font-bold text-on-surface">
                        模組 {i + 2}：{mod}
                      </span>
                      <Lock size={18} className="text-on-surface-variant" />
                    </div>
                  )
                )}
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section>
            <h2 className="text-2xl font-bold text-on-surface mb-8">
              學員評價
            </h2>
            <div className="space-y-6">
              {REVIEWS.map((review) => (
                <div
                  key={review.id}
                  className="bg-surface-container-lowest p-8 rounded-xl deep-diffusion flex gap-6"
                >
                  <div className="shrink-0">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold text-on-surface",
                        review.avatarColor
                      )}
                    >
                      {review.author[0]}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex text-secondary-container">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={cn(
                              i < review.rating
                                ? "fill-current"
                                : "text-surface-container-highest"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-on-surface-variant">
                        {review.date}
                      </span>
                    </div>
                    <p className="text-on-surface font-bold">{review.title}</p>
                    <p className="text-on-surface-variant leading-relaxed">
                      {review.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden deep-diffusion">
              {/* Video Preview */}
              <div className="relative aspect-video group cursor-pointer overflow-hidden">
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
                  預覽免費試看章節
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Price */}
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-extrabold text-on-surface">
                    {course.price === 0
                      ? "免費"
                      : `NT$${course.price.toLocaleString()}`}
                  </span>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {hasAccess ? (
                    <Link
                      href={`/learn/${course.id}`}
                      className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                    >
                      開始學習
                    </Link>
                  ) : course.price === 0 || course.is_free_preview ? (
                    <Link
                      href={`/learn/${course.id}`}
                      className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                    >
                      免費觀看
                    </Link>
                  ) : userId ? (
                    <button className="w-full signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95">
                      立即購買
                    </button>
                  ) : (
                    <Link
                      href="/sign-in"
                      className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                    >
                      登入後購買
                    </Link>
                  )}
                  <Link
                    href="/pricing"
                    className="block w-full text-center border-2 border-secondary py-4 rounded-xl text-secondary font-bold text-lg hover:bg-secondary-fixed/20 transition-colors active:scale-95"
                  >
                    加入 Pro 會員免費看
                  </Link>
                </div>

                {/* Details */}
                <div className="pt-6 border-t border-outline-variant/30 space-y-4">
                  <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">
                    課程詳情
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        icon: Clock,
                        label: "總時長",
                        value: "12 小時",
                      },
                      { icon: Layers, label: "章節數", value: "45 課" },
                      {
                        icon: BarChart,
                        label: "難易度",
                        value: "中級課程",
                      },
                      {
                        icon: Award,
                        label: "結業證書",
                        value: "含結業證書",
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
          </div>
        </div>
      </div>
    </main>
  );
}
