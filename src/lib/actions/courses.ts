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

export async function checkCourseAccess(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tier")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return false;

  // Pro members have access to all courses
  if (profile.tier === "pro") return true;

  // Check direct purchase
  const { data: access } = await supabase
    .from("course_access")
    .select("id")
    .eq("user_id", profile.id)
    .eq("course_id", courseId)
    .limit(1);

  return access !== null && access.length > 0;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (error) {
    console.error("Get profile error:", error);
    return null;
  }

  return data;
}

export async function getUserCourses() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return [];

  const { data, error } = await supabase
    .from("course_access")
    .select("*, courses(*)")
    .eq("user_id", profile.id)
    .order("granted_at", { ascending: false });

  if (error) {
    console.error("Get user courses error:", error);
    return [];
  }

  return data;
}
