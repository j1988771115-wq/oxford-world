-- 050: P1 Email Nudge cron — sent log + global cap
--
-- Codex review patch: 防一人一天多封 nudge 轟炸
--   primary key 不能只 (user_id, sequence) — 4 sequences 同天命中 = 4 封
--   加 sent_date generated column + unique index → 一人一天 1 封 hard cap

create table if not exists public.nudge_sent_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sequence text not null check (sequence in ('welcome', 'trial_to_paid', 'onboarding', 'win_back')),
  sent_at timestamptz not null default now(),
  sent_date date not null generated always as ((sent_at at time zone 'Asia/Taipei')::date) stored,
  metadata jsonb default '{}'::jsonb
);

-- 一人一天 1 封 (任何 sequence) hard cap
create unique index if not exists uq_nudge_user_date
  on public.nudge_sent_log(user_id, sent_date);

-- query 「user X 過去 7 天有沒寄過」用
create index if not exists idx_nudge_user_sent_at
  on public.nudge_sent_log(user_id, sent_at desc);

-- query 「過去 X 天 sequence Y 寄了幾筆」audit 用
create index if not exists idx_nudge_sequence_sent_at
  on public.nudge_sent_log(sequence, sent_at desc);

alter table public.nudge_sent_log enable row level security;
create policy "nudge_sent_log service role only"
  on public.nudge_sent_log for all using (false);
