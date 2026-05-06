-- 039: courses 加 access_type — Pro 訂閱限定影片功能
--
-- 之前模型:所有 course 都靠 course_access 表(購買者才有 row)
-- 現在加一條:課程可以是 'pro' 限定 — 不靠 course_access,靠 profile.tier='pro'
-- + pro_expires_at 還沒過期。
--
-- access_type 'purchase' (default) — 靠 course_access 買斷,跟現有大師課行為一致
-- access_type 'pro'                — 看 profile.tier + pro_expires_at,等於有 active Pro 訂閱
--
-- 大師課（master-space-age-capital）保留 'purchase'。
-- 之後新建 Pro-only 影片課程時手動 set 'pro'。

alter table public.courses
  add column if not exists access_type text not null default 'purchase'
    check (access_type in ('purchase', 'pro'));

comment on column public.courses.access_type is
  'purchase = 一次性買斷 (course_access table); pro = Pro 訂閱者解鎖 (profile.tier + pro_expires_at)';

-- 既有 3 筆 course 全部維持 purchase,沒有資料變化
