-- 042: email send log + idempotency lock for admin/email API
--
-- 動機: admin/email API 沒防重複寄保險,JD 凌晨手累/網路 timeout 後 refresh
-- 重點 → 同 subject 寄兩遍。加 5 分鐘 idempotency check:
-- API 進場先 check email_send_log,5 分鐘內同 subject_hash 有 row → 拒(429)。
-- 寄成功後 INSERT log。
--
-- subject_hash 而不是 raw subject 因為:
-- - 短(64 char hex)
-- - 比對快
-- - 內容稍改(空格/typo)算新一封不會誤擋

create table if not exists public.email_send_log (
  id uuid primary key default gen_random_uuid(),
  target text not null,
  subject text not null,
  subject_hash text not null,
  recipient_count int not null default 0,
  sent_count int not null default 0,
  failed_count int not null default 0,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_email_send_log_subject_hash_sent_at
  on public.email_send_log(subject_hash, sent_at desc);

-- service role bypass RLS (admin/email API only)
alter table public.email_send_log enable row level security;

-- 不開放 anon / authenticated SELECT (內部 audit only)
create policy "service role only"
  on public.email_send_log
  for all
  using (false);
