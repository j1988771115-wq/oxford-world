import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const userId = 'b522f0f3-f638-4606-9358-5e78e039f3e4';
const { data } = await sb.from('course_progress').select('chapter_id, last_position_seconds, completed, updated_at').eq('user_id', userId);
console.log('H howard progress rows:', data?.length || 0);
data?.forEach(r => console.log(' -', r.chapter_id, r.last_position_seconds + 's', r.completed ? 'COMPLETED' : '', r.updated_at));
