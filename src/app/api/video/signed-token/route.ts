import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { signPlaybackToken } from "@/lib/mux";
import { hasCourseAccess } from "@/lib/access";
import crypto from "crypto";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function hashStr(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

// 多裝置封鎖閾值:同一帳號 60 分鐘內超過 N 個不同 device_key 就視為惡意分享
const MAX_DEVICES_PER_HOUR = 3;

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

  let body: { chapterId?: string; variant?: "main" | "bg" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const chapterId = body.chapterId;
  if (!chapterId) {
    return NextResponse.json({ error: "chapterId required" }, { status: 400 });
  }
  const variant = body.variant === "bg" ? "bg" : "main";

  // 拉章節 + 課程 id + playback id (主片或 bg) + free flag
  // course_chapters 公開讀,profile/course_access 都是 user 自己 RLS allow
  const { data: chapter } = await supabase
    .from("course_chapters")
    .select("id, course_id, mux_playback_id, mux_playback_id_bg, is_free_preview, title")
    .eq("id", chapterId)
    .maybeSingle();

  if (!chapter) {
    return NextResponse.json({ error: "chapter not found" }, { status: 404 });
  }
  const playbackId =
    variant === "bg" ? chapter.mux_playback_id_bg : chapter.mux_playback_id;
  if (!playbackId) {
    return NextResponse.json(
      { error: "影片尚未上傳", code: "NO_MUX_VIDEO" },
      { status: 404 }
    );
  }

  // 權限 gate:免費試看 OR (買斷 OR Pro 訂閱) — 走統一的 hasCourseAccess
  let canPlay = chapter.is_free_preview;
  if (!canPlay) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (profile) {
      canPlay = await hasCourseAccess(supabase, profile.id, chapter.course_id);
    }
  }

  if (!canPlay) {
    return NextResponse.json(
      { error: "需要購買此課程才能觀看", code: "COURSE_NOT_PURCHASED" },
      { status: 403 }
    );
  }

  // 多裝置偵測 — 拿 IP + UA hash,查 60 分鐘內這個 user 用過幾個不同 device_key
  // free preview 跳過(沒登入無 user_id 可記)
  if (!chapter.is_free_preview) {
    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const ua = req.headers.get("user-agent") || "unknown";
    const ipHash = hashStr(ip);
    const uaHash = hashStr(ua);
    const deviceKey = `${ipHash}:${uaHash}`;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (profile) {
      // 查 60 分鐘內所有 distinct device_key (user-scoped client + RLS allows own read)
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("video_sessions")
        .select("device_key")
        .eq("user_id", profile.id)
        .gte("created_at", since);

      const distinctDevices = new Set(
        (recent || []).map((r: { device_key: string }) => r.device_key)
      );
      distinctDevices.add(deviceKey);

      if (distinctDevices.size > MAX_DEVICES_PER_HOUR) {
        console.warn(
          `[multi-device] user=${profile.id} blocked: ${distinctDevices.size} devices in 60min`
        );
        return NextResponse.json(
          {
            error:
              "偵測到此帳號於短時間內從多個裝置觀看,已暫停影片播放。請於 60 分鐘後重試,或聯絡客服確認帳號安全。",
            code: "MULTI_DEVICE_BLOCK",
          },
          { status: 429 }
        );
      }

      // INSERT 仍用 service_role:video_sessions 沒 INSERT policy,且 server-side 強制紀錄
      // (ip_hash/ua_hash 都是 server 從 header 拿,user 無法篡改,留 service_role 安全合理)
      const admin = createServiceClient();
      admin
        .from("video_sessions")
        .insert({
          user_id: profile.id,
          ip_hash: ipHash,
          ua_hash: uaHash,
          device_key: deviceKey,
          chapter_id: chapter.id,
        })
        .then(({ error }) => {
          if (error) console.warn("[video_sessions] insert failed", error.message);
        });
    }
  }

  // 簽 token，60 min 有效
  try {
    const token = await signPlaybackToken(playbackId);
    return NextResponse.json({
      playbackId,
      token,
      expiresIn: 3600,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sign failed";
    return NextResponse.json({ error: msg, code: "SIGN_FAILED" }, { status: 500 });
  }
}
