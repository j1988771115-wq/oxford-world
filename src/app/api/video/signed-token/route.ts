import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { signPlaybackToken } from "@/lib/mux";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/video/signed-token
 * Body: { chapterId: string }
 *
 * 回傳該章節的 Mux signed playback token，但只給：
 * 1. 章節是免費試看 (is_free_preview=true) 的人
 * 2. 已購買該章節所屬課程的學員 (course_access)
 *
 * 任何其他狀況回 403。
 */
export async function POST(req: Request) {
  // Auth
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  let body: { chapterId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const chapterId = body.chapterId;
  if (!chapterId) {
    return NextResponse.json({ error: "chapterId required" }, { status: 400 });
  }

  const admin = createServiceClient();

  // 拉章節 + 課程 id + playback id + free flag
  const { data: chapter } = await admin
    .from("course_chapters")
    .select("id, course_id, mux_playback_id, is_free_preview, title")
    .eq("id", chapterId)
    .maybeSingle();

  if (!chapter) {
    return NextResponse.json({ error: "chapter not found" }, { status: 404 });
  }
  if (!chapter.mux_playback_id) {
    return NextResponse.json(
      { error: "影片尚未上傳", code: "NO_MUX_VIDEO" },
      { status: 404 }
    );
  }

  // 權限 gate：免費試看 OR 已購買
  let canPlay = chapter.is_free_preview;
  if (!canPlay) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (profile) {
      const { data: access } = await admin
        .from("course_access")
        .select("id")
        .eq("user_id", profile.id)
        .eq("course_id", chapter.course_id)
        .maybeSingle();
      canPlay = !!access;
    }
  }

  if (!canPlay) {
    return NextResponse.json(
      { error: "需要購買此課程才能觀看", code: "COURSE_NOT_PURCHASED" },
      { status: 403 }
    );
  }

  // 簽 token，60 min 有效
  try {
    const token = await signPlaybackToken(chapter.mux_playback_id);
    return NextResponse.json({
      playbackId: chapter.mux_playback_id,
      token,
      expiresIn: 3600,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sign failed";
    return NextResponse.json({ error: msg, code: "SIGN_FAILED" }, { status: 500 });
  }
}
