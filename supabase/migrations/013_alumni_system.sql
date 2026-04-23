-- Alumni system: 巨石文化實體課程 40 位學員 legacy access
-- 2026-04-22
--
-- 設計：
-- 1. `alumni_emails` 表：白名單 + 他們買過哪些期的 tag
-- 2. profiles 新增 is_alumni 欄位
-- 3. 新增兩門 legacy 課程（Go 初階 / 進階），tier = 'alumni-only'（不在 /courses 主列表）
-- 4. handle_new_user trigger 擴充：如果註冊 email 在 alumni_emails，自動標 alumni + 授權 legacy
-- 5. 新增 alumni_price 欄位到 courses，alumni 買新課享專屬價

-- 1. alumni whitelist 表
create table if not exists public.alumni_emails (
  email text primary key,
  attended_basic boolean not null default false,     -- 初階班
  attended_advanced boolean not null default false,  -- 進階班
  note text,
  imported_at timestamptz not null default now()
);

alter table public.alumni_emails enable row level security;
-- 只有 service role 讀寫，no public policies

-- 2. profiles 加 is_alumni 欄位
alter table public.profiles
  add column if not exists is_alumni boolean not null default false;

create index if not exists idx_profiles_is_alumni
  on public.profiles(is_alumni) where is_alumni = true;

-- 3. courses 加 alumni_price
alter table public.courses
  add column if not exists alumni_price integer;  -- null = 無老學員優惠

-- 4. 新增兩門 legacy 課程（slug 以 legacy- 開頭）
insert into public.courses (slug, title, description, instructor, price, alumni_price, category, thumbnail_url, is_free_preview)
values
  (
    'legacy-go-basics',
    '巨石文化 Go 語言初階班（實體版線上化）',
    '完整收錄巨石文化 2025 年 Go 初階實體班教材。從語法基礎到 goroutine、channel、第一個 Web API。給老學員終身免費回看使用。',
    'YC',
    0,     -- 非老學員不販售（會在 UI 擋掉）
    0,     -- 老學員免費
    '工程師養成（Legacy）',
    null,
    false
  ),
  (
    'legacy-go-advanced',
    '巨石文化 Go 語言進階班（實體版線上化）',
    '進階實作：分散式系統、高併發、效能調校、實際專案範本。老學員終身免費回看。',
    'YC',
    0,
    0,
    '工程師養成（Legacy）',
    null,
    false
  )
on conflict (slug) do nothing;

-- 5. 新課對老學員的優惠價（Vibe Coding 和 太空課外部 NT$4,990，老學員 NT$1,490）
update public.courses
set alumni_price = 1490
where slug in (
  'master-vibe-coding-solo',
  'master-space-age-capital'
);
-- 台股技術分析先不設，等黃老師那邊決定

-- 6. 擴充 handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  new_profile_id uuid;
  alumni_record record;
begin
  insert into public.profiles (auth_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (auth_id) do nothing
  returning id into new_profile_id;

  if new_profile_id is null then
    return new;
  end if;

  -- Alumni check
  select * into alumni_record
  from public.alumni_emails
  where lower(email) = lower(new.email);

  if found then
    update public.profiles
    set is_alumni = true
    where id = new_profile_id;

    if alumni_record.attended_basic then
      insert into public.course_access (user_id, course_id, access_type)
      select new_profile_id, c.id, 'alumni'
      from public.courses c
      where c.slug = 'legacy-go-basics'
      on conflict (user_id, course_id, access_type) do nothing;
    end if;

    if alumni_record.attended_advanced then
      insert into public.course_access (user_id, course_id, access_type)
      select new_profile_id, c.id, 'alumni'
      from public.courses c
      where c.slug = 'legacy-go-advanced'
      on conflict (user_id, course_id, access_type) do nothing;
    end if;
  end if;

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for auth_id=%, email=%, sqlstate=%, message=%',
      new.id, new.email, sqlstate, sqlerrm;
    return new;
end;
$$;

-- 7. course_access 的 access_type 原本是什麼？查看並確保 'alumni' 是合法值
-- （如果有 check constraint，這裡 alter）
do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'course_access_access_type_check'
  ) then
    alter table public.course_access
      drop constraint course_access_access_type_check;
  end if;

  alter table public.course_access
    add constraint course_access_access_type_check
    check (access_type in ('purchased', 'alumni', 'gift', 'pro'));
end $$;
