-- Enable pgvector extension
create extension if not exists vector;

-- User profiles (linked to Clerk)
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_id text unique not null,
  email text not null,
  display_name text,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  discord_id text,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

-- Courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  instructor text not null,
  price integer not null default 0, -- NTD, 0 = free
  is_free_preview boolean not null default false,
  thumbnail_url text,
  category text,
  mux_playback_id text,
  mux_asset_id text,
  sanity_id text,
  created_at timestamptz not null default now()
);

-- Course access (tracks who can watch what)
-- Separate from subscription: purchased courses are permanent
create table public.course_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  access_type text not null check (access_type in ('purchased', 'subscription')),
  granted_at timestamptz not null default now(),
  unique(user_id, course_id, access_type)
);

-- Orders (payment records from NewebPay)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  merchant_order_no text unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id),
  order_type text not null check (order_type in ('course', 'subscription')),
  amount integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  newebpay_trade_no text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Email subscribers
create table public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text not null default 'website',
  subscribed_at timestamptz not null default now()
);

-- Course content embeddings for RAG
create table public.course_content (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  content text not null,
  content_type text not null default 'transcript', -- transcript, notes, description
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- Learning progress (for streaks and gamification)
create table public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id),
  event_type text not null check (event_type in ('video_watched', 'ai_chat', 'quiz_completed')),
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_profiles_clerk_id on public.profiles(clerk_id);
create index idx_course_access_user on public.course_access(user_id);
create index idx_course_access_course on public.course_access(course_id);
create index idx_orders_user on public.orders(user_id);
create index idx_orders_merchant_no on public.orders(merchant_order_no);
create index idx_learning_events_user_date on public.learning_events(user_id, event_date);
create index idx_course_content_embedding on public.course_content using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_access enable row level security;
alter table public.orders enable row level security;
alter table public.email_subscribers enable row level security;
alter table public.course_content enable row level security;
alter table public.learning_events enable row level security;

-- Courses are public read
create policy "Courses are viewable by everyone"
  on public.courses for select using (true);

-- Profiles: users can read/update their own
create policy "Users can view own profile"
  on public.profiles for select
  using (clerk_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can update own profile"
  on public.profiles for update
  using (clerk_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

-- Course access: users can view their own
create policy "Users can view own course access"
  on public.course_access for select
  using (user_id in (
    select id from public.profiles
    where clerk_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  ));

-- Orders: users can view their own
create policy "Users can view own orders"
  on public.orders for select
  using (user_id in (
    select id from public.profiles
    where clerk_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  ));

-- Email subscribers: anyone can insert (public form)
create policy "Anyone can subscribe"
  on public.email_subscribers for insert
  with check (true);

-- Course content: public read for RAG queries
create policy "Course content is readable"
  on public.course_content for select using (true);

-- Learning events: users can insert/read their own
create policy "Users can view own learning events"
  on public.learning_events for select
  using (user_id in (
    select id from public.profiles
    where clerk_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  ));

create policy "Users can insert own learning events"
  on public.learning_events for insert
  with check (user_id in (
    select id from public.profiles
    where clerk_id = (current_setting('request.jwt.claims', true)::json->>'sub')
  ));

-- Function for pgvector similarity search (used by AI chat)
create or replace function match_course_content(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_course_id uuid default null
)
returns table (
  id uuid,
  course_id uuid,
  content text,
  content_type text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    cc.id,
    cc.course_id,
    cc.content,
    cc.content_type,
    1 - (cc.embedding <=> query_embedding) as similarity
  from public.course_content cc
  where
    (filter_course_id is null or cc.course_id = filter_course_id)
    and 1 - (cc.embedding <=> query_embedding) > match_threshold
  order by cc.embedding <=> query_embedding
  limit match_count;
end;
$$;
