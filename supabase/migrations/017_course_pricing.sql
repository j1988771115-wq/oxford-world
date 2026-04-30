-- 課程定價更新（2026-04-30）
-- 1. courses 加 original_price 欄位（顯示原價，劃掉用）
-- 2. master-space-age-capital：售價 28000 → 24900，原價 36000

alter table public.courses
  add column if not exists original_price integer;

update public.courses
set price = 24900,
    original_price = 36000
where slug = 'master-space-age-capital';
