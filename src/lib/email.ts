import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// transactional 信(訂單確認 / 異常警報) 用 noreply@ — 純系統通知不期望回信
const FROM_EMAIL = "Oxford Vision <noreply@oxford-vision.com>";
// marketing / outreach 信 (sendBatchEmails) 用 jiu@ 個人化 — Gmail 看像個人寄信
// 5/11 deliverability 改:noreply@ 是 Promotions magnet,jiu@ 進 Primary inbox 機率高
const MARKETING_FROM_EMAIL = "久方武 <jiu@oxford-vision.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://oxford-vision.com";

interface OrderConfirmationParams {
  to: string;
  orderType: "course" | "subscription";
  itemTitle: string;
  amount: number;
  merchantOrderNo: string;
  proBundleDays?: number;
  accessUrl?: string;
}

export async function sendOrderConfirmation(p: OrderConfirmationParams) {
  const subject =
    p.orderType === "course"
      ? `[牛津視界] 購買成功 — ${p.itemTitle}`
      : `[牛津視界] Pro 訂閱啟用 — ${p.itemTitle}`;
  const accessLabel = p.orderType === "course" ? "立刻開始學習" : "前往會員中心";
  const accessHref = p.accessUrl || `${SITE_URL}/dashboard`;
  const bundleSection = p.proBundleDays
    ? `<p style="margin:16px 0;background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;font-size:14px;line-height:1.6;">
         <strong>🎁 加贈 Pro ${p.proBundleDays} 天</strong><br/>即日起開通，期間 AI 助教 Eyesy 全範圍開放、Pro 限定內容皆可閱讀。
       </p>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f1729;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#0a1f44 0%,#1e3a8a 100%);padding:24px 32px;color:#fff;">
  <div style="font-size:13px;letter-spacing:.1em;opacity:.7;text-transform:uppercase;">牛津視界</div>
  <h1 style="margin:8px 0 0;font-size:22px;">購買成功</h1>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">您好，感謝您的支持！以下是訂單明細：</p>
  <table width="100%" cellpadding="10" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-size:14px;">
    <tr><td style="color:#6b7280;">項目</td><td style="font-weight:600;text-align:right;">${p.itemTitle}</td></tr>
    <tr><td style="color:#6b7280;">金額</td><td style="font-weight:700;text-align:right;font-size:18px;">NT$${p.amount.toLocaleString()}</td></tr>
    <tr><td style="color:#6b7280;">訂單編號</td><td style="font-family:monospace;font-size:12px;text-align:right;">${p.merchantOrderNo}</td></tr>
  </table>
  ${bundleSection}
  <p style="margin:24px 0;text-align:center;">
    <a href="${accessHref}" style="display:inline-block;background:#0a1f44;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">${accessLabel}</a>
  </p>
  <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
    發票將另寄送。退款政策：依消費者保護法數位內容例外規定，課程一經開通即不退款。如有問題請回信給我們。
  </p>
</td></tr></table>
</td></tr></table></body></html>`;

  return sendEmail({ to: p.to, subject, html });
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send", { to, subject });
    return { error: "email service not configured", skipped: true };
  }

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    console.error("Send email error:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function sendBatchEmails({
  emails,
  subject,
  html,
  replyTo,
  groupSize = 1,
}: {
  emails: string[];
  subject: string;
  html: string;
  replyTo?: string;
  /**
   * 每個 envelope 包多少 receivers:
   * - 1 (default):每人一封獨立 envelope。最安全(零外流)、最多 envelope = Gmail 容易 mark Promotions
   * - 5+:每 N 人 BCC 一封。To 留空 / from 自己,bcc=[N emails]。每 receiver 仍看不到對方,
   *   但 envelope 數少 N 倍 = Gmail 比較不會 bulk-classify → Primary inbox 機率高
   */
  groupSize?: number;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping batch", {
      count: emails.length,
      subject,
    });
    return { sent: 0, failed: 0, skipped: emails.length };
  }

  let sent = 0;
  let failed = 0;
  const dedup = [...new Set(emails.map((e) => e.trim().toLowerCase()))].filter(Boolean);

  // marketing/outreach 用 jiu@ 個人化 sender + List-Unsubscribe header → Gmail
  // 比較會放 Primary / Updates(不是 Promotions)。同時 reply-to 也對齊到 yupupin
  // 確保學員 reply 進久老師信箱(Gmail 看到 reply 強化 sender reputation)
  const marketingFrom = MARKETING_FROM_EMAIL;
  // List-Unsubscribe RFC 8058 (mailto only,不放 https 因為沒寫 endpoint
  // page,放 invalid URL 反而被 Gmail 懲罰)。mailto: 信寄到 unsubscribe@
  // 後續可加 cron 處理。Gmail 看到合法 List-Unsubscribe 比較不會 mark Promotions。
  const unsubscribeHeaders = {
    "List-Unsubscribe": "<mailto:unsubscribe@oxford-vision.com>",
  };
  // 關 Resend tracking — 預設 open_tracking + click_tracking 都 ON,會插 tracking
  // pixel + redirect link via re.resend.com。Gmail 看到第三方 redirect 一律認 marketing
  // → Promotions tab。關掉之後信件純文字無第三方 tracking,看起來像個人寄信。
  // Gemini deliverability review 強調 tracking 比 List-Unsubscribe 影響更大。

  if (groupSize <= 1) {
    // Individual mode: 每人一封獨立 envelope
    for (let i = 0; i < dedup.length; i += 100) {
      const slice = dedup.slice(i, i + 100);
      const payload = slice.map((to) => ({
        from: marketingFrom,
        to: [to],
        subject,
        html,
        headers: unsubscribeHeaders,
        open_tracking: false,
        click_tracking: false,
        ...(replyTo ? { replyTo } : {}),
      }));
      const { data, error } = await resend.batch.send(payload);
      if (error) {
        console.error("[email] batch.send error:", error);
        failed += slice.length;
      } else {
        const ok = Array.isArray(data?.data) ? data.data.length : slice.length;
        sent += ok;
      }
    }
  } else {
    // BCC group mode: 每 groupSize 人 1 封 envelope, BCC 隱藏所有 receivers
    // To 欄填 from address (Resend 不接受空 to)
    const fromMatch = marketingFrom.match(/<([^>]+)>/);
    const fromAddr = fromMatch ? fromMatch[1] : marketingFrom;
    const groups: string[][] = [];
    for (let i = 0; i < dedup.length; i += groupSize) {
      groups.push(dedup.slice(i, i + groupSize));
    }
    // Resend batch.send 一次 100 個 envelope 上限,我們的 group 通常 < 100 envelopes
    for (let i = 0; i < groups.length; i += 100) {
      const slice = groups.slice(i, i + 100);
      const payload = slice.map((bccGroup) => ({
        from: marketingFrom,
        to: [fromAddr],
        bcc: bccGroup,
        subject,
        html,
        headers: unsubscribeHeaders,
        open_tracking: false,
        click_tracking: false,
        ...(replyTo ? { replyTo } : {}),
      }));
      const { data, error } = await resend.batch.send(payload);
      if (error) {
        console.error("[email] batch.send (BCC) error:", error);
        failed += slice.reduce((sum, g) => sum + g.length, 0);
      } else {
        const okGroups = Array.isArray(data?.data) ? data.data.length : slice.length;
        // sent count 算實際 BCC receivers
        for (let j = 0; j < okGroups; j++) {
          sent += slice[j]?.length ?? 0;
        }
      }
    }
  }

  return { sent, failed };
}

