import { FileText, Bell } from "lucide-react";
import Link from "next/link";
import { EmailCaptureForm } from "@/components/email-capture-form";

export const metadata = {
  title: "最新內容 — 牛津視界",
  description: "最新的 AI 報告、影片、文章",
};

export default function InsightsPage() {
  return (
    <main className="pt-12 pb-24 bg-surface">
      <div className="max-w-7xl mx-auto px-8">
        <div className="mb-16">
          <h1 className="text-5xl font-black text-on-surface tracking-tight mb-4">
            最新內容
          </h1>
          <p className="text-on-surface-variant text-lg">
            AI 報告、影片、文章，持續更新
          </p>
        </div>

        {/* Coming Soon */}
        <div className="bg-surface-container-lowest rounded-3xl p-12 md:p-16 text-center deep-diffusion">
          <FileText size={48} className="text-on-surface-variant/30 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-on-surface mb-4">
            內容準備中
          </h2>
          <p className="text-on-surface-variant text-lg max-w-lg mx-auto mb-8">
            我們正在準備高品質的 AI 趨勢報告、實戰教學影片和深度文章。
            訂閱電子報，第一時間收到最新內容。
          </p>

          <div className="max-w-md mx-auto">
            <EmailCaptureForm />
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <div className="bg-surface-container-low px-6 py-3 rounded-full text-on-surface-variant text-sm font-bold flex items-center gap-2">
              <Bell size={16} />
              趨勢報告
            </div>
            <div className="bg-surface-container-low px-6 py-3 rounded-full text-on-surface-variant text-sm font-bold flex items-center gap-2">
              <Bell size={16} />
              教學影片
            </div>
            <div className="bg-surface-container-low px-6 py-3 rounded-full text-on-surface-variant text-sm font-bold flex items-center gap-2">
              <Bell size={16} />
              深度文章
            </div>
          </div>
        </div>

        {/* Link back */}
        <div className="mt-8 text-center">
          <Link href="/courses" className="text-secondary font-bold hover:underline">
            先去看看我們的課程 →
          </Link>
        </div>
      </div>
    </main>
  );
}
