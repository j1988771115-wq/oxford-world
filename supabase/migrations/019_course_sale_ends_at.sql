-- 課程特價期間（2026-04-30）
-- master-space-age-capital：上線兩週特價，到 5/14 23:59 結束

alter table public.courses
  add column if not exists sale_ends_at timestamptz;

comment on column public.courses.sale_ends_at is
  '特價結束時間（null = 永久價）。前端顯示倒數，過期後 admin 手動 update price';

update public.courses
set sale_ends_at = '2026-05-14T23:59:59+08:00'
where slug = 'master-space-age-capital';
