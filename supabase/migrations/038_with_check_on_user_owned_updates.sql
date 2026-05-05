-- T1-16: discussions / submissions / discussion_replies 的 UPDATE policy
-- 之前只有 USING 沒有 WITH CHECK,user 可以把自己的 row 的 user_id 改成別人
-- (USING 只擋讀,WITH CHECK 才擋寫入後的 row state)
-- 補 WITH CHECK 後就無法把 user_id 改成別人。

-- discussions
drop policy if exists "Users update own discussions" on public.discussions;
drop policy if exists "Users can update own discussions" on public.discussions;

create policy "Users update own discussions"
  on public.discussions for update
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  )
  with check (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- submissions
drop policy if exists "Users can update own submissions" on public.submissions;

create policy "Users can update own submissions"
  on public.submissions for update
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  )
  with check (
    user_id in (
      select id from public.profiles where auth_id = auth.uid()
    )
  );

-- discussion_replies
drop policy if exists "Users update own replies" on public.discussion_replies;

create policy "Users update own replies"
  on public.discussion_replies for update
  using (
    user_id in (
      select id from public.profiles where auth_id = auth.uid())
  )
  with check (
    user_id in (
      select id from public.profiles where auth_id = auth.uid())
  );
