-- Add tag to discussions
alter table public.discussions add column if not exists tag text default 'general'
  check (tag in ('general', 'course-help', 'sharing', 'tools', 'off-topic'));
