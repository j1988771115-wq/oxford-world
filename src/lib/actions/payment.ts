"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createPaymentForm } from "@/lib/newebpay";
import { PRO_MONTHLY_PRICE, PRO_YEARLY_PRICE } from "@/lib/constants";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "https://oxford-vision.com";
}

function generateOrderNo() {
  // audit T1-5: Math.random ≈ 20bit entropy 易碰撞,改用 crypto.randomBytes
  // 6 bytes → 8 chars base32 ≈ 48bit entropy
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "").slice(0, 8).toUpperCase();
  return `OV${ts}${rand}`;
}

/**
 * 防止單一帳號 spam 建訂單(換 email 重試攻擊用):
 * 同 user 1 小時內 pending 訂單超過 N 筆就拒新建,要他先付完成或等久一點。
 */
async function checkOrderRateLimit(profileId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profileId)
    .eq("status", "pending")
    .gte("created_at", oneHourAgo);
  if ((count ?? 0) >= 8) {
    return {
      ok: false,
      reason: `您 1 小時內已建立 ${count} 筆未完成訂單,請先完成付款或稍後再試`,
    };
  }
  return { ok: true };
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
    .select("id, email, tier, is_alumni")
    .eq("auth_id", user.id)
    .single();

  if (!profile) {
    return { error: "找不到用戶資料" };
  }

  // Pro 訂閱不含大師課,UI 已寫明,不該因 tier='pro' 擋下單(audit T0-7)
  // 真正擋重複下單看 course_access(下面 existing 檢查)
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

  // Rate limit:同 user 1 小時 pending 訂單上限 8 筆
  const rl = await checkOrderRateLimit(profile.id);
  if (!rl.ok) {
    return { error: rl.reason };
  }

  // Get course info (include alumni_price for server-side price computation)
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, price, alumni_price, access_type")
    .eq("id", courseId)
    .single();

  if (!course) {
    return { error: "課程不存在" };
  }

  // Pro 限定課程不接受買斷下單 — 學員要訂 Pro,不是付一筆 NT$X 永久解鎖
  if (course.access_type === "pro") {
    return { error: "此課程僅限 Pro 訂閱者觀看,請至 /pricing 訂閱" };
  }

  // Server-side authoritative price: alumni gets alumni_price if set and lower
  const effectivePrice =
    profile.is_alumni &&
    course.alumni_price !== null &&
    course.alumni_price !== undefined &&
    course.alumni_price < course.price
      ? course.alumni_price
      : course.price;

  if (effectivePrice === 0) {
    // Alumni legacy course or free course — grant access directly, skip payment
    await supabase.from("course_access").insert({
      user_id: profile.id,
      course_id: course.id,
      access_type: profile.is_alumni ? "alumni" : "purchased",
    });
    return { freeGranted: true };
  }

  const merchantOrderNo = generateOrderNo();
  const baseUrl = getBaseUrl();

  // Create pending order with the effective (possibly discounted) price
  const { error: insertError } = await supabase.from("orders").insert({
    merchant_order_no: merchantOrderNo,
    user_id: profile.id,
    course_id: course.id,
    order_type: "course",
    amount: effectivePrice,
    status: "pending",
  });

  if (insertError) {
    console.error("Create order error:", insertError);
    return { error: "建立訂單失敗，請稍後再試" };
  }

  // Generate payment form
  const paymentForm = createPaymentForm({
    orderId: merchantOrderNo,
    amount: effectivePrice,
    description: `牛津視界 — ${course.title}${
      effectivePrice !== course.price ? "（老學員優惠價）" : ""
    }`,
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

  // Rate limit:同 user 1 小時 pending 訂單上限 8 筆(防換 endpoint spam)
  const rl = await checkOrderRateLimit(profile.id);
  if (!rl.ok) {
    return { error: rl.reason };
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

/** 加購 NT$149 = +500k Sonnet tokens */
export async function createChatTopupOrder() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { error: "找不到 profile" };

  // Rate limit:同 user 1 小時 pending 訂單上限 8 筆
  const rl = await checkOrderRateLimit(profile.id);
  if (!rl.ok) {
    return { error: rl.reason };
  }

  const merchantOrderNo = generateOrderNo();
  const baseUrl = getBaseUrl();
  const amount = 149;

  const { error: insertError } = await supabase.from("orders").insert({
    merchant_order_no: merchantOrderNo,
    user_id: profile.id,
    course_id: null,
    order_type: "chat_topup_149",
    amount,
    status: "pending",
  });
  if (insertError) {
    console.error("Create chat topup order error:", insertError);
    return { error: "建立訂單失敗" };
  }

  const paymentForm = createPaymentForm({
    orderId: merchantOrderNo,
    amount,
    description: "牛津視界 — Eyesy 深度模式加購（+500k tokens）",
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
