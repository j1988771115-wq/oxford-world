"use server";

import { createClient } from "@/lib/supabase/server";
import { createPaymentForm } from "@/lib/newebpay";
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from "@/lib/constants";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://oxford-vision.com";
}

function generateOrderNo() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OV${ts}${rand}`;
}

export async function createCourseOrder(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "請先登入" };
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, tier")
    .eq("auth_id", user.id)
    .single();

  if (!profile) {
    return { error: "找不到用戶資料" };
  }

  // Pro members already have access
  if (profile.tier === "pro") {
    return { error: "您是 Pro 會員，已可免費觀看所有課程" };
  }

  // Check if already purchased
  const { data: existing } = await supabase
    .from("course_access")
    .select("id")
    .eq("user_id", profile.id)
    .eq("course_id", courseId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "您已購買此課程" };
  }

  // Get course info
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, price")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { error: "課程不存在" };
  }

  if (course.price === 0) {
    return { error: "此為免費課程，無需購買" };
  }

  const merchantOrderNo = generateOrderNo();
  const baseUrl = getBaseUrl();

  // Create pending order
  const { error: insertError } = await supabase.from("orders").insert({
    merchant_order_no: merchantOrderNo,
    user_id: profile.id,
    course_id: course.id,
    order_type: "course",
    amount: course.price,
    status: "pending",
  });

  if (insertError) {
    console.error("Create order error:", insertError);
    return { error: "建立訂單失敗，請稍後再試" };
  }

  // Generate payment form
  const paymentForm = createPaymentForm({
    orderId: merchantOrderNo,
    amount: course.price,
    description: `牛津視界 — ${course.title}`,
    email: profile.email || user.email || "",
    returnUrl: `${baseUrl}/api/payment/return`,
    notifyUrl: `${baseUrl}/api/webhooks/newebpay`,
  });

  return { paymentForm, orderId: merchantOrderNo };
}

export async function createProSubscription(billing: "monthly" | "yearly") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "請先登入" };
  }

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, tier")
    .eq("auth_id", user.id)
    .single();

  if (!profile) {
    return { error: "找不到用戶資料" };
  }

  if (profile.tier === "pro") {
    return { error: "您已經是 Pro 會員" };
  }

  const amount = billing === "yearly" ? PRO_YEARLY_PRICE : PRO_MONTHLY_PRICE;
  const desc = billing === "yearly" ? "Pro 年繳方案" : "Pro 月繳方案";
  const merchantOrderNo = generateOrderNo();
  const baseUrl = getBaseUrl();

  // Create pending order
  const { error: insertError } = await supabase.from("orders").insert({
    merchant_order_no: merchantOrderNo,
    user_id: profile.id,
    course_id: null,
    order_type: "subscription",
    amount,
    status: "pending",
  });

  if (insertError) {
    console.error("Create subscription order error:", insertError);
    return { error: "建立訂單失敗，請稍後再試" };
  }

  // Generate payment form
  const paymentForm = createPaymentForm({
    orderId: merchantOrderNo,
    amount,
    description: `牛津視界 — ${desc}`,
    email: profile.email || user.email || "",
    returnUrl: `${baseUrl}/api/payment/return`,
    notifyUrl: `${baseUrl}/api/webhooks/newebpay`,
  });

  return { paymentForm, orderId: merchantOrderNo };
}

export async function getOrderStatus(merchantOrderNo: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("*, courses(title, slug)")
    .eq("merchant_order_no", merchantOrderNo)
    .eq("user_id", profile.id)
    .single();

  return order;
}
