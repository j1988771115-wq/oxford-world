import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Anomaly {
  severity: "P0" | "P1" | "P2";
  kind: string;
  details: string;
  count: number;
  evidence: unknown;
}

/**
 * 每小時掃 8 類攻擊/異常徵兆,有發現就寄 email + log。
 *
 * 設計參考 2026-05-02 danny wang 攻擊事件:
 * - 異常 streak / tier / pro_expires_at
 * - 非 OV 前綴 / amount < course.price 訂單
 * - 短時間 pending 訂單堆疊
 * - is_alumni 不在合法名單
 * - learning_events 異常爆量
 * - 多次 webhook bad decrypt
 */
export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "service unconfigured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  const anomalies: Anomaly[] = [];
  const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // 1. profile streak 異常(現實人類不可能 >30,新註冊更不可能)
  const { data: streakAnom } = await supabase
    .from("profiles")
    .select("email, display_name, current_streak, longest_streak, created_at")
    .or("current_streak.gt.30,longest_streak.gt.30");
  if (streakAnom && streakAnom.length > 0) {
    anomalies.push({
      severity: "P0",
      kind: "STREAK_INJECTION",
      details: "streak 欄位被人為塞入(>30 在新平台不可能)",
      count: streakAnom.length,
      evidence: streakAnom.slice(0, 5),
    });
  }

  // 2. pro_expires_at 超過 1 年(course bundle 是 90 天,訂閱是 30 天)
  const oneYearLater = new Date(Date.now() + 366 * 86400000).toISOString();
  const { data: proAnom } = await supabase
    .from("profiles")
    .select("email, display_name, tier, pro_expires_at")
    .gt("pro_expires_at", oneYearLater);
  if (proAnom && proAnom.length > 0) {
    anomalies.push({
      severity: "P0",
      kind: "PRO_EXPIRY_INJECTION",
      details: "pro_expires_at 超過 1 年(實際最多 90 天 bundle)",
      count: proAnom.length,
      evidence: proAnom,
    });
  }

  // 3. 非 OV 前綴的訂單(系統正規 generateOrderNo 永遠 OV 開頭)
  const { data: badPrefix } = await supabase
    .from("orders")
    .select("merchant_order_no, user_id, amount, status, profiles(email)")
    .not("merchant_order_no", "like", "OV%");
  if (badPrefix && badPrefix.length > 0) {
    anomalies.push({
      severity: "P0",
      kind: "FORGED_ORDER_NUMBER",
      details: "merchant_order_no 不是 OV 前綴(攻擊者直接 INSERT)",
      count: badPrefix.length,
      evidence: badPrefix,
    });
  }

  // 4. paid 訂單沒 newebpay_trade_no(沒走真實付款流程)
  const { data: noTradeNo } = await supabase
    .from("orders")
    .select("merchant_order_no, user_id, amount, paid_at, profiles(email)")
    .eq("status", "paid")
    .is("newebpay_trade_no", null);
  if (noTradeNo && noTradeNo.length > 0) {
    anomalies.push({
      severity: "P0",
      kind: "PAID_NO_TRADE_NO",
      details: "paid 訂單沒 newebpay_trade_no(可能是手動補單或攻擊)",
      count: noTradeNo.length,
      evidence: noTradeNo.slice(0, 10),
    });
  }

  // 5. 同一 user 1h 內 pending 訂單 >= 8 筆(我們的 rate limit 上限)
  const { data: spammers } = await supabase.rpc("count_pending_per_user_recent" as never, {} as never).select("*").maybeSingle();
  // 沒有 RPC 就跳過,改用查詢方式
  const { data: pendingRecent } = await supabase
    .from("orders")
    .select("user_id, profiles(email,display_name)")
    .eq("status", "pending")
    .gte("created_at", since1h);
  if (pendingRecent) {
    const byUser = new Map<string, { count: number; email?: string; name?: string }>();
    for (const o of pendingRecent) {
      const cur = byUser.get(o.user_id) || { count: 0 };
      cur.count++;
      const p = o.profiles as { email?: string; display_name?: string } | null;
      cur.email = p?.email;
      cur.name = p?.display_name;
      byUser.set(o.user_id, cur);
    }
    const flagged = [...byUser.entries()]
      .filter(([, v]) => v.count >= 8)
      .map(([uid, v]) => ({ user_id: uid, ...v }));
    if (flagged.length > 0) {
      anomalies.push({
        severity: "P1",
        kind: "ORDER_SPAM",
        details: `同 user 1 小時內 pending 訂單 >= 8 筆`,
        count: flagged.length,
        evidence: flagged,
      });
    }
  }

  // 6. is_alumni=true 但不在 alumni_emails 名單
  const { data: alumniProfiles } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("is_alumni", true);
  const { data: alumniWhitelist } = await supabase
    .from("alumni_emails")
    .select("email");
  if (alumniProfiles && alumniWhitelist) {
    const whitelist = new Set(alumniWhitelist.map((r) => r.email));
    const fakeAlumni = alumniProfiles.filter((p) => !whitelist.has(p.email));
    if (fakeAlumni.length > 0) {
      anomalies.push({
        severity: "P0",
        kind: "FAKE_ALUMNI",
        details: "is_alumni=true 但不在 alumni_emails 合法名單",
        count: fakeAlumni.length,
        evidence: fakeAlumni,
      });
    }
  }

  // 7. learning_events 24h 內單 user >= 100 筆(瘋狂刷 XP)
  const { data: events24h } = await supabase
    .from("learning_events")
    .select("user_id, profiles(email)")
    .gte("created_at", since24h);
  if (events24h) {
    const byUser = new Map<string, { count: number; email?: string }>();
    for (const e of events24h) {
      const cur = byUser.get(e.user_id) || { count: 0 };
      cur.count++;
      const p = e.profiles as { email?: string } | null;
      cur.email = p?.email;
      byUser.set(e.user_id, cur);
    }
    const spamUsers = [...byUser.entries()]
      .filter(([, v]) => v.count >= 100)
      .map(([uid, v]) => ({ user_id: uid, ...v }));
    if (spamUsers.length > 0) {
      anomalies.push({
        severity: "P1",
        kind: "XP_SPAM",
        details: "24 小時 learning_events >= 100 筆(刷 XP)",
        count: spamUsers.length,
        evidence: spamUsers,
      });
    }
  }

  // 9. paid 課程訂單沒對應發票(ezPay API fail / 商店未啟用)
  const { data: paidOrders } = await supabase
    .from("orders")
    .select("merchant_order_no, paid_at")
    .eq("status", "paid")
    .eq("order_type", "course")
    .not("paid_at", "is", null);
  if (paidOrders && paidOrders.length > 0) {
    const orderNos = paidOrders.map((o) => o.merchant_order_no);
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("merchant_order_no")
      .in("merchant_order_no", orderNos);
    const haveInvoice = new Set((existingInvoices || []).map((i) => i.merchant_order_no));
    const missing = paidOrders.filter((o) => !haveInvoice.has(o.merchant_order_no));
    if (missing.length > 0) {
      anomalies.push({
        severity: "P1",
        kind: "INVOICE_MISSING",
        details: `${missing.length} 筆 paid 課程訂單沒對應發票(ezPay API 失敗或商店未啟用),持續累積=稅務風險`,
        count: missing.length,
        evidence: missing
          .slice(0, 20)
          .map((o) => ({ order: o.merchant_order_no, paid_at: o.paid_at })),
      });
    }
  }

  // 8. course_access 重複 row(unique constraint 沒生效徵兆)
  const { data: allAccess } = await supabase
    .from("course_access")
    .select("user_id, course_id, access_type");
  if (allAccess) {
    const counts = new Map<string, number>();
    for (const a of allAccess) {
      const k = `${a.user_id}:${a.course_id}:${a.access_type}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const dupes = [...counts.entries()].filter(([, n]) => n > 1);
    if (dupes.length > 0) {
      anomalies.push({
        severity: "P2",
        kind: "COURSE_ACCESS_DUPLICATE",
        details: "course_access 出現重複 row(unique constraint 沒生效)",
        count: dupes.length,
        evidence: dupes.slice(0, 10).map(([k, n]) => ({ key: k, count: n })),
      });
    }
  }

  // 寄通知(有異常才寄)
  let notified = false;
  if (anomalies.length > 0) {
    const adminEmail = (process.env.ADMIN_ALERT_EMAIL || "j1988771115@gmail.com").trim();
    const subject = `[牛津視界 異常警報] 發現 ${anomalies.length} 類異常`;
    const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#0f1729;background:#f6f7f9;padding:24px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;padding:32px;">
<tr><td>
<h1 style="margin:0 0 16px;color:#dc2626;">⚠️ 牛津視界 異常警報</h1>
<p style="margin:0 0 24px;color:#6b7280;font-size:14px;">${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })} (台北時間)</p>
${anomalies
  .map(
    (a) => `
<div style="background:${a.severity === "P0" ? "#fee2e2" : a.severity === "P1" ? "#fef3c7" : "#e0f2fe"};border-left:4px solid ${a.severity === "P0" ? "#dc2626" : a.severity === "P1" ? "#d97706" : "#0284c7"};padding:16px;border-radius:6px;margin-bottom:16px;">
  <div style="font-size:12px;font-weight:bold;color:${a.severity === "P0" ? "#991b1b" : a.severity === "P1" ? "#92400e" : "#075985"};letter-spacing:0.05em;">[${a.severity}] ${a.kind}</div>
  <div style="font-size:14px;margin:8px 0;">${a.details}</div>
  <div style="font-size:12px;color:#374151;">命中 ${a.count} 筆</div>
  <details style="margin-top:8px;"><summary style="cursor:pointer;font-size:11px;color:#6b7280;">證據(前 10 筆)</summary>
  <pre style="font-size:10px;background:white;padding:8px;border-radius:4px;overflow-x:auto;margin-top:6px;">${JSON.stringify(a.evidence, null, 2).replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"))}</pre>
  </details>
</div>`
  )
  .join("")}
<p style="margin-top:24px;font-size:12px;color:#6b7280;">登入後台處理:<a href="https://oxford-vision.com/admin/orders">https://oxford-vision.com/admin/orders</a></p>
</td></tr></table>
</body></html>`;

    try {
      const r = await sendEmail({ to: adminEmail, subject, html });
      notified = !!r && (r as { id?: string }).id !== undefined;
    } catch (e) {
      console.error("[anomaly-watch] email send fail", e);
    }

    // log 完整 anomaly 到 Vercel
    console.warn("[anomaly-watch] alerts:", JSON.stringify(anomalies, null, 2));
  }

  return NextResponse.json({
    checked: 8,
    found: anomalies.length,
    notified,
    anomalies: anomalies.map((a) => ({ severity: a.severity, kind: a.kind, count: a.count })),
  });
}
