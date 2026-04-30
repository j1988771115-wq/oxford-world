-- 1. 重新命名 master-space-age-capital 課程的章節（抽象化、不出現 ticker）
-- 對應 8 部 long 影片：RKLB / IRDM / ASTS / FLY / GSAT / PL / RDW / LUNR
-- 每章 1 部影片，第 1 章是先導、第 10 章是總結（待錄）

update public.course_chapters
set title = '太空帝國的誕生：垂直整合如何吃掉整條產業鏈'
where sort_order = 2
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

update public.course_chapters
set title = '美國國防的重要依賴者：軍事與航海的命脈'
where sort_order = 3
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

update public.course_chapters
set title = '下一代行動通訊基礎設施：直連手機的衛星挑戰者'
where sort_order = 4
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

update public.course_chapters
set title = '太空商業化的中型執行者：機動性發射的破局者'
where sort_order = 5
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

update public.course_chapters
set title = '巨頭夾縫中的精準切入：另闢戰場的差異化倖存'
where sort_order = 6
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

update public.course_chapters
set title = '太空數據經濟的開拓者：每天為地球拍照的觀察家'
where sort_order = 7
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

update public.course_chapters
set title = '太空基建的賣鏟人：在軌服務與太空製造'
where sort_order = 8
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

update public.course_chapters
set title = '政府訂單驅動的新疆界：月球商業化的領航員'
where sort_order = 9
  and course_id = (select id from public.courses where slug = 'master-space-age-capital');

-- 第 1 章「先導：為什麼太空是下一個科技週期」與第 10 章「組合的藝術」保留現有 title

-- 2. RAG 課程內容加上章節關聯（讓「給我第3章內容」這種查詢成為可能）
alter table public.course_content
  add column if not exists chapter_id uuid references public.course_chapters(id) on delete cascade;

create index if not exists idx_course_content_chapter
  on public.course_content(chapter_id);

-- 3. 升級 match_course_content RPC 支援 filter_chapter_id（向後相容，舊呼叫不受影響）
create or replace function public.match_course_content(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_course_id uuid default null,
  filter_chapter_id uuid default null
)
returns table (
  id uuid,
  course_id uuid,
  chapter_id uuid,
  content text,
  content_type text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    cc.id,
    cc.course_id,
    cc.chapter_id,
    cc.content,
    cc.content_type,
    1 - (cc.embedding <=> query_embedding) as similarity
  from public.course_content cc
  where
    (filter_course_id is null or cc.course_id = filter_course_id)
    and (filter_chapter_id is null or cc.chapter_id = filter_chapter_id)
    and 1 - (cc.embedding <=> query_embedding) > match_threshold
  order by cc.embedding <=> query_embedding
  limit match_count;
end;
$$;
