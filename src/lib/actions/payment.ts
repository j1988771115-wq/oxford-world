"use server";

import { createClient } from "@/lib/supabase/server";
import { PRO_MONTHLY_PRICE } from "@/lib/constants";

export async function createCourseOrder(_courseId: string) {
  // TODO: re-enable when auth is configured
  return { error: "請先登入" };
}

export async function createProSubscription() {
  // TODO: re-enable when auth is configured
  return { error: "請先登入" };
}
