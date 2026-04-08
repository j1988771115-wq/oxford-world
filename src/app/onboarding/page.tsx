"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/lib/actions/auth";
import {
  User,
  Briefcase,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
      <div className="bg-surface-container-lowest p-10 rounded-2xl deep-diffusion w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl signature-gradient flex items-center justify-center mx-auto mb-4">
            <Sparkles size={32} className="text-white fill-current" />
          </div>
          <h1 className="text-2xl font-black text-on-surface">歡迎加入牛津視界！</h1>
          <p className="text-on-surface-variant text-sm mt-2">
            填寫你的資料，讓我們更了解你
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Display Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-on-surface mb-2">
              <User size={16} className="text-secondary" />
              顯示名稱 <span className="text-red-500">*</span>
            </label>
            <input
              name="display_name"
              type="text"
              required
              placeholder="你希望別人怎麼稱呼你"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container transition"
            />
          </div>

          {/* Occupation */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-on-surface mb-2">
              <Briefcase size={16} className="text-secondary" />
              職業
            </label>
            <select
              name="occupation"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container transition appearance-none"
            >
              <option value="">選擇你的職業</option>
              <option value="engineer">工程師</option>
              <option value="designer">設計師</option>
              <option value="marketing">行銷</option>
              <option value="manager">管理層</option>
              <option value="student">學生</option>
              <option value="finance">金融</option>
              <option value="freelancer">自由工作者</option>
              <option value="other">其他</option>
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-on-surface mb-2">
              <FileText size={16} className="text-secondary" />
              自我介紹
            </label>
            <textarea
              name="bio"
              rows={3}
              placeholder="簡單介紹你自己，或你想透過牛津視界學到什麼"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary-container transition resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-white signature-gradient hover:opacity-90 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "儲存中..." : (
              <>
                開始學習之旅
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full py-3 text-on-surface-variant text-sm font-medium hover:text-on-surface transition"
          >
            稍後再填
          </button>
        </form>
      </div>
    </div>
  );
}
