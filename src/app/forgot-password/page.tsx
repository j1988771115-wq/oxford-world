"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/actions/auth";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(formData);
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
          <div className="w-16 h-16 rounded-2xl bg-secondary-fixed flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-on-secondary-fixed-variant" />
          </div>
          <h1 className="text-2xl font-black text-on-surface">忘記密碼</h1>
          <p className="text-on-surface-variant text-sm mt-2">
            輸入你的 Email，我們會寄送重設密碼連結
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-center">
              <p className="font-bold">{success}</p>
              <p className="text-sm mt-2 text-on-surface-variant">
                請檢查信箱（包括垃圾郵件）
              </p>
            </div>
            <Link
              href="/sign-in"
              className="block w-full text-center py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition"
            >
              回到登入
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container transition"
            />
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
              {loading ? "寄送中..." : "寄送重設連結"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/sign-in" className="text-on-surface-variant text-sm hover:text-secondary transition inline-flex items-center gap-1">
            <ArrowLeft size={14} />
            回到登入
          </Link>
        </div>
      </div>
    </div>
  );
}
