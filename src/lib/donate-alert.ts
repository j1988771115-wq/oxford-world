/**
 * 把課程購買事件推送到抖內系統 overlay alert(久方武 OBS 直播時彈窗)。
 * 失敗 best-effort,不擋付款流程。
 */
function maskDonor(name: string | null | undefined, email?: string | null): string {
  if (name && name.trim()) {
    const t = name.trim();
    if (t.length <= 1) return t + "**";
    return t.slice(0, 1) + "*".repeat(Math.min(t.length - 1, 3));
  }
  if (email) {
    const local = email.split("@")[0] || "";
    return (local.slice(0, 2) || "u") + "***";
  }
  return "學員";
}

interface CoursePurchaseAlert {
  donorName?: string | null;
  donorEmail?: string | null;
  amount: number;
  courseTitle: string;
  courseSlug?: string;
}

export async function sendCoursePurchaseAlert(p: CoursePurchaseAlert) {
  const url = process.env.DONATION_ALERT_URL;
  const key = process.env.DONATION_ALERT_KEY;
  const slug = process.env.DONATION_ALERT_SLUG;

  if (!url || !key || !slug) {
    console.warn("[donate-alert] env not set, skip");
    return { skipped: true };
  }

  const masked = maskDonor(p.donorName, p.donorEmail);
  const message = `購買了《${p.courseTitle}》`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify({
        streamer_slug: slug,
        donor_name: masked,
        amount: p.amount,
        message,
        course_slug: p.courseSlug,
        type: "course_purchase",
      }),
      // 短 timeout 避免擋住付款流程
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.warn(
        `[donate-alert] HTTP ${resp.status}: ${text.slice(0, 200)}`
      );
      return { error: `HTTP ${resp.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.warn(
      `[donate-alert] fetch failed: ${e instanceof Error ? e.message : String(e)}`
    );
    return { error: String(e) };
  }
}
