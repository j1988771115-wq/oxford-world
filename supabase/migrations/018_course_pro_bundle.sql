-- 課程附贈 Pro 天數機制（2026-04-30）
-- master-space-age-capital：購買送 90 天 Pro
-- 之後其他課程要 bundle 不同天數獨立設

alter table public.courses
  add column if not exists pro_bundle_days integer;

comment on column public.courses.pro_bundle_days is
  '購買此課程附贈 Pro 訂閱天數（null = 不附贈）';

update public.courses
set pro_bundle_days = 90
where slug = 'master-space-age-capital';
