import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: order, error: e1 } = await sb
  .from('orders')
  .select('*')
  .eq('merchant_order_no', 'OVMOO734A7NDHM')
  .single();

console.log('=== ORDER ===');
console.log(JSON.stringify(order, null, 2));
if (e1) console.error('order error:', e1);

if (order) {
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', order.user_id)
    .single();
  console.log('=== PROFILE ===');
  console.log(JSON.stringify(profile, null, 2));

  const { data: authUser } = await sb.auth.admin.getUserById(order.user_id);
  console.log('=== AUTH USER (email/created) ===');
  console.log(JSON.stringify({
    id: authUser?.user?.id,
    email: authUser?.user?.email,
    created_at: authUser?.user?.created_at,
    confirmed: authUser?.user?.email_confirmed_at,
  }, null, 2));

  const { data: enrollments } = await sb
    .from('user_courses')
    .select('*')
    .eq('user_id', order.user_id);
  console.log('=== USER_COURSES ===');
  console.log(JSON.stringify(enrollments, null, 2));

  if (order.course_id) {
    const { data: course } = await sb
      .from('courses')
      .select('id, slug, title, price')
      .eq('id', order.course_id)
      .single();
    console.log('=== COURSE ===');
    console.log(JSON.stringify(course, null, 2));
  }
}
