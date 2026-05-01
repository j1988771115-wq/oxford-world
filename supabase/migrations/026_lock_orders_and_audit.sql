-- P0 EMERGENCY: 任何登入用戶可 curl /rest/v1/orders 看到全部訂單
-- (用戶 email/金額/訂單號全洩漏)
-- 2026-05-02

-- =========================================
-- 1. ORDERS — 只能讀自己的單,客戶端不能寫(只有 server service_role 寫)
-- =========================================
alter table public.orders enable row level security;

-- 砍掉任何現有寬鬆 policy
drop policy if exists "Anyone can read orders" on public.orders;
drop policy if exists "Public read orders" on public.orders;
drop policy if exists "Users can read orders" on public.orders;
drop policy if exists "Authenticated users read orders" on public.orders;

-- 用戶只能 SELECT 自己的單
create policy "Users read own orders"
  on public.orders for select
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE 都不開給 client(只有 service_role 走 server action)
-- 不寫對應 policy 等於拒絕(RLS enabled but no policy = deny)

-- =========================================
-- 2. COURSE_ACCESS — 只能看自己的開通記錄
-- =========================================
alter table public.course_access enable row level security;

drop policy if exists "Anyone can read course_access" on public.course_access;
drop policy if exists "Public read course_access" on public.course_access;
drop policy if exists "Users can read course_access" on public.course_access;

create policy "Users read own course_access"
  on public.course_access for select
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- =========================================
-- 3. COURSE_PROGRESS — 只能看 / 改自己的進度
-- =========================================
alter table public.course_progress enable row level security;

drop policy if exists "Anyone can read course_progress" on public.course_progress;
drop policy if exists "Public read course_progress" on public.course_progress;

create policy "Users read own progress"
  on public.course_progress for select
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

create policy "Users update own progress"
  on public.course_progress for update
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

create policy "Users insert own progress"
  on public.course_progress for insert
  with check (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- =========================================
-- 4. VIDEO_SESSIONS — 只能看自己的 session(裝置追蹤)
-- =========================================
alter table public.video_sessions enable row level security;

drop policy if exists "Anyone can read video_sessions" on public.video_sessions;
drop policy if exists "Public read video_sessions" on public.video_sessions;

create policy "Users read own video_sessions"
  on public.video_sessions for select
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- =========================================
-- 5. LEARNING_EVENTS — XP 事件,只能看自己
-- =========================================
alter table public.learning_events enable row level security;

drop policy if exists "Anyone can read learning_events" on public.learning_events;
drop policy if exists "Public read learning_events" on public.learning_events;

create policy "Users read own learning_events"
  on public.learning_events for select
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- =========================================
-- 6. CHAT_USAGE — Eyesy quota,只能看自己
-- =========================================
alter table public.chat_usage enable row level security;

drop policy if exists "Anyone can read chat_usage" on public.chat_usage;
drop policy if exists "Public read chat_usage" on public.chat_usage;

create policy "Users read own chat_usage"
  on public.chat_usage for select
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- =========================================
-- 7. EMAIL_SUBSCRIBERS — 完全鎖,只 service_role 看(行銷數據)
-- =========================================
alter table public.email_subscribers enable row level security;

drop policy if exists "Anyone can read email_subscribers" on public.email_subscribers;
drop policy if exists "Public read email_subscribers" on public.email_subscribers;

-- 不寫任何 policy = 拒絕 client 全部讀寫,只 service_role 旁路

-- =========================================
-- 8. PENDING_DISCORD_GRANTS — admin only
-- =========================================
alter table public.pending_discord_grants enable row level security;

drop policy if exists "Anyone can read pending_discord_grants" on public.pending_discord_grants;
drop policy if exists "Public read pending_discord_grants" on public.pending_discord_grants;

-- 不開 client policy

-- =========================================
-- 9. DISCUSSIONS — 公開的學員討論可讀,但只能寫自己的
-- =========================================
alter table public.discussions enable row level security;

drop policy if exists "Anyone can write discussions" on public.discussions;

-- 已登入學員可讀全部討論(社群)
drop policy if exists "Discussions public read" on public.discussions;
create policy "Discussions public read"
  on public.discussions for select
  using (auth.uid() is not null);

-- 只能寫自己的討論
drop policy if exists "Users insert own discussions" on public.discussions;
create policy "Users insert own discussions"
  on public.discussions for insert
  with check (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- 只能改自己的討論
drop policy if exists "Users update own discussions" on public.discussions;
create policy "Users update own discussions"
  on public.discussions for update
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- 只能刪自己的討論
drop policy if exists "Users delete own discussions" on public.discussions;
create policy "Users delete own discussions"
  on public.discussions for delete
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );
