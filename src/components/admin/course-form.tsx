"use client";

import { useActionState } from "react";
import { upsertCourse, deleteCourse } from "@/lib/actions/admin";

interface CourseFormProps {
  course?: {
    id: string;
    title: string;
    slug: string;
    description: string;
    instructor: string;
    price: number;
    category?: string;
    level?: string;
    thumbnail_url?: string;
    is_free_preview: boolean;
  };
}

export function CourseForm({ course }: CourseFormProps) {
  const [error, formAction, isPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await upsertCourse(formData);
      return result?.error ?? null;
    },
    null
  );

  const handleDelete = async () => {
    if (!course) return;
    if (!confirm(`確定要刪除「${course.title}」？此操作無法復原。`)) return;
    await deleteCourse(course.id);
  };

  return (
    <form action={formAction} className="space-y-6">
      {course && <input type="hidden" name="id" value={course.id} />}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-5">
        <h3 className="font-bold text-lg">基本資訊</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="課程名稱 *" name="title" required defaultValue={course?.title} placeholder="例：AI 驅動決策力" />
          <Field label="網址代稱 (slug) *" name="slug" required defaultValue={course?.slug} placeholder="例：ai-decision-making" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-400">課程簡介 *</label>
          <textarea
            name="description"
            required
            rows={4}
            defaultValue={course?.description}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none focus:border-blue-600 transition-all resize-none placeholder-gray-600"
            placeholder="課程的簡短介紹"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="講師 *" name="instructor" required defaultValue={course?.instructor} placeholder="講師名稱" />
          <Field label="價格 (NTD)" name="price" type="number" defaultValue={String(course?.price ?? 0)} placeholder="0 = 免費" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="分類" name="category" defaultValue={course?.category} placeholder="例：商務決策、技術實作" />
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400">難度</label>
            <select
              name="level"
              defaultValue={course?.level ?? ""}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none focus:border-blue-600 transition-all"
            >
              <option value="">未設定</option>
              <option value="Foundational">入門 Foundational</option>
              <option value="Intermediate">中級 Intermediate</option>
              <option value="Advanced">進階 Advanced</option>
              <option value="Specialized">專業 Specialized</option>
            </select>
          </div>
        </div>

        <Field label="封面圖片網址" name="thumbnail_url" type="url" defaultValue={course?.thumbnail_url ?? ""} placeholder="https://..." />

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            name="is_free_preview"
            type="checkbox"
            defaultChecked={course?.is_free_preview}
            className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-600"
          />
          <span className="text-sm">免費試看課程</span>
        </label>
      </div>

      <div className="flex items-center justify-between">
        <div>
          {course && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-red-400 hover:bg-red-500/10 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
            >
              刪除課程
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
        >
          {isPending ? "儲存中..." : course ? "更新課程" : "建立課程"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-400">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white focus:ring-2 ring-blue-600/50 focus:outline-none focus:border-blue-600 transition-all placeholder-gray-600"
      />
    </div>
  );
}
