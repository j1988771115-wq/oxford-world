-- Queue for Discord Pro-role grants that failed or were deferred.
-- Webhook enqueues on failure; cron retries hourly.

create table if not exists public.pending_discord_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  discord_id text not null,
  reason text,
  attempts integer not null default 0,
  last_attempt_at timestamptz,
  last_error text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, discord_id)
);

create index if not exists idx_pending_discord_grants_unresolved
  on public.pending_discord_grants (created_at)
  where resolved_at is null;

alter table public.pending_discord_grants enable row level security;

-- Only service role reads/writes; no public policies.
-- Users can see their own pending grant status via a minimal policy:
create policy "Users can view own pending discord grants"
  on public.pending_discord_grants for select
  using (user_id in (select id from public.profiles where auth_id = auth.uid()));
