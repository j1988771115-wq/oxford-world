import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

/**
 * RFC 8058 One-Click Unsubscribe POST endpoint。
 *
 * Gmail / Outlook 等對含 `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header
 * 的信件,user 在收信端點 "Unsubscribe" 時會 POST 此 URL (不開瀏覽器),立刻 unsubscribe。
 * RFC 8058 specifies form-data body `List-Unsubscribe=One-Click`,但實作上多數 client
 * 只 POST 不帶 body。我們驗 URL 上的 token 即可。
 */

export const dynamic = "force-dynamic";

async function processUnsubscribe(email: string | null, token: string | null) {
  if (!email || !token) {
    return NextResponse.json({ error: "missing email or token" }, { status: 400 });
  }
  if (!verifyUnsubscribeToken(email, token)) {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase
    .from("email_unsubscribes")
    .upsert({ email: normalized, source: "one_click" }, { onConflict: "email" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, email: normalized });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  return processUnsubscribe(url.searchParams.get("email"), url.searchParams.get("token"));
}

// 兼容某些 client GET (e.g. curl test)
export async function GET(req: Request) {
  const url = new URL(req.url);
  return processUnsubscribe(url.searchParams.get("email"), url.searchParams.get("token"));
}
