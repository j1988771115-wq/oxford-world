"use server";

import { createClient } from "@/lib/supabase/server";

export async function getCourses(category?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get courses error:", error);
    return [];
  }

  return data;
}

export async function getCourseBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Get course error:", error);
    return null;
  }

  return data;
}

export async function checkCourseAccess(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tier")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return false;

  // Pro members have access to all courses
  if (profile.tier === "pro") return true;

  // Check direct purchase
  const { data: access } = await supabase
    .from("course_access")
    .select("id")
    .eq("user_id", profile.id)
    .eq("course_id", courseId)
    .limit(1);

  return access !== null && access.length > 0;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (error) {
    console.error("Get profile error:", error);
    return null;
  }

  return data;
}

export async function getUserXP() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { xp: 0, level: 1 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, current_streak")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return { xp: 0, level: 1 };

  const { data: events } = await supabase
    .from("learning_events")
    .select("event_type")
    .eq("user_id", profile.id);

  if (!events) return { xp: 0, level: 1 };

  // Calculate XP based on event types
  const xpMap: Record<string, number> = {
    video_watched: 10,
    ai_chat: 5,
    quiz_completed: 50,
  };

  let xp = events.reduce((sum, e) => sum + (xpMap[e.event_type] || 0), 0);

  // Streak bonus
  xp += (profile.current_streak || 0) * 5;

  // Determine level (50-level system)
  const levels = [
    0, 30, 70, 120, 200, 300, 420, 560, 720, 900,           // Lv.1-10
    1100, 1350, 1650, 2000, 2400, 2850, 3350, 3900, 4500, 5200, // Lv.11-20
    6000, 6900, 7900, 9000, 10200, 11500, 13000, 14800, 16800, 19000, // Lv.21-30
    21500, 24500, 28000, 32000, 36500, 41500, 47000, 53000, 60000, 68000, // Lv.31-40
    77000, 87000, 98000, 110000, 125000, 142000, 162000, 185000, 215000, 250000, // Lv.41-50
  ];
  let level = 1;
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i]) {
      level = i + 1;
      break;
    }
  }

  return { xp, level };
}

export async function getLeaderboard() {
  const supabase = await createClient();

  // Get all events for XP calculation
  const { data: events } = await supabase
    .from("learning_events")
    .select("user_id, event_type");

  if (!events || events.length === 0) return [];

  const xpMap: Record<string, number> = {};
  const xpValues: Record<string, number> = {
    video_watched: 10,
    ai_chat: 5,
    quiz_completed: 50,
  };

  for (const e of events) {
    xpMap[e.user_id] = (xpMap[e.user_id] || 0) + (xpValues[e.event_type] || 0);
  }

  const userIds = Object.keys(xpMap);
  if (userIds.length === 0) return [];

  // Get profiles with tier info
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, tier, current_streak")
    .in("id", userIds);

  if (!profiles) return [];

  // Get course access for each user
  const { data: courseAccess } = await supabase
    .from("course_access")
    .select("user_id, courses(title)")
    .in("user_id", userIds);

  const courseMap: Record<string, string[]> = {};
  if (courseAccess) {
    for (const a of courseAccess) {
      if (!courseMap[a.user_id]) courseMap[a.user_id] = [];
      const course = a.courses as unknown as { title: string } | null;
      if (course?.title) courseMap[a.user_id].push(course.title);
    }
  }

  // Get latest discussion per user
  const { data: discussions } = await supabase
    .from("discussions")
    .select("user_id, title, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: false });

  const latestPostMap: Record<string, { title: string; date: string }> = {};
  if (discussions) {
    for (const d of discussions) {
      if (!latestPostMap[d.user_id]) {
        latestPostMap[d.user_id] = {
          title: d.title,
          date: d.created_at,
        };
      }
    }
  }

  return profiles
    .map((p) => ({
      id: p.id,
      displayName: p.display_name || "匿名學員",
      avatarUrl: p.avatar_url,
      tier: p.tier as "free" | "pro",
      xp: (xpMap[p.id] || 0) + (p.current_streak || 0) * 5,
      courses: courseMap[p.id] || [],
      latestPost: latestPostMap[p.id] || null,
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 30);
}

export async function getWeeklyLeaderboard() {
  const supabase = await createClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: events } = await supabase
    .from("learning_events")
    .select("user_id, event_type")
    .gte("event_date", weekAgo.toISOString().split("T")[0]);

  if (!events || events.length === 0) return [];

  const xpMap: Record<string, number> = {};
  const xpValues: Record<string, number> = {
    video_watched: 10,
    ai_chat: 5,
    quiz_completed: 50,
  };

  for (const e of events) {
    xpMap[e.user_id] = (xpMap[e.user_id] || 0) + (xpValues[e.event_type] || 0);
  }

  const userIds = Object.keys(xpMap);
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, tier")
    .in("id", userIds);

  if (!profiles) return [];

  return profiles
    .map((p) => ({
      id: p.id,
      displayName: p.display_name || "匿名學員",
      avatarUrl: p.avatar_url,
      tier: p.tier as "free" | "pro",
      xp: xpMap[p.id] || 0,
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 20);
}

export async function getMyRank() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();
  if (!profile) return null;

  const leaderboard = await getLeaderboard();
  const rank = leaderboard.findIndex((p) => p.id === profile.id);
  return rank >= 0 ? rank + 1 : null;
}

export async function getActivityData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!profile) return {};

  // Get learning events from the past year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const { data, error } = await supabase
    .from("learning_events")
    .select("event_date")
    .eq("user_id", profile.id)
    .gte("event_date", oneYearAgo.toISOString().split("T")[0]);

  if (error || !data) return {};

  // Count events per date
  const counts: Record<string, number> = {};
  for (const event of data) {
    const date = event.event_date;
    counts[date] = (counts[date] || 0) + 1;
  }

  return counts;
}

export async function getUserCourses() {
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

  const { data, error } = await supabase
    .from("course_access")
    .select("*, courses(*)")
    .eq("user_id", profile.id)
    .order("granted_at", { ascending: false });

  if (error) {
    console.error("Get user courses error:", error);
    return [];
  }

  return data;
}
