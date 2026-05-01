-- P0 安全修復 — launch 前必跑
-- 1) course_content RLS 鎖定:只有買過課程的學員可讀
-- 2) profiles 限制 client 只能改安全欄位 (display_name, discord_id, avatar_url)
--    禁止 client 改 tier / pro_expires_at / is_alumni / email / auth_id
-- 2026-05-01

-- =========================================
-- 1. course_content: 只有 purchased / pro 可讀
-- =========================================
drop policy if exists "Course content public read" on public.course_content;

create policy "Course content paid only"
  on public.course_content for select
  using (
    course_id in (
      select course_id from public.course_access
      where user_id in (select id from public.profiles where auth_id = auth.uid())
    )
  );

-- match_course_content RPC 是 SECURITY DEFINER 嗎? 若是,RPC 旁路 RLS,要鎖
-- 改成 SECURITY INVOKER + 把 RLS 帶進來
alter function public.match_course_content(vector, double precision, integer, uuid)
  security invoker;

-- =========================================
-- 2. profiles 敏感欄位鎖定
-- =========================================
-- 現有 policy 通常是 user 可改自己整列。改成只能改安全欄位。
drop policy if exists "Users can update own profile" on public.profiles;

-- 允許 user 改安全欄位(display_name, discord_id, avatar_url)
create policy "Users can update own profile (safe fields)"
  on public.profiles for update
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- Trigger: 攔截 client 直接寫入 tier/pro_expires_at/is_alumni
-- 只有 service_role 可改這些(webhook、admin 才能)
create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
as $$
begin
  -- 用 auth.role() 判斷是不是 service_role
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
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_sensitive on public.profiles;
create trigger protect_profile_sensitive
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_fields();
