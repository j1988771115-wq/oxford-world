-- 043: email send log atomic lock (race condition fix)
--
-- 5/10 incident review (Gemini): admin/email idempotency lock 的 check-then-insert
-- 模式有 race condition。並行請求 A+B 同時 check 都看到 no recent → 都寄 → 重複。
--
-- Fix: pg_try_advisory_xact_lock 鎖 hash key,只有一個 request 能進 critical
-- section,其他直接拿 false → 429。

create or replace function public.acquire_email_send_lock(
  p_hash text,
  p_window_minutes int default 5
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_key bigint;
  v_existing int;
begin
  -- transaction-scoped advisory lock,key 由 hash 衍生
  v_lock_key := hashtextextended(p_hash, 0);

  if not pg_try_advisory_xact_lock(v_lock_key) then
    -- 並行 request 持鎖中 → 拒
    return false;
  end if;

  -- 取得鎖,check window 內有沒已存在
  select count(*) into v_existing
  from email_send_log
  where subject_hash = p_hash
    and sent_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_existing > 0 then
    return false;
  end if;

  -- 過 check + 鎖在 → atomic insert placeholder(寄完才 update sent_count)
  insert into email_send_log(target, subject, subject_hash, recipient_count, sent_count, failed_count)
  values ('PENDING', '', p_hash, 0, 0, 0);

  return true;
end;
$$;

grant execute on function public.acquire_email_send_lock(text, int) to service_role;
