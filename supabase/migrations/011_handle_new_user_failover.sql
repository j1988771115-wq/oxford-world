-- Harden handle_new_user trigger: don't throw on conflict, log failures instead
-- Prevents殭屍 auth user (auth.users row exists but profiles row missing) when
-- email collision or any other error aborts the insert.

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
  when others then
    -- Never block auth.users insert; log and swallow so user can still sign in
    raise warning 'handle_new_user failed for auth_id=%, email=%, sqlstate=%, message=%',
      new.id, new.email, sqlstate, sqlerrm;
    return new;
end;
$$;
