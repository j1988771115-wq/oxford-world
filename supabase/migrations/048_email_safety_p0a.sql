-- 048: P0a Email Safety - unsubscribes + audit logs
--
-- 5/10 incident + Gemini/Codex review 後必須加:
-- 1. email_unsubscribes table 紀錄退訂,寄信前 filter
-- 2. admin_audit_logs table 紀錄 admin 動作(metadata 限 PII whitelist)

create table if not exists public.email_unsubscribes (
  email text primary key,
  unsubscribed_at timestamptz not null default now(),
  reason text,
  source text default 'token_click'
);

create index if not exists idx_email_unsubscribes_unsubscribed_at
  on public.email_unsubscribes(unsubscribed_at desc);

alter table public.email_unsubscribes enable row level security;
create policy "email_unsubscribes service role only"
  on public.email_unsubscribes for all using (false);

-- admin_audit_logs: 紀錄 admin 動作。metadata 必須 PII whitelist
-- (Codex review: 禁存完整 HTML / recipient emails,只存 hash + count + masked target)

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  actor_role text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_actor
  on public.admin_audit_logs(actor_email, created_at desc);
create index if not exists idx_admin_audit_logs_action
  on public.admin_audit_logs(action, created_at desc);

alter table public.admin_audit_logs enable row level security;
create policy "admin_audit_logs service role only"
  on public.admin_audit_logs for all using (false);
