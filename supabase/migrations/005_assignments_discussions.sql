-- Assignments: each course chapter can have an assignment
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  chapter_id uuid references public.course_chapters(id) on delete set null,
  title text not null,
  description text not null,
  xp_reward integer not null default 30,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Assignment submissions
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  link_url text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'approved')),
  feedback text,
  created_at timestamptz not null default now(),
  unique(assignment_id, user_id)
);

-- Discussion threads
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  reply_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Discussion replies
create table if not exists public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_assignments_course on public.assignments(course_id, sort_order);
create index idx_submissions_user on public.submissions(user_id);
create index idx_submissions_assignment on public.submissions(assignment_id);
create index idx_discussions_course on public.discussions(course_id, created_at desc);
create index idx_discussion_replies on public.discussion_replies(discussion_id, created_at);

-- RLS
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.discussions enable row level security;
alter table public.discussion_replies enable row level security;

-- Assignments: public read
create policy "Assignments are viewable by everyone"
  on public.assignments for select using (true);

-- Submissions: users can CRUD their own
create policy "Users can view own submissions"
  on public.submissions for select
  using (user_id in (select id from public.profiles where auth_id = auth.uid()));

create policy "Users can create submissions"
  on public.submissions for insert
  with check (user_id in (select id from public.profiles where auth_id = auth.uid()));

create policy "Users can update own submissions"
  on public.submissions for update
  using (user_id in (select id from public.profiles where auth_id = auth.uid()));

-- Discussions: everyone can read, authenticated can create
create policy "Discussions are viewable by everyone"
  on public.discussions for select using (true);

create policy "Users can create discussions"
  on public.discussions for insert
  with check (user_id in (select id from public.profiles where auth_id = auth.uid()));

create policy "Users can update own discussions"
  on public.discussions for update
  using (user_id in (select id from public.profiles where auth_id = auth.uid()));

-- Replies: everyone can read, authenticated can create
create policy "Replies are viewable by everyone"
  on public.discussion_replies for select using (true);

create policy "Users can create replies"
  on public.discussion_replies for insert
  with check (user_id in (select id from public.profiles where auth_id = auth.uid()));
