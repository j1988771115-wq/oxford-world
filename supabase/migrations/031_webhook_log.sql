-- webhook 進來的 raw audit log
-- 為什麼:藍新 webhook 失敗信顯示 Http Status 500 → 我們 handler 自己 throw 出去
-- 沒這張表前 Vercel hobby log 1h 過期就抓不到當時的 raw payload + error
-- 從現在開始每筆 webhook 進來第一行先寫這裡,handler crash 也跑得到

create table if not exists public.webhook_log (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  received_at timestamptz not null default now(),
  raw_body text,
  raw_headers jsonb,
  merchant_order_no text,
  http_status int,
  handler_status text,        -- 'ok' | 'verification_failed' | 'duplicate' | 'business_fail' | 'crash'
  handler_error text,
  duration_ms int,
  needs_manual boolean not null default false
);

create index if not exists idx_webhook_log_received_at
  on public.webhook_log(received_at desc);

create index if not exists idx_webhook_log_merchant
  on public.webhook_log(merchant_order_no)
  where merchant_order_no is not null;

create index if not exists idx_webhook_log_needs_manual
  on public.webhook_log(needs_manual)
  where needs_manual = true;

-- RLS:沒 policy = 只 service role 看得到。client 不該讀。
alter table public.webhook_log enable row level security;

comment on table public.webhook_log is
  'webhook 進來的 raw audit log。第一手紀錄,handler crash 也跑得到 insert。';
