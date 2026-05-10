import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ email?: string; token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold text-rose-300">無效連結</h1>
        <p className="text-white/70">缺少必要參數,請從 email 內連結點進來。</p>
      </Layout>
    );
  }

  const valid = verifyUnsubscribeToken(email, token);
  if (!valid) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold text-rose-300">驗證失敗</h1>
        <p className="text-white/70">取消訂閱 token 無效或已過期。若需協助,請寄信至 yupupin@gmail.com</p>
      </Layout>
    );
  }

  // service role insert (RLS service role only)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase
    .from("email_unsubscribes")
    .upsert({ email: normalized, source: "token_click" }, { onConflict: "email" });
  if (error) {
    return (
      <Layout>
        <h1 className="text-2xl font-bold text-rose-300">系統錯誤</h1>
        <p className="text-white/70">取消訂閱寫入失敗,請寄信至 yupupin@gmail.com</p>
        <p className="text-xs text-white/40 mt-4">{error.message}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-emerald-300">已取消訂閱 ✓</h1>
      <p className="text-white/85 leading-relaxed">
        我們已將 <strong className="text-white">{normalized}</strong> 從牛津視界的行銷信件名單移除。
      </p>
      <p className="text-white/60 text-sm">
        你不會再收到行銷或推廣信。但訂單通知、付款確認等服務性信件不受影響。
      </p>
      <p className="text-white/40 text-xs pt-4 border-t border-white/10">
        如果是誤點,請寄信給 yupupin@gmail.com 我們會重新加回。
      </p>
      <Link href="/" className="inline-block mt-4 text-amber-300 hover:underline">
        ← 回牛津視界首頁
      </Link>
    </Layout>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-slate-900/60 border border-white/10 rounded-2xl p-8 space-y-4 text-white">
        {children}
      </div>
    </main>
  );
}
