import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { removeProRole } from "@/lib/discord";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * 每天台灣 04:00 把過期的 Pro 用戶 downgrade 回 free (audit T1-12)
 *
 * 之前 bug:UI 用 tier === 'pro' 直接放行,且 cron 沒主動 downgrade,
 * 導致 pro_expires_at 過期後 user 仍 tier='pro',實際已過期還能享 Pro 功能
 * (Eyesy 加大 quota / 之前 learn page 過期還能看 — T0-6 已修讀取面)
 *
 * 此 cron:服務 tier='pro' 但 pro_expires_at < now() 的 user 統一降回 free
 * - course_access 不動(已買的課永久回看,跟 tier 無關)
 * - 順便 best-effort 移除 Discord Pro role
 */
export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return NextResponse.json({ error: "service unconfigured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // 找已過期的 Pro user
  const { data: expired, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, discord_id, pro_expires_at")
    .eq("tier", "pro")
    .lt("pro_expires_at", new Date().toISOString());

  if (error) {
    console.error("[pro-downgrade] query failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ checked: 0, downgraded: 0, message: "no expired Pro users" });
  }

  let downgraded = 0;
  let errors = 0;
  const downgradedEmails: string[] = [];

  for (const user of expired) {
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ tier: "free" })
      .eq("id", user.id);
    if (updErr) {
      console.error("[pro-downgrade] update failed", user.id, updErr);
      errors += 1;
      continue;
    }
    downgraded += 1;
    downgradedEmails.push(user.email);

    // best-effort 移除 Discord Pro role
    if (user.discord_id) {
      try {
        await removeProRole(user.discord_id);
      } catch (e) {
        console.warn("[pro-downgrade] discord remove failed", user.discord_id, e);
      }
    }
  }

  console.log("[pro-downgrade]", {
    checked: expired.length,
    downgraded,
    errors,
    downgradedEmails,
  });

  return NextResponse.json({
    checked: expired.length,
    downgraded,
    errors,
    downgradedEmails,
  });
}
