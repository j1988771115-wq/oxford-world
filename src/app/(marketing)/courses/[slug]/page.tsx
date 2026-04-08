import { notFound } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const hasAccess = userId ? await checkCourseAccess(course.id) : false;

  // Get chapters
  const { data: chapters } = await supabase
    .from("course_chapters")
    .select("*")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

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
              {chapters && chapters.length > 0 && (
                <p className="text-sm text-on-surface-variant">
                  共 {chapters.length} 個章節
                </p>
              )}
            </div>
            <div className="space-y-3">
              {chapters && chapters.length > 0 ? (
                chapters.map((ch: any, i: number) => (
                  <div
                    key={ch.id}
                    className="bg-surface-container-lowest rounded-xl deep-diffusion p-5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center font-bold text-xs">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="font-bold text-on-surface">
                          {ch.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {ch.is_free_preview && (
                            <span className="text-[10px] font-bold text-secondary-container bg-secondary-fixed px-1.5 py-0.5 rounded">
                              免費試看
                            </span>
                          )}
                          {ch.duration_seconds && (
                            <span className="text-xs text-on-surface-variant">
                              {Math.floor(ch.duration_seconds / 60)}:{String(ch.duration_seconds % 60).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {ch.is_free_preview ? (
                      <PlayCircle size={20} className="text-secondary-container fill-current" />
                    ) : (
                      <Lock size={18} className="text-on-surface-variant" />
                    )}
                  </div>
                ))
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
                    <Link
                      href={`/pricing`}
                      className="block w-full text-center signature-gradient py-4 rounded-xl text-white font-extrabold text-lg deep-diffusion hover:brightness-110 transition-all active:scale-95"
                    >
                      立即購買
                    </Link>
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
