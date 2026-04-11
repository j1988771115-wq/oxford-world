"use server";

import { createClient } from "@/lib/supabase/server";

export async function getPublishedInsights(category?: string) {
  const supabase = await createClient();

  let query = supabase
    .from("insights")
    .select("id, slug, title, summary, category, is_pro, author, thumbnail_url, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return data || [];
}

export async function getInsightBySlug(slug: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("insights")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  return data;
}

export async function getLatestInsight() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("insights")
    .select("slug, title, summary, is_pro, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}
