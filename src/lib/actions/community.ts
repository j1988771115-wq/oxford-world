"use server";

import { createClient } from "@/lib/supabase/server";

// ── Assignments ──

export async function getAssignments(courseId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assignments")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order");
  return data || [];
}

export async function getMySubmissions(courseId: string) {
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
    .from("submissions")
    .select("*, assignments!inner(course_id)")
    .eq("assignments.course_id", courseId)
    .eq("user_id", profile.id);

  return data || [];
}

export async function submitAssignment(formData: FormData) {
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

  const assignmentId = formData.get("assignment_id") as string;
  const content = (formData.get("content") as string).trim();
  const linkUrl = (formData.get("link_url") as string)?.trim() || null;

  if (!content) return { error: "請輸入作業內容" };

  const { error } = await supabase.from("submissions").upsert(
    {
      assignment_id: assignmentId,
      user_id: profile.id,
      content,
      link_url: linkUrl,
      status: "submitted",
    },
    { onConflict: "assignment_id,user_id" }
  );

  if (error) return { error: error.message };

  // Record XP event
  await supabase.from("learning_events").insert({
    user_id: profile.id,
    event_type: "quiz_completed", // Reuse for assignment XP
    event_date: new Date().toISOString().split("T")[0],
  });

  return { success: true };
}

// ── Discussions ──

// 從 PostgREST `profiles!inner(display_name)` join 改成 application-level merge
// 用 public_profiles view (audit T0-2:protect profiles 防 email leak)
// view 只暴露 safe column,不會 leak email/auth_id/discord_id
async function attachAuthor<T extends { user_id: string }>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: T[]
): Promise<(T & { profiles: { display_name: string | null } | null })[]> {
  if (!rows.length) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: authors } = await supabase
    .from("public_profiles")
    .select("id, display_name")
    .in("id", userIds);
  const map = new Map((authors || []).map((a) => [a.id, a]));
  return rows.map((r) => ({
    ...r,
    profiles: (map.get(r.user_id) as { display_name: string | null } | undefined) ?? null,
  }));
}

export async function getDiscussions(courseId?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("discussions")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (courseId) {
    query = query.eq("course_id", courseId);
  }

  const { data } = await query;
  return await attachAuthor(supabase, data || []);
}

export async function getDiscussion(id: string) {
  const supabase = await createClient();

  const { data: discussion } = await supabase
    .from("discussions")
    .select("*")
    .eq("id", id)
    .single();

  if (!discussion) return null;

  const { data: replies } = await supabase
    .from("discussion_replies")
    .select("*")
    .eq("discussion_id", id)
    .order("created_at");

  const [discussionWithAuthor] = await attachAuthor(supabase, [discussion]);
  const repliesWithAuthor = await attachAuthor(supabase, replies || []);
  return { ...discussionWithAuthor, replies: repliesWithAuthor };
}

export async function createDiscussion(formData: FormData) {
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

  const title = (formData.get("title") as string).trim();
  const content = (formData.get("content") as string).trim();
  const courseId = (formData.get("course_id") as string) || null;
  const tag = (formData.get("tag") as string) || "general";

  if (!title || !content) return { error: "標題和內容不能為空" };

  const { data, error } = await supabase
    .from("discussions")
    .insert({
      title,
      content,
      course_id: courseId,
      tag,
      user_id: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // XP for posting
  await supabase.from("learning_events").insert({
    user_id: profile.id,
    event_type: "ai_chat", // Reuse for discussion XP
    event_date: new Date().toISOString().split("T")[0],
  });

  return { success: true, id: data.id };
}

export async function createReply(formData: FormData) {
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

  const discussionId = formData.get("discussion_id") as string;
  const content = (formData.get("content") as string).trim();

  if (!content) return { error: "回覆不能為空" };

  const { error } = await supabase.from("discussion_replies").insert({
    discussion_id: discussionId,
    user_id: profile.id,
    content,
  });

  if (error) return { error: error.message };

  // Update reply count
  await supabase.rpc("increment_reply_count", {
    discussion_id_input: discussionId,
  });

  // XP for replying
  await supabase.from("learning_events").insert({
    user_id: profile.id,
    event_type: "ai_chat",
    event_date: new Date().toISOString().split("T")[0],
  });

  return { success: true };
}
