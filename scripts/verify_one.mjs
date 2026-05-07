import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const m = process.argv[2];
const { data: o } = await sb.from('orders').select('*, profiles(email, display_name, tier, pro_expires_at)').eq('merchant_order_no', m).single();
console.log('order:', JSON.stringify(o, null, 2));
const { data: a } = await sb.from('course_access').select('*').eq('user_id', o.user_id).eq('course_id', o.course_id);
console.log('access:', a);
