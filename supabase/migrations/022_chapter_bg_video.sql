-- 章節「背景資料學習」影片(NotebookLM) — 章節有兩段:正片(主)+ 背景(輔)
-- 2026-05-01

alter table public.course_chapters
  add column if not exists mux_playback_id_bg text,
  add column if not exists duration_seconds_bg integer;

comment on column public.course_chapters.mux_playback_id_bg is
  'NotebookLM 背景資料學習影片 Mux playback id,正片之外的延伸聆聽材料';
comment on column public.course_chapters.duration_seconds_bg is
  '背景影片秒數';
