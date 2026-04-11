import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dungeons")
    .select("*")
    .order("required_level")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const supabase = createAdminClient();

  const { error } = await supabase.from("dungeons").insert({
    title: body.title,
    description: body.description,
    dungeon_type: body.dungeon_type || "lecture",
    required_level: body.required_level || 1,
    requires_pro: body.requires_pro || false,
    xp_reward: body.xp_reward || 10,
    video_url: body.video_url || null,
    content_md: body.content_md || null,
    scheduled_at: body.scheduled_at || null,
    duration_minutes: body.duration_minutes || null,
    max_participants: body.max_participants || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const supabase = createAdminClient();

  const { error } = await supabase.from("dungeons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
