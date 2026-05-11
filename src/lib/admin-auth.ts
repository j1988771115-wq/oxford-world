import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type UserRole = "user" | "instructor" | "admin" | "superadmin";

export interface AdminActor {
  /** Supabase auth user id (UUID) — null if 走 legacy ADMIN_PASSWORD */
  authId: string | null;
  /** profiles.id (UUID) — null if 沒 profile (legacy admin) */
  profileId: string | null;
  email: string | null;
  role: UserRole;
  /** 'legacy' = 用 ADMIN_PASSWORD cookie, 'supabase' = 用 supabase auth role */
  source: "legacy" | "supabase";
}

/**
 * 判斷 admin 認證模式:
 *   legacy   = 純舊 ADMIN_PASSWORD cookie (P0b 之前現況)
 *   dual     = ADMIN_PASSWORD cookie OR supabase auth role 任一通過 (rollout 期)
 *   supabase = 只接受 supabase auth + role (P0b 完成後 final)
 */
function getAuthMode(): "legacy" | "dual" | "supabase" {
  const m = (process.env.ADMIN_AUTH_MODE || "dual").trim().toLowerCase();
  return m === "legacy" || m === "supabase" ? m : "dual";
}

async function checkLegacyPassword(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  if (!password || !token) return false;
  const [salt, hash] = token.split(":");
  if (!salt || !hash) return false;
  const expected = createHmac("sha256", password).update(salt).digest("hex");
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(hash, "utf8"), Buffer.from(expected, "utf8"));
}

async function getSupabaseActor(): Promise<AdminActor | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    // service role 拉 profile + role (避免 RLS 問題)
    const sk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sk) return null;
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      sk,
      { auth: { persistSession: false } },
    );
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, email, role")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!profile) return null;
    return {
      authId: user.id,
      profileId: profile.id,
      email: profile.email,
      role: (profile.role ?? "user") as UserRole,
      source: "supabase",
    };
  } catch {
    return null;
  }
}

/**
 * 取得 admin actor 完整身分。回傳 null 表示無權限。
 * dual mode 下,legacy password 通過 → 視為 superadmin (因為只有 JD 有密碼)。
 */
export async function getAdminActor(): Promise<AdminActor | null> {
  const mode = getAuthMode();

  if (mode !== "supabase") {
    const legacyOk = await checkLegacyPassword();
    if (legacyOk) {
      // legacy mode: ADMIN_PASSWORD 持有者視為 superadmin
      return {
        authId: null,
        profileId: null,
        email: null,
        role: "superadmin",
        source: "legacy",
      };
    }
  }

  if (mode !== "legacy") {
    const supabaseActor = await getSupabaseActor();
    if (supabaseActor && supabaseActor.role !== "user") {
      return supabaseActor;
    }
  }

  return null;
}

/**
 * 保留舊 API 為 backward compat。新 code 用 getAdminActor() 拿完整身分。
 *
 * P0c 完成後 instructor 開放進 admin,但 layout 用 path-level gate 擋掉
 * /admin/courses /admin/insights /admin/knowledge /admin/dungeons。
 * /admin /admin/orders /admin/email 三個 instructor 可進,各自加 actor-scoped filter。
 */
export async function isAdmin(): Promise<boolean> {
  const actor = await getAdminActor();
  if (!actor) return false;
  return ["admin", "superadmin", "instructor"].includes(actor.role);
}

/**
 * 嚴格只 superadmin / admin (instructor 不算)
 */
export async function isSuperAdmin(): Promise<boolean> {
  const actor = await getAdminActor();
  return actor?.role === "superadmin" || actor?.role === "admin";
}

/**
 * Require specific role(s). 返回 actor 或 throw 403-like (caller handle as 401/403)。
 */
export async function requireRole(allowed: UserRole[]): Promise<AdminActor> {
  const actor = await getAdminActor();
  if (!actor) {
    throw new Error("UNAUTHORIZED");
  }
  if (!allowed.includes(actor.role)) {
    throw new Error("FORBIDDEN");
  }
  return actor;
}

/**
 * Page-level guard: instructor 訪問此 page 直接 redirect /admin。
 * Server component 內呼叫(用 next/navigation redirect)。
 *
 * 用途:/admin/courses /admin/insights /admin/knowledge /admin/dungeons
 * 這幾個 instructor 不該進的 page。nav 已隱藏(P3.3),但 instructor 知道 URL
 * 仍能直接 GET — 這 helper 擋住。
 */
export async function requireSuperAdminOrAdmin(): Promise<AdminActor> {
  const { redirect } = await import("next/navigation");
  const actor = await getAdminActor();
  if (!actor) {
    redirect("/admin/login");
  }
  if (actor.role === "instructor") {
    redirect("/admin");
  }
  return actor;
}
