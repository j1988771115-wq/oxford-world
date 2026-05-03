-- T0-12: profiles.auth_id 加 NOT NULL
--
-- 002_switch_to_supabase_auth.sql 加上 unique references...on delete cascade,但沒 NOT NULL。
-- 結果:
-- - unique 對 NULL 不生效 (PG SQL 標準),可重複插入 NULL row → 孤兒 profile
-- - handle_new_user trigger 的 on conflict (auth_id) do nothing 對 NULL 也不 conflict
-- - 任何寫 profile 不帶 auth_id 都會建孤兒 row
--
-- 已驗 prod 端目前 0 個 NULL row,可直接 alter add not null

alter table public.profiles
  alter column auth_id set not null;

-- 順便補一個 partial unique index(雖然 002 已加 unique,partial 對 NULL 區分但這裡 NOT NULL 後
-- NULL 不可能存在,unique constraint 已足夠)

comment on column public.profiles.auth_id is
  'Foreign key to auth.users.id. NOT NULL since migration 034 to prevent orphan profiles. Uniqueness enforced by 002 unique constraint.';