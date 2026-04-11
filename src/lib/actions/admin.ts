"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || token !== expected) {
    redirect("/admin/login");
  }
}

// Use service role to bypass RLS for admin operations
async function createAdminClient() {
  const { createClient: createSupabaseClient } = await import(
    "@supabase/supabase-js"
  );
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Course CRUD ──

export async function getAdminCourses() {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*, course_chapters(count)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin get courses error:", error);
    return [];
  }

  return data;
}

export async function getAdminCourse(id: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Admin get course error:", error);
    return null;
  }

  return data;
}

export async function upsertCourse(formData: FormData) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const id = formData.get("id") as string | null;
  const title = (formData.get("title") as string).trim();
  const slug = (formData.get("slug") as string).trim();
  const description = (formData.get("description") as string).trim();
  const instructor = (formData.get("instructor") as string).trim();
  const price = parseInt(formData.get("price") as string) || 0;
  const category = (formData.get("category") as string).trim();
  const level = (formData.get("level") as string) || null;
  const thumbnailUrl =
    (formData.get("thumbnail_url") as string)?.trim() || null;
  const isFreePreview = formData.get("is_free_preview") === "on";

  const courseData = {
    title,
    slug,
    description,
    instructor,
    price,
    category,
    level,
    thumbnail_url: thumbnailUrl,
    is_free_preview: isFreePreview,
  };

  if (id) {
    const { error } = await supabase
      .from("courses")
      .update(courseData)
      .eq("id", id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("courses").insert(courseData);

    if (error) return { error: error.message };
  }

  redirect("/admin/courses");
}

export async function deleteCourse(id: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase.from("courses").delete().eq("id", id);

  if (error) return { error: error.message };

  redirect("/admin/courses");
}

// ── Chapter CRUD ──

export async function getChapters(courseId: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("course_chapters")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Get chapters error:", error);
    return [];
  }

  return data;
}

export async function upsertChapter(formData: FormData) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const id = formData.get("id") as string | null;
  const courseId = formData.get("course_id") as string;
  const title = (formData.get("title") as string).trim();
  const sortOrder = parseInt(formData.get("sort_order") as string) || 0;
  const durationSeconds =
    parseInt(formData.get("duration_seconds") as string) || null;
  const muxPlaybackId =
    (formData.get("mux_playback_id") as string)?.trim() || null;
  const isFreePreview = formData.get("is_free_preview") === "on";

  const chapterData = {
    course_id: courseId,
    title,
    sort_order: sortOrder,
    duration_seconds: durationSeconds,
    mux_playback_id: muxPlaybackId,
    is_free_preview: isFreePreview,
  };

  if (id) {
    const { error } = await supabase
      .from("course_chapters")
      .update(chapterData)
      .eq("id", id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("course_chapters")
      .insert(chapterData);

    if (error) return { error: error.message };
  }

  return { success: true, courseId };
}

export async function deleteChapter(id: string) {
  await requireAdmin();
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("course_chapters")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  return { success: true };
}
