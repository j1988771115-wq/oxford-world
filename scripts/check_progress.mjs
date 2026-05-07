import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const userId = 'b522f0f3-f638-4606-9358-5e78e039f3e4'; // H howard
const courseId = '3ae3f802-1828-425d-919f-4563331e0bec';

// 看 H howard 有沒有任何 progress
const { data, error } = await sb.from('course_progress').select('*').eq('user_id', userId).limit(5);
console.log('course_progress for H howard:', { rows: data?.length, err: error?.message, sample: data?.[0] });

// 試 service-role insert/upsert 看 schema 對不對
const { data: chap } = await sb.from('course_chapters').select('id, course_id, duration_seconds').eq('course_id', courseId).limit(1).single();
console.log('test chapter:', chap);

if (chap) {
  const { error: upErr } = await sb.from('course_progress').upsert({
    user_id: userId,
    course_id: chap.course_id,
    chapter_id: chap.id,
    last_position_seconds: 1,
    duration_seconds: chap.duration_seconds || 60,
    completed: false,
    completed_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,chapter_id' });
  console.log('service-role upsert:', upErr?.message || 'OK');
}

// 看 RLS policies
const { data: pols } = await sb.rpc('exec_sql', { sql: "select polname, polcmd, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as wc from pg_policy where polrelid = 'public.course_progress'::regclass" }).catch(e => ({ data: 'rpc unavailable: '+ e.message }));
console.log('policies:', pols);