interface InstructorAlertParams {
  to: string;
  courseTitle: string;
  buyerDisplayName?: string | null;
  buyerEmail: string;
  amount: number;
  merchantOrderNo: string;
  paidAt?: string;
}

/**
 * 通知講師：有人購買了你的課
 * 不擋 webhook,失敗 best-effort
 */
export async function sendInstructorPurchaseAlert(p: InstructorAlertParams) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] Resend not configured, skip instructor alert");
    return { skipped: true };
  }

  const buyerLabel = p.buyerDisplayName
    ? `${p.buyerDisplayName} <${p.buyerEmail}>`
    : p.buyerEmail;
  const paidAtStr = p.paidAt
    ? new Date(p.paidAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
    : new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f1729;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#0a1f44 0%,#1e3a8a 100%);padding:24px 32px;color:#fff;">
  <div style="font-size:13px;letter-spacing:.1em;opacity:.7;text-transform:uppercase;">牛津視界</div>
  <h1 style="margin:8px 0 0;font-size:22px;">您的課程剛被購買 🎉</h1>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">恭喜，有新學員加入了：</p>
  <table width="100%" cellpadding="10" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-size:14px;">
    <tr><td style="color:#6b7280;width:90px;">課程</td><td style="font-weight:600;">${p.courseTitle}</td></tr>
    <tr><td style="color:#6b7280;">學員</td><td>${buyerLabel}</td></tr>
    <tr><td style="color:#6b7280;">金額</td><td style="font-weight:700;font-size:16px;">NT$${p.amount.toLocaleString()}</td></tr>
    <tr><td style="color:#6b7280;">訂單編號</td><td style="font-family:monospace;font-size:12px;">${p.merchantOrderNo}</td></tr>
    <tr><td style="color:#6b7280;">付款時間</td><td>${paidAtStr}</td></tr>
  </table>
  <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">這封自動通知由牛津視界系統發出，每筆付款成功都會即時寄送一封。如不再需要請通知 support@oxford-vision.com 關閉。</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [p.to],
      subject: `[牛津視界] 新購買通知 — ${p.courseTitle}`,
      html,
    });
    if (error) {
      console.error("Instructor alert email error:", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (e) {
    console.error("Instructor alert exception:", e);
    return { sent: false, error: e instanceof Error ? e.message : String(e) };
  }
}
