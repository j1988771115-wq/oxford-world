import Link from "next/link";
import { getAdminCourses } from "@/lib/actions/admin";

export default async function AdminPage() {
  const courses = await getAdminCourses();

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">總覽</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-500 text-sm mb-1">課程數</p>
          <p className="text-3xl font-bold">{courses.length}</p>
        </div>
        <Link
          href="/admin/courses"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-600/50 transition-colors"
        >
          <p className="text-gray-500 text-sm mb-1">快捷操作</p>
          <p className="text-lg font-bold text-blue-400">管理課程 &rarr;</p>
        </Link>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 opacity-50">
          <p className="text-gray-500 text-sm mb-1">即將推出</p>
          <p className="text-lg font-bold text-gray-600">Insights 管理</p>
        </div>
      </div>
    </div>
  );
}
