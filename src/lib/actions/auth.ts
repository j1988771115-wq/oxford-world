"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// 把 redirect param 安全 plumb 進 next 參數,防 open redirect
function safeRedirectParam(redirect: string | null | undefined, fallback: string): string {
  if (
    redirect &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    !redirect.includes("\\")
  ) {
    return redirect;
  }
  return fallback;
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const newsletter = formData.get("newsletter") === "on";
  const agreeTerms = formData.get("agree_terms") === "on";
  const redirectTo = formData.get("redirect") as string | null;

  if (!agreeTerms) {
    return { error: "請先同意服務條款與隱私權政策" };
  }

  // user 從特定頁面點「免費試看」跳來註冊,完成 email confirm 後要送回原頁面;
  // 沒帶 redirect 才走 onboarding
  const next = safeRedirectParam(redirectTo, "/onboarding");
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // 訂閱電子報（best-effort，失敗不擋註冊）
  if (newsletter) {
    try {
      const { createClient: createAdminClient } = await import("@supabase/supabase-js");
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await admin
        .from("email_subscribers")
        .upsert({ email, source: "signup" }, { onConflict: "email" });
    } catch (e) {
      console.warn("Newsletter subscribe failed:", e);
    }
  }

  return { success: "請檢查你的 Email 信箱確認註冊。" };
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const redirectTo = formData.get("redirect") as string;
  const safeRedirect =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/dashboard";
  redirect(safeRedirect);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signInWithGoogle(formData?: FormData): Promise<void> {
  const supabase = await createClient();
  const redirectTo = (formData?.get("redirect") as string | null) ?? null;
  const next = safeRedirectParam(redirectTo, "/dashboard");
  const callback = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback },
  });
  if (data.url) redirect(data.url);
}

export async function signInWithGitHub(formData?: FormData): Promise<void> {
  const supabase = await createClient();
  const redirectTo = (formData?.get("redirect") as string | null) ?? null;
  const next = safeRedirectParam(redirectTo, "/dashboard");
  const callback = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=${encodeURIComponent(next)}`;
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: callback },
  });
  if (data.url) redirect(data.url);
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "重設密碼連結已寄出，請檢查你的信箱。" };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  const displayName = formData.get("display_name") as string;
  const occupation = formData.get("occupation") as string;
  const bio = formData.get("bio") as string;

  // Update auth metadata
  await supabase.auth.updateUser({
    data: { full_name: displayName },
  });

  // 看 profile 存在嗎 — 存在就 update 安全欄位,不存在才 insert (audit/T0-13 trigger fix)
  // 重要:不能在 upsert 一直帶 tier/email/auth_id,trigger 會擋(已是 pro 的 8 位學員會卡)
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, occupation, bio })
      .eq("auth_id", user.id);
    if (error) return { error: error.message };
  } else {
    // 第一次建 profile 才需要帶 auth_id / email / tier (insert path 不經 trigger 的 distinct check)
    const { error } = await supabase.from("profiles").insert({
      auth_id: user.id,
      email: user.email,
      display_name: displayName,
      occupation,
      bio,
      tier: "free",
    });
    if (error) return { error: error.message };
  }

  return { success: true };
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
