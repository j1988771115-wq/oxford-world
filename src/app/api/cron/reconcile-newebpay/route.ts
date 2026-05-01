import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { queryNewebPayOrder } from "@/lib/newebpay";
import { sendOrderConfirmation } from "@/lib/email";
import { sendCoursePurchaseAlert } from "@/lib/donate-alert";
import { addProRole } from "@/lib/discord";
import { addSonnetTopup } from "@/lib/chat-quota";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * 每 30 分鐘自動對帳:抓最近 24 小時 pending 訂單,問藍新真實狀態
 * SUCCESS 的自動 mark paid + grant access + 寄信 + 推抖內 alert。
 *
 * 這是 webhook fail safe — 即使 NotifyURL 永遠打不到,30 分鐘內客戶仍會自動開課。
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getAdminClient();

  // 只看最近 24 小時的 pending,避免一直查藍新很舊的訂單(已過期)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: pending } = await supabase
    .from("orders")
    .select("merchant_order_no, amount, order_type, course_id, user_id, created_at")
    .eq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, fulfilled: 0, message: "no pending orders" });
  }

  let fulfilled = 0;
  let stillPending = 0;
  let queryFailed = 0;
  const fulfilledOrders: string[] = [];

  for (const o of pending) {
    const q = await queryNewebPayOrder(o.merchant_order_no, o.amount);

    if (q.status === "ERROR" || q.status === "NOT_FOUND") {
      queryFailed += 1;
      continue;
    }
    if (q.status !== "SUCCESS") {
      stillPending += 1;
      continue;
    }

    // 補單 — atomic + idempotent
    const { data: justUpdated } = await supabase
      .from("orders")
      .update({
        status: "paid",
        newebpay_trade_no: q.tradeNo || `CRON_${Date.now()}`,
        paid_at: new Date().toISOString(),
      })
      .eq("merchant_order_no", o.merchant_order_no)
      .eq("status", "pending")
      .select("*, profiles(id, email, display_name, discord_id)")
      .single();

    if (!justUpdated) continue; // 已被別的 path 補了

    // 開通 access / fulfillment
    if (o.order_type === "course" && o.course_id) {
      await supabase.from("course_access").upsert(
        {
          user_id: o.user_id,
          course_id: o.course_id,
          access_type: "purchased",
        },
        { onConflict: "user_id,course_id,access_type" }
      );

      const { data: course } = await supabase
        .from("courses")
        .select("title, slug, pro_bundle_days")
        .eq("id", o.course_id)
        .single();

      if (course?.pro_bundle_days && course.pro_bundle_days > 0) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("pro_expires_at, discord_id")
          .eq("id", o.user_id)
          .single();
        const now = new Date();
        const cur = prof?.pro_expires_at ? new Date(prof.pro_expires_at) : now;
        const base = cur > now ? cur : now;
        const newExpiry = new Date(base.getTime() + course.pro_bundle_days * 86400000);
        await supabase
          .from("profiles")
          .update({ tier: "pro", pro_expires_at: newExpiry.toISOString() })
          .eq("id", o.user_id);
        if (prof?.discord_id) await addProRole(prof.discord_id);
      }

      const profile = justUpdated.profiles as
        | { email: string | null; display_name: string | null }
        | null;
      if (profile?.email) {
        await sendOrderConfirmation({
          to: profile.email,
          orderType: "course",
          itemTitle: course?.title || "課程",
          amount: o.amount,
          merchantOrderNo: o.merchant_order_no,
          proBundleDays: course?.pro_bundle_days || undefined,
        }).catch((e) => console.warn("[cron-reconcile] email fail", e));
      }
      await sendCoursePurchaseAlert({
        donorName: profile?.display_name,
        donorEmail: profile?.email,
        amount: o.amount,
        courseTitle: course?.title || "課程",
        courseSlug: course?.slug,
      }).catch((e) => console.warn("[cron-reconcile] alert fail", e));
    } else if (o.order_type === "subscription") {
      const proExpiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      await supabase
        .from("profiles")
        .update({ tier: "pro", pro_expires_at: proExpiresAt })
        .eq("id", o.user_id);
      const profile = justUpdated.profiles as { discord_id?: string; email?: string | null; display_name?: string | null } | null;
      if (profile?.discord_id) await addProRole(profile.discord_id);
      if (profile?.email) {
        await sendOrderConfirmation({
          to: profile.email,
          orderType: "subscription",
          itemTitle: "Pro 訂閱（30 天）",
          amount: o.amount,
          merchantOrderNo: o.merchant_order_no,
        }).catch((e) => console.warn("[cron-reconcile] sub email fail", e));
      }
    } else if (o.order_type === "chat_topup_149") {
      try {
        await addSonnetTopup(o.user_id, 1);
        const profile = justUpdated.profiles as { email?: string | null } | null;
        if (profile?.email) {
          await sendOrderConfirmation({
            to: profile.email,
            orderType: "course",
            itemTitle: "Eyesy 深度模式加購（+500k tokens）",
            amount: o.amount,
            merchantOrderNo: o.merchant_order_no,
          }).catch((e) => console.warn("[cron-reconcile] topup email fail", e));
        }
      } catch (e) {
        console.warn("[cron-reconcile] topup fail", e);
      }
    }

    fulfilled += 1;
    fulfilledOrders.push(o.merchant_order_no);
  }

  console.log("[cron-reconcile-newebpay]", {
    processed: pending.length,
    fulfilled,
    stillPending,
    queryFailed,
    fulfilledOrders,
  });

  return NextResponse.json({
    processed: pending.length,
    fulfilled,
    stillPending,
    queryFailed,
    fulfilledOrders,
  });
}
