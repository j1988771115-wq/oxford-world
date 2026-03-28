"use server";

import { createClient, createAuthClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

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

export async function checkCourseAccess(courseId: string) {
  const { userId } = await auth();
  if (!userId) return false;

  const supabase = await createAuthClient();

  // Check direct purchase
  const { data: access } = await supabase
    .from("course_access")
    .select("id")
    .eq("course_id", courseId)
    .limit(1);

  if (access && access.length > 0) return true;

  // Check Pro subscription
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .limit(1)
    .single();

  return profile?.tier === "pro";
}

export async function getUserProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (error) {
    console.error("Get profile error:", error);
    return null;
  }

  return data;
}

export async function getUserCourses() {
  const { userId } = await auth();
  if (!userId) return [];

  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from("course_access")
    .select("*, courses(*)")
    .order("granted_at", { ascending: false });

  if (error) {
    console.error("Get user courses error:", error);
    return [];
  }

  return data;
}
