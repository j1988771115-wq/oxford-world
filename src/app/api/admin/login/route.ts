import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { verify } from "otplib";

// Generate a session token derived from password + random salt
// This way the cookie never contains the raw password
function generateSessionToken(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", password).update(salt).digest("hex");
  return `${salt}:${hash}`;
}

// Rate-limit:in-memory bucket per IP,5 次/分鐘
const RATE: Map<string, number[]> = new Map();
function ipRateLimit(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (RATE.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  RATE.set(ip, recent);
  if (RATE.size > 5000) {
    for (const [k, v] of RATE.entries()) {
      if (v.every((t) => now - t > windowMs * 5)) RATE.delete(k);
    }
  }
  return true;
}

export async function POST(req: Request) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!ipRateLimit(ip)) {
    return NextResponse.json({ error: "too many attempts" }, { status: 429 });
  }

  let body: { password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { password, code } = body;
  // .trim() 對齊 admin-auth.ts 的驗證,避免 Vercel env 帶 \n 造成永遠驗不過
  const expected = (process.env.ADMIN_PASSWORD || "").trim();

  if (!expected) {
    return NextResponse.json({ error: "service unconfigured" }, { status: 503 });
  }
  // timing-safe compare
  const a = Buffer.from(String(password || ""), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }

  // TOTP 2FA — 只在 ADMIN_TOTP_SECRET 有設時驗證
  // 沒設時 fallback 只驗密碼,避免設定 secret 前自己被鎖在外面
  const totpSecret = (process.env.ADMIN_TOTP_SECRET || "").trim();
  if (totpSecret) {
    const codeStr = String(code || "").replace(/\s/g, "");
    if (!/^\d{6}$/.test(codeStr)) {
      return NextResponse.json({ error: "code required", needs2FA: true }, { status: 401 });
    }
    // 容忍 ±30 秒時鐘漂移
    const result = await verify({
      secret: totpSecret,
      token: codeStr,
      strategy: "totp",
      epochTolerance: 30,
    });
    if (!result.valid) {
      return NextResponse.json({ error: "wrong code", needs2FA: true }, { status: 401 });
    }
  }

  const sessionToken = generateSessionToken(expected);

  const cookieStore = await cookies();
  cookieStore.set("admin_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.json({ ok: true });
}
