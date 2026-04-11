import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";

// Generate a session token derived from password + random salt
// This way the cookie never contains the raw password
function generateSessionToken(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHmac("sha256", password).update(salt).digest("hex");
  return `${salt}:${hash}`;
}

function verifySessionToken(token: string, password: string): boolean {
  const [salt, hash] = token.split(":");
  if (!salt || !hash) return false;
  const expected = createHmac("sha256", password).update(salt).digest("hex");
  return hash === expected;
}

export async function POST(req: Request) {
  const { password } = await req.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
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
