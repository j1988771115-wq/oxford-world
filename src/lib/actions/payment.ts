"use server";

import { auth } from "@clerk/nextjs/server";
import { createAuthClient } from "@/lib/supabase/server";
import { createPaymentForm } from "@/lib/newebpay";
import { randomUUID } from "crypto";

export async function createCourseOrder(courseId: string) {
  const { userId } = await auth();
  if (!userId) return { error: "請先登入" };

  const supabase = await createAuthClient();

  // Get course info
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) return { error: "找不到課程" };
  if (course.price === 0) return { error: "此課程為免費課程" };

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (!profile) return { error: "找不到用戶資料" };

  // Create order
  const orderId = `OV${Date.now()}${randomUUID().slice(0, 8)}`;

  const { error: orderError } = await supabase.from("orders").insert({
    merchant_order_no: orderId,
    user_id: profile.id,
    course_id: courseId,
    order_type: "course",
    amount: course.price,
    status: "pending",
  });

  if (orderError) {
    console.error("Create order error:", orderError);
    return { error: "建立訂單失敗" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const paymentForm = createPaymentForm({
    orderId,
    amount: course.price,
    description: `牛津視界 - ${course.title}`,
    email: profile.email,
    returnUrl: `${baseUrl}/dashboard?payment=success`,
    notifyUrl: `${baseUrl}/api/webhooks/newebpay`,
  });

  return { paymentForm };
}

export async function createProSubscription() {
  const { userId } = await auth();
  if (!userId) return { error: "請先登入" };

  const supabase = await createAuthClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .single();

  if (!profile) return { error: "找不到用戶資料" };
  if (profile.tier === "pro") return { error: "您已經是 Pro 會員" };

  const orderId = `OVP${Date.now()}${randomUUID().slice(0, 8)}`;

  const { error: orderError } = await supabase.from("orders").insert({
    merchant_order_no: orderId,
    user_id: profile.id,
    order_type: "subscription",
    amount: 499,
    status: "pending",
  });

  if (orderError) {
    console.error("Create subscription order error:", orderError);
    return { error: "建立訂單失敗" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const paymentForm = createPaymentForm({
    orderId,
    amount: 499,
    description: "牛津視界 Pro 會員 - 月繳",
    email: profile.email,
    returnUrl: `${baseUrl}/dashboard?payment=success&type=pro`,
    notifyUrl: `${baseUrl}/api/webhooks/newebpay`,
  });

  return { paymentForm };
}
