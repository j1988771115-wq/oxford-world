import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { addProRole } from "@/lib/discord";

const MAX_ATTEMPTS = 12;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getAdminClient();

  const { data: pending, error: fetchError } = await supabase
    .from("pending_discord_grants")
    .select("id, user_id, discord_id, attempts")
    .is("resolved_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(50);

  if (fetchError) {
    console.error("Fetch pending grants error:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, resolved: 0, failed: 0 });
  }

  let resolved = 0;
  let failed = 0;

  for (const grant of pending) {
    const ok = await addProRole(grant.discord_id);
    const now = new Date().toISOString();

    if (ok) {
      await supabase
        .from("pending_discord_grants")
        .update({
          resolved_at: now,
          attempts: grant.attempts + 1,
          last_attempt_at: now,
          last_error: null,
        })
        .eq("id", grant.id);
      resolved += 1;
    } else {
      await supabase
        .from("pending_discord_grants")
        .update({
          attempts: grant.attempts + 1,
          last_attempt_at: now,
          last_error: "addProRole returned false",
        })
        .eq("id", grant.id);
      failed += 1;
    }
  }

  return NextResponse.json({
    processed: pending.length,
    resolved,
    failed,
  });
}
