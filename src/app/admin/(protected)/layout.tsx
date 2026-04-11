import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              OV
            </div>
            <span className="font-bold text-white">牛津視界 — 後台管理</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a
              href="/admin"
              className="text-gray-400 hover:text-white transition-colors"
            >
              總覽
            </a>
            <a
              href="/admin/courses"
              className="text-gray-400 hover:text-white transition-colors"
            >
              課程管理
            </a>
            <a
              href="/admin/insights"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Insights
            </a>
            <a
              href="/admin/knowledge"
              className="text-gray-400 hover:text-white transition-colors"
            >
              知識庫
            </a>
            <a
              href="/admin/dungeons"
              className="text-gray-400 hover:text-white transition-colors"
            >
              副本
            </a>
            <a
              href="/admin/email"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Email
            </a>
            <a
              href="/api/admin/logout"
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              登出
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
