import Link from "next/link";
import { CourseForm } from "@/components/admin/course-form";

export default function NewCoursePage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/courses"
        className="text-gray-500 hover:text-white text-sm transition-colors"
      >
        &larr; 返回課程列表
      </Link>
      <h2 className="text-2xl font-bold">新增課程</h2>
      <CourseForm />
    </div>
  );
}
