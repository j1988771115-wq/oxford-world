-- 040: 砍掉 match_course_content 4-arg 重複 overload
--
-- 001 / full_setup.sql 建了 4-arg 版,016 升級成 5-arg(filter_chapter_id default null) 但沒砍舊版。
-- 結果同一個函式名同時有 4-arg + 5-arg 兩個 overload。
-- PostgREST 用 keyword args,當 caller 帶 4 個 named args 時 → ambiguous error → silent null。
--
-- 症狀:chat route(只帶 4 args)的 RAG retrieval 永遠 fail,
--      Eyesy 一直回「課程教材中並沒有涵蓋此內容」。
-- code 端臨時 workaround:每次 call 都帶 filter_chapter_id: null。
-- 真正修法:這支 migration 砍掉舊版,只留 5-arg with defaults。
--
-- 5-arg 版本 filter_course_id 跟 filter_chapter_id 都 default null,
-- 跟舊版 4-arg 行為等價(沒帶 chapter filter 等於不過濾 chapter),沒有破壞性。

drop function if exists public.match_course_content(
  query_embedding vector,
  match_threshold double precision,
  match_count integer,
  filter_course_id uuid
);

-- 5-arg 版本仍在(016 created),不重建,避免覆寫到非預期狀態。
-- 確認方式 (跑完應該只剩 1 行):
-- select pg_get_functiondef(p.oid) from pg_proc p where p.proname = 'match_course_content';
