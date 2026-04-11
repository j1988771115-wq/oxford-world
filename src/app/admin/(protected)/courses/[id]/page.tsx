import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCourse, getChapters } from "@/lib/actions/admin";
import { CourseForm } from "@/components/admin/course-form";
import { ChapterManager } from "@/components/admin/chapter-manager";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [course, chapters] = await Promise.all([
    getAdminCourse(id),
    getChapters(id),
  ]);

  if (!course) notFound();

  return (
    <div className="space-y-8">
      <Link
        href="/admin/courses"
        className="text-gray-500 hover:text-white text-sm transition-colors"
      >
        &larr; 返回課程列表
      </Link>
      <h2 className="text-2xl font-bold">編輯：{course.title}</h2>
      <CourseForm course={course} />
      <ChapterManager courseId={course.id} initialChapters={chapters} />
    </div>
  );
}
