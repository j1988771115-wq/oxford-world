"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribeEmail(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "請輸入有效的 Email 地址" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("email_subscribers")
    .upsert({ email, source: "website" }, { onConflict: "email" });

  if (error) {
    console.error("Email subscribe error:", error);
    return { error: "訂閱失敗，請稍後再試" };
  }

  return { success: true };
}
