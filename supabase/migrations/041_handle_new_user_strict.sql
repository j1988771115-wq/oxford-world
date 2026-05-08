-- handle_new_user 嚴格化:不再 swallow 全部 exception(原 011 設計造成 5/4-5/5 共 4 筆殭屍 user)
--
-- 策略:
-- 1. unique_violation(email/auth_id 撞重) → swallow + raise warning
--    理由:重複 signup 是預期可發生的(user 重新提交 / 雙開分頁),不該擋註冊流程
-- 2. 其他所有 sqlstate(RLS / NOT NULL / encoding / 暫時性 DB 錯)→ RAISE
--    理由:這些是真 bug,讓 auth.users INSERT rollback、user 看到註冊錯誤、retry 即可,不要靜默產殭屍
--
-- 對比原 011:當時設計成 swallow 全部以「不擋註冊」,代價是任何失敗都產殭屍。
-- 此版本縮小 swallow 範圍,只放行真正預期的 conflict 情境。

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
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (auth_id) do nothing;

  return new;
exception
  -- email 撞重(rare,例如帳號刪除後同 email 重註冊但 profile 殘留)
  -- 不擋註冊,但 raise warning 留 PG log 證據
  when unique_violation then
    raise warning 'handle_new_user unique_violation: auth_id=%, email=%, sqlstate=%, message=%',
      new.id, new.email, sqlstate, sqlerrm;
    return new;
  -- 其他錯誤一律 raise → auth.users INSERT rollback → user 看到 signup 錯誤
  -- 比靜默殭屍好太多(後者要等 user 客訴才知道)
end;
$$;

comment on function public.handle_new_user() is
  'Hardened in migration 041: only swallows unique_violation. Other errors propagate, rolling back auth.users INSERT to prevent zombie users. See cron/anomaly-watch ZOMBIE_AUTH_USER for monitoring.';
