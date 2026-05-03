-- T0-13: protect_profile_sensitive_fields trigger hardening
--
-- 023 + 027 的 trigger 是 SECURITY DEFINER 但沒 set search_path,標準 PG hijack 漏洞。
-- 而且用 auth.role() <> 'service_role' 字串比對:
-- - 任何能讓 auth.role() != 'service_role' 的方式都會觸發保護(預期行為)
-- - 但若內部有別的 Supabase role(replication/pgbouncer/自訂 admin)會被當 client 一起擋
-- - 反過來,如果 caller 拿到 service_role JWT(含 supabase service role API request)會直接繞過
--
-- 修法:
-- 1. set search_path = '' 防 search_path hijack
-- 2. 改成「明確阻擋只 client-facing role」: 只有 authenticated, anon 才需要保護;
--    service_role + supabase_admin + postgres 預設信任(他們本來就 BYPASSRLS)

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
begin
  -- 取 caller 真實 role(三層檢查比單純 auth.role() 嚴格)
  caller_role := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'role', ''),
    auth.role(),
    'anon'
  );

  -- 只 client-facing role(authenticated / anon)需要被擋
  -- service_role / supabase_admin / postgres 走管理路徑,信任他們改 sensitive field
  if caller_role in ('authenticated', 'anon') then
    if new.tier is distinct from old.tier then
      raise exception 'tier 不能由 client 修改';
    end if;
    if new.pro_expires_at is distinct from old.pro_expires_at then
      raise exception 'pro_expires_at 不能由 client 修改';
    end if;
    if new.is_alumni is distinct from old.is_alumni then
      raise exception 'is_alumni 不能由 client 修改';
    end if;
    if new.email is distinct from old.email then
      raise exception 'email 不能由 client 修改';
    end if;
    if new.auth_id is distinct from old.auth_id then
      raise exception 'auth_id 不能由 client 修改';
    end if;
    if new.discord_id is distinct from old.discord_id then
      raise exception 'discord_id 必須由 OAuth 流程綁定,不能直接修改';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.protect_profile_sensitive_fields() is
  'Hardened in migration 035: explicit search_path, multi-source role check, only blocks authenticated/anon (trusts service_role/postgres/supabase_admin).';

-- =========================================
-- 重新 attach trigger — 線上發現 023 的 create trigger 沒成功 attach,prod 一直是裸的
-- (function 有但 trigger 沒)。client 一直能直接改 tier / email / auth_id / discord_id
-- 任何 user 都可 .from('profiles').update({ tier: 'pro' }) 自我升級
-- =========================================
drop trigger if exists protect_profile_sensitive on public.profiles;
create trigger protect_profile_sensitive
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_fields();
