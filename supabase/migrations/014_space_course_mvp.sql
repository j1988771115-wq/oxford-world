-- 太空課 MVP 上線（2026-04-28）
-- 1. 加 youtube_url 欄位（YouTube unlisted embed）
-- 2. 售價 5990 → 28000
-- 3. 砍掉第 9、10 章，變成 1 免費 + 8 付費 共 9 章

alter table public.course_chapters
  add column if not exists youtube_url text;

update public.courses
  set price = 28000
  where slug = 'master-space-age-capital';

delete from public.course_chapters
  where course_id in (select id from public.courses where slug = 'master-space-age-capital')
    and sort_order in (9, 10);
