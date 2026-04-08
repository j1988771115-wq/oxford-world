import { getUserProfile, getUserCourses } from "@/lib/actions/courses";
import { MILESTONES } from "@/lib/ui-data";
import {
  Map,
  CheckCircle2,
  Lock,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "我的學習路徑 — 牛津視界",
  description: "查看你的個人化 AI 學習路線圖，追蹤進度並解鎖下一階段。",
};

export default async function PathPage() {
  const profile = await getUserProfile() as { tier?: string; current_streak?: number } | null;
  const courses = await getUserCourses() as { course_id: string; courses: { title: string; instructor: string; slug: string } }[];

  const completedCount = MILESTONES.filter((m) => m.status === "completed").length;
  const progress = Math.round((completedCount / MILESTONES.length) * 100);

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

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion">
          <div className="flex items-center gap-3 mb-4">
            <Target size={20} className="text-secondary" />
            <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">整體進度</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-on-surface">{progress}%</span>
            <span className="text-sm text-on-surface-variant mb-1">完成</span>
          </div>
          <div className="mt-4 h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full signature-gradient transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={20} className="text-secondary" />
            <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">已修課程</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-on-surface">{courses.length}</span>
            <span className="text-sm text-on-surface-variant mb-1">門</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 deep-diffusion">
          <div className="flex items-center gap-3 mb-4">
            <Clock size={20} className="text-secondary" />
            <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">預計完成</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-on-surface">12</span>
            <span className="text-sm text-on-surface-variant mb-1">週</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section className="bg-surface-container-low rounded-3xl p-8 mb-10">
        <h2 className="text-2xl font-bold text-on-surface mb-10">學習里程碑</h2>
        <div className="relative space-y-10 pl-8 border-l-2 border-outline-variant/30">
          {MILESTONES.map((m) => (
            <div key={m.id} className="relative">
              <div
                className={cn(
                  "absolute -left-[41px] top-0 w-5 h-5 rounded-full ring-8",
                  m.status === "completed"
                    ? "bg-secondary ring-secondary-container/20"
                    : m.status === "current"
                      ? "bg-secondary-container ring-secondary-container/10"
                      : "bg-surface-container-highest ring-surface-container"
                )}
              >
                {m.status === "completed" && (
                  <CheckCircle2 size={20} className="text-white absolute -top-0.5 -left-0.5" />
                )}
              </div>
              <div
                className={cn(
                  "bg-surface-container-lowest p-6 rounded-xl deep-diffusion transition-all",
                  m.status === "locked" && "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-widest",
                    m.status === "locked" ? "text-on-surface-variant" : "text-secondary-container"
                  )}
                >
                  {m.phase}
                </span>
                <h3 className="text-xl font-bold font-headline flex items-center gap-2 text-on-surface mt-1">
                  {m.title}
                  {m.status === "locked" && <Lock size={16} className="text-on-surface-variant" />}
                  {m.status === "current" && (
                    <span className="text-xs bg-secondary-fixed text-on-secondary-fixed-variant px-2 py-0.5 rounded-full font-bold">
                      進行中
                    </span>
                  )}
                </h3>
                <p className="text-on-surface-variant text-sm mt-1">{m.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/quiz"
          className="signature-gradient text-white px-8 py-4 rounded-xl font-bold hover:opacity-90 transition flex items-center gap-2 justify-center"
        >
          <Sparkles size={18} className="fill-current" />
          重新規劃學習路徑
        </Link>
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
