-- Add avatar URL to profiles
alter table public.profiles add column if not exists avatar_url text;

-- Create avatars storage bucket (run in Supabase Dashboard > Storage)
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
