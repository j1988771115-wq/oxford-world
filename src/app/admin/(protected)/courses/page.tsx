import Link from "next/link";
import { getAdminCourses } from "@/lib/actions/admin";

export default async function AdminCoursesPage() {
  const courses = await getAdminCourses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">課程管理</h2>
        <Link
          href="/admin/courses/new"
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors"
        >
          + 新增課程
        </Link>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-gray-500 text-lg mb-4">還沒有課程</p>
          <Link
            href="/admin/courses/new"
            className="text-blue-400 font-bold hover:underline"
          >
            新增第一門課程
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">課程</th>
                <th className="px-6 py-4 hidden md:table-cell">分類</th>
                <th className="px-6 py-4 hidden md:table-cell">價格</th>
                <th className="px-6 py-4 hidden md:table-cell">章節</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {courses.map(
                (course: {
                  id: string;
                  title: string;
                  slug: string;
                  category?: string;
                  price: number;
                  course_chapters: { count: number }[];
                }) => (
                  <tr
                    key={course.id}
                    className="hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm">{course.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        /{course.slug}
                      </p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-400">
                      {course.category || "-"}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm font-bold">
                      {course.price === 0
                        ? "免費"
                        : `NT$ ${course.price.toLocaleString()}`}
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-gray-400">
                      {course.course_chapters?.[0]?.count ?? 0} 章
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/courses/${course.id}`}
                        className="text-blue-400 hover:underline text-sm font-bold"
                      >
                        編輯
                      </Link>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
