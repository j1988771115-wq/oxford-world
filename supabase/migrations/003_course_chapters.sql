-- Add multi-chapter course structure
-- Also add pro_expires_at for subscription management

create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  mux_playback_id text,
  duration_seconds integer,
  is_free_preview boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_chapters_course on public.course_chapters(course_id, sort_order);
alter table public.course_chapters enable row level security;

-- Chapters are viewable by everyone (access control at playback level)
create policy "Chapters are viewable by everyone"
  on public.course_chapters for select using (true);

-- Add pro expiry to profiles for subscription management
alter table public.profiles add column if not exists pro_expires_at timestamptz;

-- Insert demo chapters for existing courses
insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, '課程介紹', 1, true, 900
from public.courses c where c.slug = 'ai-decision-making'
on conflict do nothing;

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, '數據驅動決策框架', 2, false, 1350
from public.courses c where c.slug = 'ai-decision-making'
on conflict do nothing;

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, '預測分析的商業價值', 3, false, 1200
from public.courses c where c.slug = 'ai-decision-making'
on conflict do nothing;

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, '課程介紹', 1, true, 600
from public.courses c where c.slug = 'prompt-engineering-masterclass'
on conflict do nothing;

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, 'Few-shot Prompting 技巧', 2, false, 1500
from public.courses c where c.slug = 'prompt-engineering-masterclass'
on conflict do nothing;

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, 'Chain-of-Thought 推理', 3, false, 1350
from public.courses c where c.slug = 'prompt-engineering-masterclass'
on conflict do nothing;
