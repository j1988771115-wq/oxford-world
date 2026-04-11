import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "public" } }
  );

  // Run individual operations via the client
  const results: string[] = [];

  try {
    // Demo users
    const { error: profileErr } = await supabase.from("profiles").upsert([
      { id: "d0000001-0000-0000-0000-000000000001", auth_id: "demo-auth-001", email: "alice@demo.com", display_name: "Alice 陳", tier: "pro", current_streak: 12 },
      { id: "d0000002-0000-0000-0000-000000000002", auth_id: "demo-auth-002", email: "bob@demo.com", display_name: "Bob 林", tier: "pro", current_streak: 5 },
      { id: "d0000003-0000-0000-0000-000000000003", auth_id: "demo-auth-003", email: "carol@demo.com", display_name: "Carol 王", tier: "free", current_streak: 3 },
      { id: "d0000004-0000-0000-0000-000000000004", auth_id: "demo-auth-004", email: "dave@demo.com", display_name: "Dave 張", tier: "pro", current_streak: 8 },
      { id: "d0000005-0000-0000-0000-000000000005", auth_id: "demo-auth-005", email: "eve@demo.com", display_name: "Eve 李", tier: "free", current_streak: 1 },
      { id: "d0000006-0000-0000-0000-000000000006", auth_id: "demo-auth-006", email: "frank@demo.com", display_name: "Frank 黃", tier: "pro", current_streak: 15 },
      { id: "d0000007-0000-0000-0000-000000000007", auth_id: "demo-auth-007", email: "grace@demo.com", display_name: "Grace 吳", tier: "free", current_streak: 0 },
      { id: "d0000008-0000-0000-0000-000000000008", auth_id: "demo-auth-008", email: "hank@demo.com", display_name: "Hank 劉", tier: "pro", current_streak: 20 },
    ], { onConflict: "id" });

    results.push(profileErr ? `profiles: ${profileErr.message}` : "profiles: OK");

    // Demo learning events
    const events: { user_id: string; event_type: string; event_date: string }[] = [];
    const eventTypes = ["video_watched", "ai_chat", "quiz_completed"];
    const users = [
      { id: "d0000001-0000-0000-0000-000000000001", days: 60, weight: [0.4, 0.3, 0.3] },
      { id: "d0000002-0000-0000-0000-000000000002", days: 30, weight: [0.5, 0.5, 0] },
      { id: "d0000003-0000-0000-0000-000000000003", days: 15, weight: [0, 1, 0] },
      { id: "d0000004-0000-0000-0000-000000000004", days: 45, weight: [0.5, 0, 0.5] },
      { id: "d0000005-0000-0000-0000-000000000005", days: 10, weight: [1, 0, 0] },
      { id: "d0000006-0000-0000-0000-000000000006", days: 90, weight: [0.4, 0.4, 0.2] },
      { id: "d0000008-0000-0000-0000-000000000008", days: 120, weight: [0.4, 0.2, 0.4] },
    ];

    for (const u of users) {
      for (let d = 0; d < u.days; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const rand = Math.random();
        let typeIdx = 0;
        if (rand > u.weight[0]) typeIdx = 1;
        if (rand > u.weight[0] + u.weight[1]) typeIdx = 2;
        events.push({
          user_id: u.id,
          event_type: eventTypes[typeIdx],
          event_date: date.toISOString().split("T")[0],
        });
      }
    }

    const { error: eventErr } = await supabase.from("learning_events").insert(events);
    results.push(eventErr ? `events: ${eventErr.message}` : `events: OK (${events.length} rows)`);

    // Demo discussions (only if table exists)
    const { error: discErr } = await supabase.from("discussions").insert([
      { user_id: "d0000001-0000-0000-0000-000000000001", title: "大家都用什麼 AI 工具寫程式？", content: "最近在試 Claude Code 和 Cursor，想知道大家的使用心得，哪個比較適合新手？", reply_count: 3, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      { user_id: "d0000002-0000-0000-0000-000000000002", title: "AI 驅動決策力這門課太讚了", content: "剛看完第二章，數據框架的部分講得非常清楚，已經開始應用在工作上了。", reply_count: 5, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
      { user_id: "d0000003-0000-0000-0000-000000000003", title: "請問 Prompt Engineering 有什麼訣竅？", content: "我用 ChatGPT 的時候常常得不到想要的答案，有沒有推薦的技巧或課程？", reply_count: 4, created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
      { user_id: "d0000004-0000-0000-0000-000000000004", title: "分享我用 Vibe Coding 做的第一個網站", content: "跟著 YC 老師的課程，花了一個週末做出了我的個人作品集網站，太有成就感了！", reply_count: 7, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
      { user_id: "d0000006-0000-0000-0000-000000000006", title: "2026 Q2 太空產業投資趨勢整理", content: "看完久方武老師的大師課後，整理了一些重點筆記分享給大家。", reply_count: 2, created_at: new Date(Date.now() - 4 * 86400000).toISOString() },
      { user_id: "d0000005-0000-0000-0000-000000000005", title: "有人想一起組讀書會嗎？", content: "每週約一次，一起讀 AI 相關的書或論文，互相討論。有興趣的 +1！", reply_count: 8, created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
      { user_id: "d0000008-0000-0000-0000-000000000008", title: "從望遠境到通觀境的心得", content: "剛升到 Lv.21 通觀境，分享一下這段時間的學習策略。", reply_count: 6, created_at: new Date(Date.now() - 1 * 86400000).toISOString() },
      { user_id: "d0000007-0000-0000-0000-000000000007", title: "新手報到！大家好", content: "剛註冊牛津視界，對 AI 和區塊鏈都很感興趣，請多指教！", reply_count: 3, created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
    ]);
    results.push(discErr ? `discussions: ${discErr.message}` : "discussions: OK");

    // Demo dungeons (only if table exists)
    const { error: dungeonErr } = await supabase.from("dungeons").insert([
      { title: "AI 工具全攻略 — 2026 最新版", description: "久方武院長帶你盤點 2026 最值得關注的 AI 工具。", dungeon_type: "lecture", required_level: 1, requires_pro: false, xp_reward: 15, duration_minutes: 90, status: "recorded" },
      { title: "用 AI 兩小時做一個完整網站", description: "YC 老師實戰工作坊：從零開始，用 AI 輔助開發一個完整的個人品牌網站。", dungeon_type: "workshop", required_level: 5, requires_pro: true, xp_reward: 50, duration_minutes: 120, status: "upcoming" },
      { title: "Prompt Engineering 進階實戰", description: "學會用 Chain-of-Thought、Few-shot 等進階技巧。", dungeon_type: "workshop", required_level: 7, requires_pro: true, xp_reward: 50, duration_minutes: 90, status: "upcoming" },
      { title: "太空產業投資圓桌 — 久方武 × 黃靖哲", description: "院長與持牌分析師深度對談。限額 20 人。", dungeon_type: "master", required_level: 12, requires_pro: true, xp_reward: 80, duration_minutes: 60, max_participants: 20, status: "upcoming" },
      { title: "The Vision Summit — 年度學員交流", description: "牛津視界年度盛會。限天視境學員參加。", dungeon_type: "legendary", required_level: 40, requires_pro: true, xp_reward: 200, duration_minutes: 180, status: "upcoming" },
    ]);
    results.push(dungeonErr ? `dungeons: ${dungeonErr.message}` : "dungeons: OK");

  } catch (e: any) {
    results.push(`error: ${e.message}`);
  }

  return NextResponse.json({ results });
}
