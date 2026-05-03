import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendInstructorPurchaseAlert } from "@/lib/email";

// Admin only。透過 CRON_SECRET 驗證。
// POST /api/admin/resend-instructor-alert?order=OVMOPPG1Z2CHTF
// 為一筆已 paid 的 course 訂單補寄一封給講師(env COURSE_INSTRUCTOR_EMAIL)。
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const merchantOrderNo = url.searchParams.get("order");
  if (!merchantOrderNo) {
    return NextResponse.json({ error: "missing ?order=" }, { status: 400 });
  }

  const instructorEmail = (process.env.COURSE_INSTRUCTOR_EMAIL || "").trim();
  if (!instructorEmail) {
    return NextResponse.json({ error: "COURSE_INSTRUCTOR_EMAIL not set" }, { status: 500 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order, error: oErr } = await sb
    .from("orders")
    .select("merchant_order_no, amount, status, paid_at, course_id, user_id")
    .eq("merchant_order_no", merchantOrderNo)
    .single();
  if (oErr || !order) {
    return NextResponse.json({ error: "order not found", details: oErr?.message }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: `order status=${order.status}, not paid` }, { status: 400 });
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("email, display_name")
    .eq("id", order.user_id)
    .single();

  let courseTitle = "牛津視界課程";
  if (order.course_id) {
    const { data: c } = await sb.from("courses").select("title").eq("id", order.course_id).single();
    if (c?.title) courseTitle = c.title;
  }

  const result = await sendInstructorPurchaseAlert({
    to: instructorEmail,
    courseTitle,
    buyerDisplayName: profile?.display_name,
    buyerEmail: profile?.email || "(unknown)",
    amount: order.amount,
    merchantOrderNo: order.merchant_order_no,
    paidAt: order.paid_at || undefined,
  });

  return NextResponse.json({ to: instructorEmail, order: merchantOrderNo, result });
}
