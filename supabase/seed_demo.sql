-- ============================================
-- Oxford Vision Demo Seed Data
-- 跑完所有 migration 之後再跑這個
-- ============================================

-- 1. Demo 用戶 (profiles)
-- 注意：這些用戶不會有真實 auth，只用於展示排行榜、討論區
INSERT INTO public.profiles (id, auth_id, email, display_name, tier, current_streak)
VALUES
  ('d0000001-0000-0000-0000-000000000001', 'demo-auth-001', 'alice@demo.com', 'Alice 陳', 'pro', 12),
  ('d0000002-0000-0000-0000-000000000002', 'demo-auth-002', 'bob@demo.com', 'Bob 林', 'pro', 5),
  ('d0000003-0000-0000-0000-000000000003', 'demo-auth-003', 'carol@demo.com', 'Carol 王', 'free', 3),
  ('d0000004-0000-0000-0000-000000000004', 'demo-auth-004', 'dave@demo.com', 'Dave 張', 'pro', 8),
  ('d0000005-0000-0000-0000-000000000005', 'demo-auth-005', 'eve@demo.com', 'Eve 李', 'free', 1),
  ('d0000006-0000-0000-0000-000000000006', 'demo-auth-006', 'frank@demo.com', 'Frank 黃', 'pro', 15),
  ('d0000007-0000-0000-0000-000000000007', 'demo-auth-007', 'grace@demo.com', 'Grace 吳', 'free', 0),
  ('d0000008-0000-0000-0000-000000000008', 'demo-auth-008', 'hank@demo.com', 'Hank 劉', 'pro', 20)
ON CONFLICT DO NOTHING;

-- 2. Demo 課程存取
INSERT INTO public.course_access (user_id, course_id, access_type)
SELECT 'd0000001-0000-0000-0000-000000000001', c.id, 'subscription'
FROM public.courses c LIMIT 3
ON CONFLICT DO NOTHING;

INSERT INTO public.course_access (user_id, course_id, access_type)
SELECT 'd0000002-0000-0000-0000-000000000002', c.id, 'purchased'
FROM public.courses c LIMIT 2
ON CONFLICT DO NOTHING;

INSERT INTO public.course_access (user_id, course_id, access_type)
SELECT 'd0000004-0000-0000-0000-000000000004', c.id, 'subscription'
FROM public.courses c
ON CONFLICT DO NOTHING;

INSERT INTO public.course_access (user_id, course_id, access_type)
SELECT 'd0000006-0000-0000-0000-000000000006', c.id, 'subscription'
FROM public.courses c
ON CONFLICT DO NOTHING;

INSERT INTO public.course_access (user_id, course_id, access_type)
SELECT 'd0000008-0000-0000-0000-000000000008', c.id, 'subscription'
FROM public.courses c
ON CONFLICT DO NOTHING;

-- 3. Demo 學習事件 (for XP and activity grid)
-- Alice: heavy user
INSERT INTO public.learning_events (user_id, event_type, event_date)
SELECT 'd0000001-0000-0000-0000-000000000001',
  (ARRAY['video_watched','video_watched','ai_chat','quiz_completed'])[floor(random()*4+1)],
  current_date - (n || ' days')::interval
FROM generate_series(0, 60) AS n;

-- Bob: moderate user
INSERT INTO public.learning_events (user_id, event_type, event_date)
SELECT 'd0000002-0000-0000-0000-000000000002',
  (ARRAY['video_watched','ai_chat'])[floor(random()*2+1)],
  current_date - (n * 2 || ' days')::interval
FROM generate_series(0, 30) AS n;

-- Carol: casual
INSERT INTO public.learning_events (user_id, event_type, event_date)
SELECT 'd0000003-0000-0000-0000-000000000003',
  'ai_chat',
  current_date - (n * 3 || ' days')::interval
FROM generate_series(0, 15) AS n;

-- Dave: active
INSERT INTO public.learning_events (user_id, event_type, event_date)
SELECT 'd0000004-0000-0000-0000-000000000004',
  (ARRAY['video_watched','video_watched','quiz_completed'])[floor(random()*3+1)],
  current_date - (n || ' days')::interval
FROM generate_series(0, 45) AS n;

-- Eve: light
INSERT INTO public.learning_events (user_id, event_type, event_date)
SELECT 'd0000005-0000-0000-0000-000000000005',
  'video_watched',
  current_date - (n * 5 || ' days')::interval
FROM generate_series(0, 10) AS n;

-- Frank: power user
INSERT INTO public.learning_events (user_id, event_type, event_date)
SELECT 'd0000006-0000-0000-0000-000000000006',
  (ARRAY['video_watched','video_watched','ai_chat','ai_chat','quiz_completed'])[floor(random()*5+1)],
  current_date - (n || ' days')::interval
FROM generate_series(0, 90) AS n;

-- Hank: top user
INSERT INTO public.learning_events (user_id, event_type, event_date)
SELECT 'd0000008-0000-0000-0000-000000000008',
  (ARRAY['video_watched','video_watched','video_watched','ai_chat','quiz_completed','quiz_completed'])[floor(random()*6+1)],
  current_date - (n || ' days')::interval
FROM generate_series(0, 120) AS n;

