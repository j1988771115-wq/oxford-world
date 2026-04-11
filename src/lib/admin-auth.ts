import { cookies } from "next/headers";
import { createHmac } from "crypto";

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const password = process.env.ADMIN_PASSWORD;

  if (!password || !token) return false;

  const [salt, hash] = token.split(":");
  if (!salt || !hash) return false;

  const expected = createHmac("sha256", password).update(salt).digest("hex");
  return hash === expected;
}
