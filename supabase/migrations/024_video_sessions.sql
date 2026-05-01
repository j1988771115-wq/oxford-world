-- 多裝置觀看偵測:每次拿 signed token 時記錄一筆,超過閾值停止發 token
-- 2026-05-01

create table if not exists public.video_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ip_hash text not null,                -- IP hash(不存原始 IP, privacy)
  ua_hash text not null,                -- User-Agent hash
  device_key text not null,             -- ip_hash + ua_hash combined
  chapter_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_video_sessions_user_time on public.video_sessions(user_id, created_at desc);
create index if not exists idx_video_sessions_user_device on public.video_sessions(user_id, device_key, created_at desc);

alter table public.video_sessions enable row level security;
-- 不開任何 client policy → 只 service role 能讀寫(server 端使用)
