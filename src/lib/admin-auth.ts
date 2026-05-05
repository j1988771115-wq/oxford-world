import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  // .trim() 防 Vercel env 尾巴 \n 跟 Mux/NewebPay 同樣的雷
  const password = (process.env.ADMIN_PASSWORD || "").trim();

  if (!password || !token) return false;

  const [salt, hash] = token.split(":");
  if (!salt || !hash) return false;

  const expected = createHmac("sha256", password).update(salt).digest("hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(hash, "utf8"), Buffer.from(expected, "utf8"));
}
