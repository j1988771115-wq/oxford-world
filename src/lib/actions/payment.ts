"use server";

import { createAuthClient } from "@/lib/supabase/server";
import { createPaymentForm } from "@/lib/newebpay";
import { PRO_MONTHLY_PRICE } from "@/lib/constants";
import { randomUUID } from "crypto";

export async function createCourseOrder(_courseId: string) {
  // TODO: re-enable when auth is configured
  return { error: "請先登入" };
}

export async function createProSubscription() {
  // TODO: re-enable when auth is configured
  return { error: "請先登入" };
}
