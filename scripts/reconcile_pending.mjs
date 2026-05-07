import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const { data: pending, error } = await sb
  .from('orders')
  .select('merchant_order_no, amount, order_type, course_id, user_id, created_at, profiles(email, display_name)')
  .eq('status', 'pending')
  .gte('created_at', since)
  .order('created_at', { ascending: false });
if (error) throw error;

console.log(`=== Pending orders (last 24h): ${pending?.length || 0} ===`);
for (const o of pending || []) {
  const profile = o.profiles;
  console.log(`\n${o.merchant_order_no}`);
  console.log(`  ${profile?.display_name || '?'} <${profile?.email || '?'}>`);
  console.log(`  amount=NT$${o.amount} type=${o.order_type} course_id=${o.course_id}`);
  console.log(`  created=${o.created_at}`);
}
