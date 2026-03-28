import { notFound } from "next/navigation";
import { getCourseBySlug, checkCourseAccess } from "@/lib/actions/courses";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  const { userId } = await auth();
  const hasAccess = userId ? await checkCourseAccess(course.id) : false;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Course Header */}
          <div className="mb-8">
            {course.category && (
              <span className="text-sm text-blue-600 font-medium">
                {course.category}
              </span>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mt-1">
              {course.title}
            </h1>
            <p className="text-gray-600 mt-2">講師：{course.instructor}</p>
          </div>

          {/* Video Preview / Thumbnail */}
          <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden mb-8">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-6xl">🎬</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Description */}
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">課程介紹</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {course.description || "課程介紹即將更新。"}
                </p>
              </div>
            </div>

            {/* Purchase Card */}
            <div className="md:col-span-1">
              <div className="sticky top-24 border border-gray-200 rounded-xl p-6">
                <div className="text-3xl font-bold text-gray-900 mb-4">
                  {course.price === 0
                    ? "免費"
                    : `NT$${course.price.toLocaleString()}`}
                </div>

                {hasAccess ? (
                  <Link
                    href={`/learn/${course.id}`}
                    className="block w-full text-center bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition"
                  >
                    開始學習
                  </Link>
                ) : course.price === 0 || course.is_free_preview ? (
                  <Link
                    href={`/learn/${course.id}`}
                    className="block w-full text-center bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    免費觀看
                  </Link>
                ) : userId ? (
                  <button className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
                    購買課程
                  </button>
                ) : (
                  <Link
                    href="/sign-in"
                    className="block w-full text-center bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
                  >
                    登入後購買
                  </Link>
                )}

                <div className="mt-4 space-y-2 text-sm text-gray-500">
                  <p>✓ 永久存取</p>
                  <p>✓ AI 助手支援</p>
                  <p>✓ Discord 社群</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
