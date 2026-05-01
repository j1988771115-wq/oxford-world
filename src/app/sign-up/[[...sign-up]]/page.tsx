"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { signUp, signInWithGoogle } from "@/lib/actions/auth";

export default function SignUpPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-surface-container-lowest p-10 rounded-2xl deep-diffusion w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-on-surface to-secondary">
            牛津視界 Oxford Vision
          </Link>
          <h1 className="text-2xl font-black text-on-surface mt-4">建立帳號</h1>
        </div>

        {/* OAuth */}
        <div className="space-y-3 mb-6">
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-outline-variant/30 text-on-surface font-bold text-sm hover:bg-surface-container active:scale-[0.98] transition"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              使用 Google 註冊
            </button>
          </form>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-outline-variant/30" />
          <span className="text-on-surface-variant text-xs font-bold">使用 Email 註冊</span>
          <div className="flex-1 h-px bg-outline-variant/30" />
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-center">
            <p className="font-bold">{success}</p>
            <p className="text-sm mt-2 text-on-surface-variant">
              請檢查信箱（包括垃圾郵件）
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="name"
              type="text"
              required
              placeholder="你的名字"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container transition"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container transition"
            />
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="密碼（至少 6 位）"
                className="w-full px-4 py-3 pr-12 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-4 text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                name="newsletter"
                type="checkbox"
                defaultChecked
                className="mt-0.5 w-4 h-4 rounded border-outline-variant/40 bg-surface-container text-secondary-container focus:ring-2 focus:ring-secondary-container"
              />
              <span className="text-sm text-on-surface-variant leading-relaxed">
                訂閱牛津視界電子報（投資洞察、新課程通知，可隨時退訂）
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                name="agree_terms"
                type="checkbox"
                required
                className="mt-0.5 w-4 h-4 rounded border-outline-variant/40 bg-surface-container text-secondary-container focus:ring-2 focus:ring-secondary-container"
              />
              <span className="text-sm text-on-surface-variant leading-relaxed">
                我已閱讀並同意{" "}
                <Link href="/terms" target="_blank" className="text-secondary hover:underline font-bold">
                  服務條款
                </Link>{" "}
                與{" "}
                <Link href="/privacy" target="_blank" className="text-secondary hover:underline font-bold">
                  隱私權政策
                </Link>
              </span>
            </label>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "註冊中..." : "建立帳號"}
            </button>
          </form>
        )}

        <p className="text-center text-on-surface-variant text-sm mt-6">
          已經有帳號？{" "}
          <Link href="/sign-in" className="text-secondary font-bold hover:underline">
            登入
          </Link>
        </p>
      </div>
    </div>
  );
}
