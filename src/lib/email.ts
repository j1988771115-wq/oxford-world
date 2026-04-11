import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = "Oxford Vision <noreply@oxford-vision.com>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const { error } = await getResend().emails.send({
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
  // Resend batch: max 100 per call
  const batches = [];
  for (let i = 0; i < emails.length; i += 100) {
    batches.push(emails.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;

  for (const batch of batches) {
    const { error } = await getResend().emails.send({
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
