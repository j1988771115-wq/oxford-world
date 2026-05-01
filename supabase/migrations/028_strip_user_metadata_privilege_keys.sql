-- 防禦性 trigger:即使未來有 dev 誤寫信任 user_metadata.is_admin / role 的 code,
-- 也擋不到實際提權。
-- 來源:2026-05-02 danny 碼農朋友提報的 PUT /auth/v1/user with is_admin: true 示範。
-- 該 endpoint Supabase 設計允許任何登入者改自己 user_metadata,我們得在 DB 端剝除敏感欄位。

create or replace function public.strip_privilege_metadata()
returns trigger
language plpgsql
security definer
as $$
begin
  -- 從 raw_user_meta_data 砍掉所有提權相關 key
  if new.raw_user_meta_data is not null then
    new.raw_user_meta_data := new.raw_user_meta_data
      - 'is_admin'
      - 'isAdmin'
      - 'admin'
      - 'role'
      - 'roles'
      - 'permissions'
      - 'tier'
      - 'is_alumni';
  end if;
  -- 從 raw_app_meta_data 也砍(這個 client 改不到,但保險起見)
  if new.raw_app_meta_data is not null then
    new.raw_app_meta_data := new.raw_app_meta_data
      - 'is_admin'
      - 'isAdmin'
      - 'admin'
      - 'tier'
      - 'is_alumni';
  end if;
  return new;
end;
$$;

drop trigger if exists strip_privilege_metadata_trigger on auth.users;
create trigger strip_privilege_metadata_trigger
  before insert or update on auth.users
  for each row execute function public.strip_privilege_metadata();
