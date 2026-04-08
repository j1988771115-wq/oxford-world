"use client";

import { useState } from "react";
import Link from "next/link";
import { updatePassword } from "@/lib/actions/auth";
import { Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);

    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("兩次密碼不一致");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("密碼至少 6 位");
      setLoading(false);
      return;
    }

    const result = await updatePassword(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, updatePassword redirects to /dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="bg-surface-container-lowest p-10 rounded-2xl deep-diffusion w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary-fixed flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-on-secondary-fixed-variant" />
          </div>
          <h1 className="text-2xl font-black text-on-surface">重設密碼</h1>
          <p className="text-on-surface-variant text-sm mt-2">
            請輸入你的新密碼
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="新密碼（至少 6 位）"
            className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container transition"
          />
          <input
            name="confirm"
            type="password"
            required
            minLength={6}
            placeholder="確認新密碼"
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
            {loading ? "更新中..." : "更新密碼"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/sign-in" className="text-on-surface-variant text-sm hover:text-secondary transition">
            回到登入
          </Link>
        </div>
      </div>
    </div>
  );
}
