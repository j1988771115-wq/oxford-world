-- 修 023 line 10 drop policy name 寫錯:
-- 原本 drop 的是 "Course content public read",但 001 line 149 真實 policy 名是
-- "Course content is readable"。drop if exists 不會拋錯但根本沒 drop 到。
--
-- prod 端目前只有「Course content paid only」一條(已驗,可能某時手動清過),
-- 但 staging / supabase db reset 跑全部 migration 會留下兩條 policy(舊的
-- using true + 新的 using course_access),RLS 取 OR 等於完全不鎖,付費 RAG
-- 內容公開。
--
-- 此 migration 補 drop 真實名稱,讓 staging reset 也安全。

drop policy if exists "Course content is readable" on public.course_content;

-- 順便 belt-and-suspenders:再 drop 一次新 policy 然後重建,確保只有一條 paid only
drop policy if exists "Course content paid only" on public.course_content;

create policy "Course content paid only"
  on public.course_content for select
  using (
    course_id in (
      select course_id from public.course_access
      where user_id in (select id from public.profiles where auth_id = auth.uid())
    )
  );

-- 確認 anon role 不能 select(course_content 沒應該對 anon 開放)
revoke select on public.course_content from anon;

comment on policy "Course content paid only" on public.course_content is
  'Only users with active course_access entry can read course_content. Replaces the leaky 001 policy "Course content is readable" that 023 failed to drop due to wrong policy name.';
