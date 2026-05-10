import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Debug endpoint: 顯示當前 admin auth 身分。
 * P0b dual-mode 期間用來驗證:
 *   - 切 ADMIN_AUTH_MODE=supabase 前先確認 supabase 進得了
 *   - 久老師 / YC 認證後 role 對不對
 */
export async function GET() {
  const actor = await getAdminActor();
  return NextResponse.json({
    authenticated: !!actor,
    auth_mode: (process.env.ADMIN_AUTH_MODE || "dual").toLowerCase(),
    actor: actor
      ? {
          source: actor.source,
          role: actor.role,
          email: actor.email,
          profileId: actor.profileId,
          authId: actor.authId,
        }
      : null,
  });
}
