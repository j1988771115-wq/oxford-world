"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, code }),
    });

    if (res.ok) {
      router.push("/admin");
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data?.needs2FA) {
      setNeeds2FA(true);
      setError(code ? "驗證碼錯誤" : "請輸入手機驗證碼");
    } else {
      setError("密碼錯誤");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-6">
            OV
          </div>
          <h1 className="text-2xl font-bold text-white">後台管理</h1>
          <p className="text-gray-500 text-sm mt-2">牛津視界學院</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="輸入管理密碼"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 ring-blue-600/50 focus:outline-none focus:border-blue-600 transition-all placeholder-gray-600"
              autoFocus
            />
          </div>

          {needs2FA && (
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="手機 Authenticator 6 位數"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm tracking-widest text-center focus:ring-2 ring-blue-600/50 focus:outline-none focus:border-blue-600 transition-all placeholder-gray-600"
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || (needs2FA && code.length !== 6)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "驗證中..." : "進入後台"}
          </button>
        </form>
      </div>
    </div>
  );
}
