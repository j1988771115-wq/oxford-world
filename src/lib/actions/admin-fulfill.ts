"use server";

import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";
import { sendOrderConfirmation } from "@/lib/email";
import { sendCoursePurchaseAlert } from "@/lib/donate-alert";
import { addProRole } from "@/lib/discord";
import { addSonnetTopup } from "@/lib/chat-quota";
import { queryNewebPayOrder } from "@/lib/newebpay";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * 全自動對帳:抓所有 pending 訂單,逐筆問藍新真實付款狀態,SUCCESS 的自動補單
 */
export async function adminBulkReconcileNewebPay() {
  if (!(await isAdmin())) return { error: "unauthorized" };
  const supabase = getAdminClient();
  const { data: pending } = await supabase
    .from("orders")
    .select("merchant_order_no, amount, order_type, profiles(email, display_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);

  const results: Array<{
    order: string;
    email?: string | null;
    amount: number;
    newebpay_status: string;
    fulfilled?: boolean;
    note?: string;
  }> = [];

  for (const o of pending || []) {
    const profile = o.profiles as { email?: string | null; display_name?: string | null } | null;
    const q = await queryNewebPayOrder(o.merchant_order_no, o.amount);
    const entry: (typeof results)[number] = {
      order: o.merchant_order_no,
      email: profile?.email,
      amount: o.amount,
      newebpay_status: q.status,
    };
    if (q.status === "SUCCESS") {
      // 自動補單
      const fd = new FormData();
      fd.set("merchant_order_no", o.merchant_order_no);
      fd.set("trade_no", q.tradeNo || "");
      const fulfill = await adminFulfillOrder(fd);
      entry.fulfilled = !("error" in fulfill && fulfill.error);
      entry.note = "ok" in fulfill && fulfill.ok ? fulfill.summary : (fulfill as { error?: string }).error;
    } else if (q.status === "ERROR") {
      entry.note = q.error;
    }
    results.push(entry);
  }
  revalidatePath("/admin/orders");
  return {
    ok: true,
    total: results.length,
    fulfilled: results.filter((r) => r.fulfilled).length,
    succeeded_in_newebpay: results.filter((r) => r.newebpay_status === "SUCCESS").length,
    results,
  };
}

/**
 * 後台手動補單 — 金流出狀況時 1 鍵把 pending 訂單變 paid + grant access + 推 alert + 寄信。
 * Idempotent:重複呼叫不會壞東西。
 */
export async function adminFulfillOrder(formData: FormData) {
  if (!(await isAdmin())) {
    return { error: "unauthorized" };
  }
  const merchantOrderNo = String(formData.get("merchant_order_no") || "").trim();
  const tradeNo = String(formData.get("trade_no") || "").trim() || `MANUAL_${Date.now()}`;
  if (!merchantOrderNo) {
    return { error: "請填訂單編號" };
  }

  const supabase = getAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, profiles(id, auth_id, email, display_name, discord_id)")
    .eq("merchant_order_no", merchantOrderNo)
    .single();
  if (!order) {
    return { error: `找不到訂單 ${merchantOrderNo}` };
  }

  // mark paid (idempotent)
  const wasPaid = order.status === "paid";
  if (!wasPaid) {
    const { error: upErr } = await supabase
      .from("orders")
      .update({
        status: "paid",
        newebpay_trade_no: order.newebpay_trade_no || tradeNo,
        paid_at: order.paid_at || new Date().toISOString(),
      })
      .eq("merchant_order_no", merchantOrderNo);
    if (upErr) return { error: `update order: ${upErr.message}` };
  }

  // fulfillment 分支
  const profile = order.profiles as {
    id: string;
    email: string | null;
    display_name: string | null;
    discord_id: string | null;
  } | null;

  let courseTitle = "牛津視界";
  let courseSlug: string | undefined;
  let proBundleDays: number | undefined;

  if (order.order_type === "course" && order.course_id) {
    const { error: accessError } = await supabase.from("course_access").upsert(
      {
        user_id: order.user_id,
        course_id: order.course_id,
        access_type: "purchased",
      },
      { onConflict: "user_id,course_id,access_type" }
    );
    if (accessError) return { error: `grant access: ${accessError.message}` };

    const { data: course } = await supabase
      .from("courses")
      .select("title, slug, pro_bundle_days")
      .eq("id", order.course_id)
      .single();
    courseTitle = course?.title || courseTitle;
    courseSlug = course?.slug;
    proBundleDays = course?.pro_bundle_days || undefined;

    if (course?.pro_bundle_days && course.pro_bundle_days > 0 && profile) {
      const { data: prof2 } = await supabase
        .from("profiles")
        .select("pro_expires_at, discord_id")
        .eq("id", order.user_id)
        .single();
      const now = new Date();
      const cur = prof2?.pro_expires_at ? new Date(prof2.pro_expires_at) : now;
      const base = cur > now ? cur : now;
      const newExpiry = new Date(base.getTime() + course.pro_bundle_days * 86400000);
      await supabase
        .from("profiles")
        .update({ tier: "pro", pro_expires_at: newExpiry.toISOString() })
        .eq("id", order.user_id);
      if (prof2?.discord_id) await addProRole(prof2.discord_id);
    }
  } else if (order.order_type === "subscription") {
    await supabase
      .from("profiles")
      .update({ tier: "pro" })
      .eq("id", order.user_id);
    if (profile?.discord_id) await addProRole(profile.discord_id);
  } else if (order.order_type === "chat_topup_149") {
    try {
      await addSonnetTopup(order.user_id, 1);
    } catch (e) {
      return { error: `topup: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  // 通知 + 寄信(best-effort)
  const notifications: string[] = [];
  if (profile?.email && order.order_type !== "chat_topup_149") {
    try {
      await sendOrderConfirmation({
        to: profile.email,
        orderType: order.order_type as "course" | "subscription",
        itemTitle: courseTitle,
        amount: order.amount,
        merchantOrderNo,
        proBundleDays,
      });
      notifications.push("✉️ confirmation email");
    } catch (e) {
      notifications.push(`✉️ email FAIL ${e instanceof Error ? e.message : ""}`);
    }
  }
  if (order.order_type === "course") {
    try {
      const r = await sendCoursePurchaseAlert({
        donorName: profile?.display_name,
        donorEmail: profile?.email,
        amount: order.amount,
        courseTitle,
        courseSlug,
      });
      notifications.push(
        r && "ok" in r && r.ok ? "📣 OBS alert" : `📣 alert SKIP ${JSON.stringify(r)}`
      );
    } catch (e) {
      notifications.push(`📣 alert FAIL ${e instanceof Error ? e.message : ""}`);
    }
  }

  revalidatePath("/admin/orders");
  return {
    ok: true,
    merchantOrderNo,
    wasPaid,
    notifications,
    summary: `${wasPaid ? "(訂單已 paid,只補 fulfillment)" : "✅ paid + access granted"} · ${notifications.join(" · ")}`,
  };
}
