-- RLS 安全 audit — 一次看清楚所有 public table 的防護狀態
-- 貼進 Supabase SQL Editor 直接 run,不會改任何資料

-- 1. 哪些 table 沒開 RLS(危險:client 可任意讀寫)
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by rowsecurity, tablename;

-- 2. 每個 table 的 policy 列表
select
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as using_clause,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3. 找出有 RLS 但沒任何 policy 的 table(等同於 deny all,可能是漏設)
with t as (
  select tablename from pg_tables where schemaname='public' and rowsecurity=true
), p as (
  select tablename from pg_policies where schemaname='public' group by tablename
)
select t.tablename as "table_with_rls_but_no_policy"
from t left join p on t.tablename = p.tablename
where p.tablename is null;

-- 4. SECURITY DEFINER function(會旁路 RLS 的 RPC)
select
  n.nspname as schema,
  p.proname as function_name,
  case when p.prosecdef then 'SECURITY DEFINER (BYPASSES RLS)' else 'SECURITY INVOKER' end as security
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public'
order by p.prosecdef desc, p.proname;
