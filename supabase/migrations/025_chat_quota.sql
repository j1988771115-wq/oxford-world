-- Chat quota: Q1(90 天) 1M Sonnet tokens/月 + 加購 NT$149 = +500k Sonnet tokens
-- 2026-05-02

create table if not exists public.chat_usage (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  year_month text not null,                              -- '2026-05' (Asia/Taipei)
  sonnet_monthly_remaining bigint not null default 0,    -- 月度 grant 餘額(Q1 1M, 否則 0)
  sonnet_topup_balance bigint not null default 0,        -- 加購池,跨月不重置
  sonnet_tokens_used_total bigint not null default 0,    -- 累積已用(僅統計)
  haiku_tokens_used_month bigint not null default 0,     -- 僅統計
  q1_started_at timestamptz,                             -- Q1 起算點(=最早 course_access.granted_at)
  updated_at timestamptz not null default now()
);
alter table public.chat_usage enable row level security;
-- 只 service role 寫;user 可 select 自己的
create policy "Users see own chat_usage"
  on public.chat_usage for select
  using (user_id in (select id from public.profiles where auth_id = auth.uid()));

-- order_type 加 'chat_topup_149' check
do $$
begin
  if exists (
    select 1 from information_schema.check_constraints
    where constraint_name like '%order_type%'
  ) then
    alter table public.orders drop constraint if exists orders_order_type_check;
  end if;
  alter table public.orders
    add constraint orders_order_type_check
    check (order_type in ('course', 'subscription', 'chat_topup_149'));
end $$;

-- helper:取或建 chat_usage row,並做跨月 reset(在 Q1 內 monthly = 1M, 否則 0)
create or replace function public.refresh_chat_usage(p_user_id uuid)
returns public.chat_usage
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_ym text := to_char(timezone('Asia/Taipei', now()), 'YYYY-MM');
  q1_start timestamptz;
  in_q1 boolean;
  row_data public.chat_usage;
begin
  -- 算 Q1 起算點(最早一筆 course_access)
  select min(granted_at) into q1_start
  from public.course_access
  where user_id = p_user_id;

  in_q1 := q1_start is not null
    and (q1_start + interval '90 days') >= now();

  -- upsert + reset 跨月
  insert into public.chat_usage (
    user_id, year_month, sonnet_monthly_remaining, q1_started_at
  )
  values (
    p_user_id, cur_ym,
    case when in_q1 then 1000000 else 0 end,
    q1_start
  )
  on conflict (user_id) do update
    set
      year_month = case
        when chat_usage.year_month = cur_ym then chat_usage.year_month
        else cur_ym
      end,
      sonnet_monthly_remaining = case
        when chat_usage.year_month = cur_ym then chat_usage.sonnet_monthly_remaining
        else (case when in_q1 then 1000000 else 0 end)
      end,
      haiku_tokens_used_month = case
        when chat_usage.year_month = cur_ym then chat_usage.haiku_tokens_used_month
        else 0
      end,
      q1_started_at = q1_start,
      updated_at = now()
    returning * into row_data;

  if row_data.user_id is null then
    select * into row_data from public.chat_usage where user_id = p_user_id;
  end if;
  return row_data;
end;
$$;

-- helper:扣 Sonnet quota(先扣 monthly, 再扣 topup)
create or replace function public.consume_sonnet_tokens(p_user_id uuid, p_tokens bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining bigint := p_tokens;
  m_dec bigint;
  t_dec bigint;
begin
  perform public.refresh_chat_usage(p_user_id);
  select sonnet_monthly_remaining from public.chat_usage where user_id = p_user_id into m_dec;
  if coalesce(m_dec, 0) >= remaining then
    update public.chat_usage
      set sonnet_monthly_remaining = sonnet_monthly_remaining - remaining,
          sonnet_tokens_used_total = sonnet_tokens_used_total + p_tokens,
          updated_at = now()
      where user_id = p_user_id;
    return;
  end if;
  -- 先扣完 monthly,再扣 topup
  remaining := remaining - coalesce(m_dec, 0);
  update public.chat_usage
    set sonnet_monthly_remaining = 0,
        sonnet_topup_balance = greatest(0, sonnet_topup_balance - remaining),
        sonnet_tokens_used_total = sonnet_tokens_used_total + p_tokens,
        updated_at = now()
    where user_id = p_user_id;
end;
$$;

create or replace function public.add_sonnet_topup(p_user_id uuid, p_tokens bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_chat_usage(p_user_id);
  update public.chat_usage
    set sonnet_topup_balance = sonnet_topup_balance + p_tokens,
        updated_at = now()
    where user_id = p_user_id;
end;
$$;

create or replace function public.add_haiku_usage(p_user_id uuid, p_tokens bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_chat_usage(p_user_id);
  update public.chat_usage
    set haiku_tokens_used_month = haiku_tokens_used_month + p_tokens,
        updated_at = now()
    where user_id = p_user_id;
end;
$$;
