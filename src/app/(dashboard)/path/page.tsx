import { getUserProfile, getUserCourses } from "@/lib/actions/courses";
import {
  Map,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  BookOpen,
  Compass,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "我的學習路徑 — 牛津視界",
  description: "查看你的個人化 AI 學習路線圖，追蹤進度並解鎖下一階段。",
};

export default async function PathPage() {
  const profile = (await getUserProfile()) as { tier?: string } | null;
  const courses = (await getUserCourses()) as { course_id: string; courses: { title: string; instructor: string; slug: string } }[];

  return (
    <main className="lg:pl-64 pt-24 pb-12 px-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl signature-gradient flex items-center justify-center">
            <Map size={20} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">
            我的學習路徑
          </h1>
        </div>
        <p className="text-on-surface-variant mt-1">
          根據你的目標量身打造的學習路線圖
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion">
          <div className="flex items-center gap-3 mb-4">
            <Target size={20} className="text-secondary" />
            <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">已修課程</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-on-surface">{courses.length}</span>
            <span className="text-sm text-on-surface-variant mb-1">門</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={20} className="text-secondary" />
            <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">會員等級</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-on-surface">
              {profile?.tier === "pro" ? "Pro" : "免費"}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-secondary" />
            <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">學習狀態</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-black text-on-surface">
              {courses.length > 0 ? "進行中" : "尚未開始"}
            </span>
          </div>
        </div>
      </div>

      {/* Current Courses */}
      {courses.length > 0 ? (
        <section className="bg-surface-container-low rounded-3xl p-8 mb-10">
          <h2 className="text-2xl font-bold text-on-surface mb-6">正在學習</h2>
          <div className="space-y-4">
            {courses.map((access, i) => (
              <Link
                key={access.course_id}
                href={`/learn/${access.course_id}`}
                className="flex items-center gap-4 bg-surface-container-lowest p-5 rounded-xl deep-diffusion hover:-translate-y-0.5 transition-all"
              >
                <span className="w-10 h-10 rounded-lg bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center font-bold text-sm shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-on-surface">{access.courses?.title}</h3>
                  <p className="text-sm text-on-surface-variant">{access.courses?.instructor}</p>
                </div>
                <ArrowRight size={18} className="text-on-surface-variant shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <section className="bg-surface-container-low rounded-3xl p-12 mb-10 text-center">
          <Compass size={48} className="text-on-surface-variant/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-on-surface mb-2">還沒有學習路徑</h2>
          <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
            先做個測驗，讓 AI 根據你的背景和目標推薦最適合的學習路線
          </p>
          <Link
            href="/quiz"
            className="inline-flex items-center gap-2 signature-gradient text-white px-8 py-4 rounded-xl font-bold hover:opacity-90 transition"
          >
            <Sparkles size={18} className="fill-current" />
            開始學習路徑測驗
          </Link>
        </section>
      )}

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/courses"
          className="border-2 border-outline-variant text-on-surface px-8 py-4 rounded-xl font-bold hover:bg-surface-container transition flex items-center gap-2 justify-center"
        >
          瀏覽所有課程
          <ArrowRight size={18} />
        </Link>
      </div>
    </main>
  );
}
