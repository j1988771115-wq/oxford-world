import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f1729;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#0a1f44 0%,#1e3a8a 100%);padding:24px 32px;color:#fff;">
  <div style="font-size:13px;letter-spacing:.1em;opacity:.7;text-transform:uppercase;">牛津視界</div>
  <h1 style="margin:8px 0 0;font-size:22px;">課程已開通,並向您致歉</h1>
</td></tr>
<tr><td style="padding:32px;">
  <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">芳銘您好,</p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">感謝您今天上午購買《太空時代的資本配置》。您的付款 09:13 已通過審核,但我們的金流通知系統有一段延遲,直到剛才才確認到您的訂單,讓您等了將近一整天才能進入課程,真的很抱歉。</p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">您的課程權限<strong>現已開通</strong>,點擊下方按鈕即可立刻開始觀看 8 章太空產業深度解析,加 Eyesy 學後思考題。</p>
  <table width="100%" cellpadding="10" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;font-size:14px;margin:16px 0;">
    <tr><td style="color:#6b7280;">課程</td><td style="font-weight:600;text-align:right;">太空時代的資本配置</td></tr>
    <tr><td style="color:#6b7280;">金額</td><td style="font-weight:700;text-align:right;">NT$24,900</td></tr>
    <tr><td style="color:#6b7280;">訂單編號</td><td style="font-family:monospace;font-size:12px;text-align:right;">OVMOM7URARB5OV</td></tr>
    <tr><td style="color:#6b7280;">藍新交易序號</td><td style="font-family:monospace;font-size:12px;text-align:right;">26050101244895111</td></tr>
  </table>
  <p style="margin:24px 0;text-align:center;">
    <a href="https://oxford-vision.com/courses/master-space-age-capital" style="display:inline-block;background:#0a1f44;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">立刻開始學習</a>
  </p>
  <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.7;">
    若再有任何問題,請直接回覆此信。再次謝謝您今天的支持與耐心。<br/><br/>— 牛津視界團隊
  </p>
</td></tr></table>
</td></tr></table></body></html>`;

resend.emails.send({
  from: "Oxford Vision <noreply@oxford-vision.com>",
  to: ["ccj5084@gmail.com"],
  subject: "[牛津視界] 課程已開通,並為通知延遲致歉",
  html,
}).then(({ data, error }) => {
  if (error) {
    console.error("FAIL:", error);
    process.exit(1);
  }
  console.log("SENT:", data);
});
