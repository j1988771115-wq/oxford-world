"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { signOut } from "@/lib/actions/auth";
import {
  Settings,
  User,
  Mail,
  Shield,
  Bell,
  LogOut,
  ExternalLink,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AvatarUpload } from "@/components/avatar-upload";

export default function SettingsPage() {
  const [user, setUser] = useState<{ email?: string; user_metadata?: { full_name?: string } } | null>(null);
  const [profile, setProfile] = useState<{ tier?: string; discord_id?: string; avatar_url?: string; display_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [discordNotifs, setDiscordNotifs] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("auth_id", user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="lg:pl-64 pt-24 pb-12 px-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-3 border-secondary-container border-t-transparent rounded-full" />
      </main>
    );
  }

  return (
    <main className="lg:pl-64 pt-24 pb-12 px-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center">
            <Settings size={20} className="text-on-surface" />
          </div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">設定</h1>
        </div>
        <p className="text-on-surface-variant mt-1">管理你的帳號和偏好設定</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <section className="bg-surface-container-lowest rounded-2xl p-8 deep-diffusion">
          <div className="flex items-center gap-3 mb-6">
            <User size={20} className="text-secondary" />
            <h2 className="text-lg font-bold text-on-surface">個人資料</h2>
          </div>
          <div className="space-y-5">
            <AvatarUpload
              currentUrl={profile?.avatar_url}
              displayName={profile?.display_name || user?.user_metadata?.full_name || "U"}
            />
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                姓名
              </label>
              <div className="mt-1 text-on-surface font-medium">
                {user?.user_metadata?.full_name || "未設定"}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Email
              </label>
              <div className="mt-1 text-on-surface font-medium flex items-center gap-2">
                <Mail size={16} className="text-on-surface-variant" />
                {user?.email || "未設定"}
              </div>
            </div>
          </div>
        </section>

        {/* Membership */}
        <section className="bg-surface-container-lowest rounded-2xl p-8 deep-diffusion">
          <div className="flex items-center gap-3 mb-6">
            <Crown size={20} className="text-secondary" />
            <h2 className="text-lg font-bold text-on-surface">會員方案</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className={cn(
                "inline-block px-3 py-1 rounded-full text-sm font-bold",
                profile?.tier === "pro"
                  ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                  : "bg-surface-container text-on-surface-variant"
              )}>
                {profile?.tier === "pro" ? "Pro 會員" : "免費會員"}
              </div>
              <p className="text-sm text-on-surface-variant mt-2">
                {profile?.tier === "pro"
                  ? "你已是 Pro 會員，享有所有課程和功能。"
                  : "升級 Pro 解鎖所有課程、報告和 Discord 社群。"}
              </p>
            </div>
            {profile?.tier !== "pro" && (
              <Link
                href="/pricing"
                className="signature-gradient text-white px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition shrink-0"
              >
                升級 Pro
              </Link>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-surface-container-lowest rounded-2xl p-8 deep-diffusion">
          <div className="flex items-center gap-3 mb-6">
            <Bell size={20} className="text-secondary" />
            <h2 className="text-lg font-bold text-on-surface">通知設定</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-on-surface font-medium text-sm">Email 通知</div>
                <div className="text-xs text-on-surface-variant">接收課程更新和學習提醒</div>
              </div>
              <button
                onClick={() => setEmailNotifs(!emailNotifs)}
                className={cn(
                  "w-12 h-7 rounded-full relative transition-colors",
                  emailNotifs ? "bg-secondary" : "bg-surface-container-highest"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all",
                  emailNotifs ? "right-1" : "left-1"
                )} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-on-surface font-medium text-sm">Discord 通知</div>
                <div className="text-xs text-on-surface-variant">在 Discord 接收學習進度通知</div>
              </div>
              <button
                onClick={() => setDiscordNotifs(!discordNotifs)}
                className={cn(
                  "w-12 h-7 rounded-full relative transition-colors",
                  discordNotifs ? "bg-secondary" : "bg-surface-container-highest"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all",
                  discordNotifs ? "right-1" : "left-1"
                )} />
              </button>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-surface-container-lowest rounded-2xl p-8 deep-diffusion">
          <div className="flex items-center gap-3 mb-6">
            <Shield size={20} className="text-secondary" />
            <h2 className="text-lg font-bold text-on-surface">帳號安全</h2>
          </div>
          <div className="space-y-3">
            <a
              href="https://discord.gg/oxfordvision"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl hover:bg-surface-container transition-colors"
            >
              <span className="text-sm font-medium text-on-surface">加入 Discord 社群</span>
              <ExternalLink size={16} className="text-on-surface-variant" />
            </a>
          </div>
        </section>

        {/* Sign Out */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <LogOut size={18} />
            登出
          </button>
        </form>
      </div>
    </main>
  );
}
