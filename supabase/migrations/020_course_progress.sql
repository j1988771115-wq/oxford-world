-- 學員觀看進度（per-chapter，最後位置 + 完成標記）
-- 2026-05-01

create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  last_position_seconds int not null default 0,
  duration_seconds int,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id, chapter_id)
);

create index if not exists idx_course_progress_user_course
  on public.course_progress(user_id, course_id, updated_at desc);

alter table public.course_progress enable row level security;

create policy "Users read own progress"
  on public.course_progress for select
  using (
    auth.uid() = (select auth_id from public.profiles where id = user_id)
  );

create policy "Users insert own progress"
  on public.course_progress for insert
  with check (
    auth.uid() = (select auth_id from public.profiles where id = user_id)
  );

create policy "Users update own progress"
  on public.course_progress for update
  using (
    auth.uid() = (select auth_id from public.profiles where id = user_id)
  );

comment on table public.course_progress is
  '每學員每章節觀看進度。last_position_seconds 用於 resume，completed 用於章節列表打勾';
