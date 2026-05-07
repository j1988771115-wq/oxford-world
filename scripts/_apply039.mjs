import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = `
alter table public.courses
  add column if not exists access_type text not null default 'purchase';

do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'courses' and constraint_name = 'courses_access_type_check'
  ) then
    alter table public.courses add constraint courses_access_type_check
      check (access_type in ('purchase', 'pro'));
  end if;
end $$;

comment on column public.courses.access_type is
  'purchase = 一次性買斷 (course_access table); pro = Pro 訂閱者解鎖 (profile.tier + pro_expires_at)';
`;
const { data, error } = await sb.rpc('exec_sql', { sql }).catch(e => ({ error: e }));
console.log('rpc result:', { data, err: error?.message });
// fallback:用 direct REST
if (error) {
  console.log('\n=== 沒 exec_sql RPC,改用 supabase CLI 或 dashboard SQL editor ===');
  console.log('migration file:', 'supabase/migrations/039_courses_pro_access_type.sql');
}
// 驗證 column 存在
const { data: c } = await sb.from('courses').select('id, slug, access_type').limit(5);
console.log('\n=== verify courses.access_type ===');
console.log(c);
