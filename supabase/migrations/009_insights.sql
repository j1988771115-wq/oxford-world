-- Insights: articles, reports, tool shares
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null,
  content text not null,
  category text not null default 'ai' check (category in ('ai', 'investment', 'tools', 'coding')),
  is_pro boolean not null default false,
  is_free_course boolean not null default false,
  author text not null,
  thumbnail_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_insights_published on public.insights(published, published_at desc);
create index if not exists idx_insights_category on public.insights(category);

alter table public.insights enable row level security;

-- Everyone can read published insights (content gating handled in app)
do $$ begin
  create policy "Published insights are viewable" on public.insights for select using (true);
exception when duplicate_object then null;
end $$;