-- 4. Demo 討論
INSERT INTO public.discussions (user_id, title, content, tag, reply_count, created_at)
VALUES
  ('d0000001-0000-0000-0000-000000000001', '大家都用什麼 AI 工具寫程式？', '最近在試 Claude Code 和 Cursor，想知道大家的使用心得，哪個比較適合新手？', 'tools', 3, now() - interval '2 days'),
  ('d0000002-0000-0000-0000-000000000002', 'AI 驅動決策力這門課太讚了', '剛看完第二章，數據框架的部分講得非常清楚，已經開始應用在工作上了。推薦給所有想提升決策品質的人！', 'sharing', 5, now() - interval '3 days'),
  ('d0000003-0000-0000-0000-000000000003', '請問 Prompt Engineering 有什麼訣竅？', '我用 ChatGPT 的時候常常得不到想要的答案，有沒有推薦的技巧或課程？', 'course-help', 4, now() - interval '1 day'),
  ('d0000004-0000-0000-0000-000000000004', '分享我用 Vibe Coding 做的第一個網站', '跟著 YC 老師的課程，花了一個週末做出了我的個人作品集網站，太有成就感了！附上截圖...', 'sharing', 7, now() - interval '5 days'),
  ('d0000006-0000-0000-0000-000000000006', '2026 Q2 太空產業投資趨勢整理', '看完久方武老師的大師課後，整理了一些重點筆記分享給大家。SpaceX 的新發射計畫、Rocket Lab 的財報表現...', 'sharing', 2, now() - interval '4 days'),
  ('d0000005-0000-0000-0000-000000000005', '有人想一起組讀書會嗎？', '每週約一次，一起讀 AI 相關的書或論文，互相討論。有興趣的 +1！', 'general', 8, now() - interval '6 days'),
  ('d0000008-0000-0000-0000-000000000008', '從望遠境到通觀境的心得', '剛升到 Lv.21 通觀境，分享一下這段時間的學習策略：每天固定看一章 + 交作業 + 跟 Eyesy 聊天，XP 累積得很快...', 'sharing', 6, now() - interval '1 day'),
  ('d0000007-0000-0000-0000-000000000007', '新手報到！大家好', '剛註冊牛津視界，對 AI 和區塊鏈都很感興趣，請多指教！', 'off-topic', 3, now() - interval '7 days')
ON CONFLICT DO NOTHING;

-- 5. Demo 討論回覆
INSERT INTO public.discussion_replies (discussion_id, user_id, content, created_at)
SELECT d.id, 'd0000002-0000-0000-0000-000000000002', '推薦 Claude Code，真的很強！', now() - interval '1 day'
FROM public.discussions d WHERE d.title LIKE '%AI 工具%' LIMIT 1;

INSERT INTO public.discussion_replies (discussion_id, user_id, content, created_at)
SELECT d.id, 'd0000004-0000-0000-0000-000000000004', '我也是用 Cursor，配合 Claude 效率超高', now() - interval '12 hours'
FROM public.discussions d WHERE d.title LIKE '%AI 工具%' LIMIT 1;

INSERT INTO public.discussion_replies (discussion_id, user_id, content, created_at)
SELECT d.id, 'd0000001-0000-0000-0000-000000000001', '恭喜！做得很棒，有上線嗎？想看看', now() - interval '4 days'
FROM public.discussions d WHERE d.title LIKE '%Vibe Coding%' LIMIT 1;

INSERT INTO public.discussion_replies (discussion_id, user_id, content, created_at)
SELECT d.id, 'd0000006-0000-0000-0000-000000000006', '太強了！我也想學 Vibe Coding', now() - interval '3 days'
FROM public.discussions d WHERE d.title LIKE '%Vibe Coding%' LIMIT 1;

INSERT INTO public.discussion_replies (discussion_id, user_id, content, created_at)
SELECT d.id, 'd0000003-0000-0000-0000-000000000003', '歡迎！你可以先做個學習路徑測驗，Eyesy 會推薦適合你的課', now() - interval '6 days'
FROM public.discussions d WHERE d.title LIKE '%新手報到%' LIMIT 1;

-- 6. Demo 副本
INSERT INTO public.dungeons (title, description, dungeon_type, required_level, requires_pro, xp_reward, duration_minutes, status)
VALUES
  ('AI 工具全攻略 — 2026 最新版', '久方武院長帶你盤點 2026 最值得關注的 AI 工具，從 Claude 到 Midjourney，實際操作示範。', 'lecture', 1, false, 15, 90, 'recorded'),
  ('用 AI 兩小時做一個完整網站', 'YC 老師實戰工作坊：從零開始，用 AI 輔助開發一個完整的個人品牌網站。帶筆電來，做完帶走。', 'workshop', 5, true, 50, 120, 'upcoming'),
  ('Prompt Engineering 進階實戰', '不只是寫 prompt，學會用 Chain-of-Thought、Few-shot 等進階技巧，讓 AI 輸出專業級內容。', 'workshop', 7, true, 50, 90, 'upcoming'),
  ('太空產業投資圓桌 — 久方武 × 黃靖哲', '院長與持牌分析師深度對談：SpaceX、Rocket Lab、Planet Labs，哪些值得長期布局？限額 20 人。', 'master', 12, true, 80, 60, 'upcoming'),
  ('The Vision Summit — 年度學員交流', '牛津視界年度盛會。頂尖學員分享學習歷程，講師圓桌問答，限天視境學員參加。', 'legendary', 40, true, 200, 180, 'upcoming')
ON CONFLICT DO NOTHING;
