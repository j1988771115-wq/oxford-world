-- T0-2: 修 profiles 表 email/auth_id/discord_id 對任何登入者公開的 PII leak
--
-- 027 'Authenticated read profiles' policy 讓任何登入用戶 SELECT 任何 profile 整列,
-- 包含 email, auth_id, discord_id, current_streak, longest_streak, pro_expires_at
-- 攻擊路徑: ?select=email&limit=1000 撈全表 email (danny wang 攻擊路徑復活)
--
-- 修法: 建 public_profiles view 只 expose 安全 column,撤掉 027 的廣 read policy,
-- 改現有 community/leaderboard query 用 view (改 query 工作另外做)
--
-- 注意:此 migration **暫時不 apply** 直到 community.ts 的 PostgREST join 改用 RPC,
-- 否則 discussion 列表會看不到 author display_name。
-- TODO follow-up:
-- 1. 寫 RPC get_public_profiles(ids uuid[]) SECURITY DEFINER
-- 2. 改 community.ts 三處 select(*, profiles!inner(display_name)) 為 RPC
-- 3. 改 courses.ts getLeaderboard / getWeeklyLeaderboard 用 view 或 RPC
-- 4. 確認 staging 跑過後 apply 此 migration

-- =========================================
-- 1. public_profiles view (公開 read,只暴露安全 column)
-- =========================================
-- view 預設 SECURITY DEFINER (用 view owner=postgres 跑 underlying query),所以
-- 不受 RLS 限制 — 我們明確控制只暴露 safe column
create or replace view public.public_profiles as
select
  id,
  display_name,
  avatar_url,
  tier,
  is_alumni,
  current_streak,
  longest_streak,
  pro_expires_at,
  created_at,
  last_active_at
from public.profiles;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Safe column subset of profiles for community/leaderboard. Hides email, auth_id, discord_id.';

-- =========================================
-- 2. RPC: 批次取 public profiles (供 PostgREST join 替代)
-- =========================================
create or replace function public.get_public_profiles(p_ids uuid[])
returns setof public.public_profiles
language sql
security definer
set search_path = ''
stable
as $$
  select * from public.public_profiles where id = any(p_ids);
$$;

revoke all on function public.get_public_profiles(uuid[]) from public;
grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;

comment on function public.get_public_profiles(uuid[]) is
  'Replaces direct SELECT on profiles for community/leaderboard joins. SECURITY DEFINER bypasses RLS but only returns safe columns via public_profiles view.';

-- =========================================
-- 3. 撤掉 027 的 broad read policy
-- =========================================
-- 撤掉後,profiles 表 user-scoped 只有 027 的 'Users can read own profile' (auth_id = auth.uid())
-- service_role 仍 BYPASSRLS,webhook/cron/admin 不受影響
drop policy if exists "Authenticated read profiles" on public.profiles;

-- =========================================
-- 4. 防擋 — 撤 anon, authenticated 對 profiles 的 table-level grant (僅保留 own row)
-- =========================================
-- 不動 — 因為「Users can read own profile」policy 還需要 SELECT grant 才生效
-- 但這條 policy 已限制 row 為自己,所以全 column 讀自己 OK
-- 額外保險: 撤 email, auth_id, discord_id 的 column-level select for anon
-- (anon 連登入都沒,本就不該讀任何 profile,這條只是 belt-and-suspenders)
revoke select on public.profiles from anon;