-- Migration: Switch from Clerk to Supabase Auth
-- profiles.clerk_id → profiles.auth_id (references auth.users.id)

-- Drop old RLS policies that reference clerk_id
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own course access" on public.course_access;
drop policy if exists "Users can view own orders" on public.orders;
drop policy if exists "Users can create own orders" on public.orders;
drop policy if exists "Users can view own learning events" on public.learning_events;
drop policy if exists "Users can insert own learning events" on public.learning_events;

-- Drop old index
drop index if exists idx_profiles_clerk_id;

-- Rename clerk_id to auth_id and change type to uuid
alter table public.profiles drop column clerk_id;
alter table public.profiles add column auth_id uuid unique references auth.users(id) on delete cascade;

-- New RLS policies using Supabase Auth (auth.uid())
create policy "Users can view own profile"
  on public.profiles for select
  using (auth_id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (auth_id = auth.uid());

create policy "Users can view own course access"
  on public.course_access for select
  using (user_id in (
    select id from public.profiles where auth_id = auth.uid()
  ));

create policy "Users can view own orders"
  on public.orders for select
  using (user_id in (
    select id from public.profiles where auth_id = auth.uid()
  ));

create policy "Users can create own orders"
  on public.orders for insert
  with check (user_id in (
    select id from public.profiles where auth_id = auth.uid()
  ));

create policy "Users can view own learning events"
  on public.learning_events for select
  using (user_id in (
    select id from public.profiles where auth_id = auth.uid()
  ));

create policy "Users can insert own learning events"
  on public.learning_events for insert
  with check (user_id in (
    select id from public.profiles where auth_id = auth.uid()
  ));

-- Index on new auth_id
create index idx_profiles_auth_id on public.profiles(auth_id);

-- Auto-create profile on signup via trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (auth_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Trigger: when a new user signs up, auto-create their profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Insert demo courses
insert into public.courses (slug, title, description, instructor, price, category, thumbnail_url, is_free_preview) values
  ('ai-decision-making', 'AI 驅動決策力：經理人的數據思維', '學習如何運用生成式 AI 優化團隊工作流，提升 300% 的生產效率。', '久方武院長', 2980, '商務決策', 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800', false),
  ('prompt-engineering-masterclass', '提示工程大師班：精準溝通的藝術', '掌握與 LLM 互動的核心語法，將 AI 變成你最得力的數位雙生子。', '林偉傑', 1880, '技術實作', 'https://images.unsplash.com/photo-1620712943543-bcc4628c9757?auto=format&fit=crop&q=80&w=800', false),
  ('ai-trends-2026', '2026 AI 趨勢導讀：掌握技術奇點', '每週更新最新 AI 研究報告，為你過濾雜訊，只留下具商業價值的洞察。', '張美玲', 4500, '趨勢分析', 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800', false),
  ('web3-smart-contracts', '智能合約入門：從零到部署', '從 Solidity 基礎到實際部署，帶你進入 Web3 開發的世界。', 'YC', 3500, '區塊鏈', 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=800', true)
on conflict (slug) do nothing;
