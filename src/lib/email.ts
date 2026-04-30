import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "Oxford Vision <noreply@oxford-vision.com>";
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
}: {
  to: string | string[];
  subject: string;
  html: string;
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
}: {
  emails: string[];
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping batch", {
      count: emails.length,
      subject,
    });
    return { sent: 0, failed: 0, skipped: emails.length };
  }

  const batches = [];
  for (let i = 0; i < emails.length; i += 100) {
    batches.push(emails.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;

  for (const batch of batches) {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: batch,
      subject,
      html,
    });

    if (error) {
      console.error("Batch email error:", error);
      failed += batch.length;
    } else {
      sent += batch.length;
    }
  }

  return { sent, failed };
}
