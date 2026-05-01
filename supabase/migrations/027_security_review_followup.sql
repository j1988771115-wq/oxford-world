-- 三方 review 後 P0 修補
-- 1. profiles 加 public 顯示欄位 policy(社群頁能看別人 display_name)
-- 2. insights 草稿不再公開
-- 3. discussion_replies 加登入 gate
-- 2026-05-02

-- =========================================
-- 1. profiles 公開顯示欄位
-- =========================================
-- 現有 policy 只允許看自己的 profile,community 頁 join 拿不到別人 display_name → 整個討論列表空
-- 加一條:已登入用戶可讀任何人的「公開顯示欄位」
-- 注意 Postgres RLS 不能 column-level filter,但 sensitive 欄位(email/auth_id)由 023 trigger 攔了寫入,
-- 讀取靠 application 端 select 限定欄位。為了不洩漏 email,加一個「公開讀」policy 但只供 join 用。

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Public read profiles for display" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth_id = auth.uid());

-- 已登入用戶可讀其他用戶 profile(供 community / leaderboard join 用)
-- ⚠️ application 端 select 只應拿 id, display_name, avatar_url, tier 這幾個欄位
-- email 仍受 trigger 保護不能改,但 SELECT 會看見 — 這是 trade-off
create policy "Authenticated read profiles"
  on public.profiles for select
  using (auth.uid() is not null);

-- =========================================
-- 2. insights 草稿不能公開
-- =========================================
drop policy if exists "Published insights are viewable" on public.insights;

create policy "Published insights are viewable"
  on public.insights for select
  using (published = true);

-- =========================================
-- 3. discussion_replies 加登入 gate(對齊 discussions)
-- =========================================
alter table public.discussion_replies enable row level security;

drop policy if exists "Anyone can read discussion_replies" on public.discussion_replies;
drop policy if exists "Public read discussion_replies" on public.discussion_replies;
drop policy if exists "Replies public read" on public.discussion_replies;
drop policy if exists "Users insert own replies" on public.discussion_replies;
drop policy if exists "Users update own replies" on public.discussion_replies;
drop policy if exists "Users delete own replies" on public.discussion_replies;

create policy "Replies public read"
  on public.discussion_replies for select
  using (auth.uid() is not null);

create policy "Users insert own replies"
  on public.discussion_replies for insert
  with check (
    user_id in (select id from public.profiles where auth_id = auth.uid())
  );

create policy "Users update own replies"
  on public.discussion_replies for update
  using (
    user_id in (select id from public.profiles where auth_id = auth.uid())
  );

create policy "Users delete own replies"
  on public.discussion_replies for delete
  using (
    user_id in (select id from public.profiles where auth_id = auth.uid())
  );

-- =========================================
-- 4. profiles trigger 加 discord_id 攔截
-- =========================================
create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
as $$
begin
  if auth.role() <> 'service_role' then
    if new.tier is distinct from old.tier then
      raise exception 'tier 不能由 client 修改';
    end if;
    if new.pro_expires_at is distinct from old.pro_expires_at then
      raise exception 'pro_expires_at 不能由 client 修改';
    end if;
    if new.is_alumni is distinct from old.is_alumni then
      raise exception 'is_alumni 不能由 client 修改';
    end if;
    if new.email is distinct from old.email then
      raise exception 'email 不能由 client 修改';
    end if;
    if new.auth_id is distinct from old.auth_id then
      raise exception 'auth_id 不能由 client 修改';
    end if;
    -- 加 discord_id 攔截:防 user 改別人的 discord_id 偷吃 Pro role
    if new.discord_id is distinct from old.discord_id then
      raise exception 'discord_id 必須由 OAuth 流程綁定,不能直接修改';
    end if;
  end if;
  return new;
end;
$$;
