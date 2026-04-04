"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCourses(category?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get courses error:", error);
    return [];
  }

  return data;
}

export async function getCourseBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Get course error:", error);
    return null;
  }

  return data;
}

export async function checkCourseAccess(_courseId: string) {
  // TODO: re-enable when auth is configured
  return false;
}

export async function getUserProfile() {
  // TODO: re-enable when auth is configured
  return null;
}

export async function getUserCourses() {
  // TODO: re-enable when auth is configured
  return [];
}
