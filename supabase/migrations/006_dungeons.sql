-- Dungeons (副本): special events — lectures, workshops, master sessions
create table if not exists public.dungeons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  dungeon_type text not null check (dungeon_type in ('lecture', 'workshop', 'master', 'legendary')),
  required_level integer not null default 1,
  requires_pro boolean not null default false,
  ticket_price integer, -- NTD, null = no separate ticket needed
  xp_reward integer not null default 10,
  -- Content
  video_url text, -- YouTube embed or Mux
  content_md text, -- Markdown content for the event page
  -- Scheduling
  scheduled_at timestamptz, -- null = available anytime (recorded)
  duration_minutes integer,
  max_participants integer, -- null = unlimited
  -- Status
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'ended', 'recorded')),
  created_at timestamptz not null default now()
);

-- Dungeon participation / registration
create table if not exists public.dungeon_entries (
  id uuid primary key default gen_random_uuid(),
  dungeon_id uuid not null references public.dungeons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'attended', 'completed')),
  xp_claimed boolean not null default false,
  registered_at timestamptz not null default now(),
  unique(dungeon_id, user_id)
);

-- Indexes
create index idx_dungeons_type_level on public.dungeons(dungeon_type, required_level);
create index idx_dungeon_entries_user on public.dungeon_entries(user_id);
create index idx_dungeon_entries_dungeon on public.dungeon_entries(dungeon_id);

-- RLS
alter table public.dungeons enable row level security;
alter table public.dungeon_entries enable row level security;

-- Dungeons: public read
create policy "Dungeons are viewable by everyone"
  on public.dungeons for select using (true);

-- Entries: users can view/create their own
create policy "Users can view own dungeon entries"
  on public.dungeon_entries for select
  using (user_id in (select id from public.profiles where auth_id = auth.uid()));

create policy "Users can register for dungeons"
  on public.dungeon_entries for insert
  with check (user_id in (select id from public.profiles where auth_id = auth.uid()));

create policy "Users can update own entries"
  on public.dungeon_entries for update
  using (user_id in (select id from public.profiles where auth_id = auth.uid()));
