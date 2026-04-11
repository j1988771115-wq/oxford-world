"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDungeons() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("dungeons")
    .select("*, dungeon_entries(count)")
    .order("required_level", { ascending: true })
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getDungeon(id: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("dungeons")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

export async function getMyEntries() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return [];

  const { data } = await supabase
    .from("dungeon_entries")
    .select("dungeon_id, status, xp_claimed")
    .eq("user_id", profile.id);

  return data || [];
}

export async function enterDungeon(dungeonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tier")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { error: "找不到用戶" };

  // Check dungeon requirements
  const { data: dungeon } = await supabase
    .from("dungeons")
    .select("*")
    .eq("id", dungeonId)
    .single();

  if (!dungeon) return { error: "副本不存在" };

  // Check pro requirement
  if (dungeon.requires_pro && profile.tier !== "pro") {
    return { error: "此副本需要 Pro 會員資格" };
  }

  // Check max participants
  if (dungeon.max_participants) {
    const { count } = await supabase
      .from("dungeon_entries")
      .select("*", { count: "exact", head: true })
      .eq("dungeon_id", dungeonId);

    if (count && count >= dungeon.max_participants) {
      return { error: "此副本名額已滿" };
    }
  }

  // Register
  const { error } = await supabase.from("dungeon_entries").upsert(
    {
      dungeon_id: dungeonId,
      user_id: profile.id,
      status: "registered",
    },
    { onConflict: "dungeon_id,user_id" }
  );

  if (error) return { error: error.message };

  return { success: true };
}

export async function claimDungeonXP(dungeonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "請先登入" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return { error: "找不到用戶" };

  // Get entry
  const { data: entry } = await supabase
    .from("dungeon_entries")
    .select("id, xp_claimed")
    .eq("dungeon_id", dungeonId)
    .eq("user_id", profile.id)
    .single();

  if (!entry) return { error: "尚未參加此副本" };
  if (entry.xp_claimed) return { error: "已領取過 XP" };

  // Mark as claimed
  await supabase
    .from("dungeon_entries")
    .update({ xp_claimed: true, status: "completed" })
    .eq("id", entry.id);

  // Record XP event
  await supabase.from("learning_events").insert({
    user_id: profile.id,
    event_type: "quiz_completed",
    event_date: new Date().toISOString().split("T")[0],
  });

  return { success: true };
}
