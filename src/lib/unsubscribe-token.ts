import { createHmac, timingSafeEqual } from "crypto";

/**
 * Unsubscribe HMAC token (Codex review patch).
 *
 * 防猜 email 代退訂 - 沒 secret 不能產對應 token。
 * 同一個 email 永遠對應同一個 token (deterministic, 不過期 — 因為 unsubscribe
 * 動作本身無時間 sensitivity,user link 可能存在 inbox 多年)。
 */

function getSecret(): string {
  const secret = (process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.ADMIN_PASSWORD || "").trim();
  if (!secret) {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET (or ADMIN_PASSWORD fallback) missing"
    );
  }
  return secret;
}

export function generateUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHmac("sha256", getSecret())
    .update(`${normalized}::unsubscribe`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  try {
    const expected = generateUnsubscribeToken(email);
    if (expected.length !== token.length) return false;
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(token, "utf8"));
  } catch {
    return false;
  }
}

export function getUnsubscribeUrl(email: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://oxford-vision.com";
  const token = generateUnsubscribeToken(email);
  return `${base}/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}
