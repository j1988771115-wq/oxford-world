-- 049: P0b Auth Dual-Mode - profiles.role + course_permissions
--
-- 加 profiles.role 欄位 + seed 內部人員角色。為 P0c authorization hardening 做準備。
-- Codex review patch: 用 profiles.auth_id = auth.uid()(不是 profiles.id)寫 RLS。

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'instructor', 'admin', 'superadmin'));

create index if not exists idx_profiles_role on public.profiles(role)
  where role <> 'user';

-- seed (idempotent)
update public.profiles set role = 'superadmin'
  where lower(email) in ('j1988771115@gmail.com', 'jd@onlymusic.tw');

update public.profiles set role = 'instructor'
  where lower(email) = 'yupupin@gmail.com';

-- course_permissions: instructor 對課的 permission (P0c 用)
create table if not exists public.course_permissions (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null default 'instructor'
    check (permission in ('owner', 'instructor', 'co-instructor')),
  granted_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

create index if not exists idx_course_permissions_user on public.course_permissions(user_id);

alter table public.course_permissions enable row level security;
create policy "course_permissions service role only"
  on public.course_permissions for all using (false);

-- seed: 太空課給 yupupin owner
insert into public.course_permissions (course_id, user_id, permission)
select c.id, p.id, 'owner'
from public.courses c, public.profiles p
where c.slug = 'master-space-age-capital'
  and lower(p.email) = 'yupupin@gmail.com'
on conflict (course_id, user_id) do nothing;
