import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const MERCHANT_ORDER = 'OVMOO734A7NDHM';
const TRADE_NO = '26050218264583513';
const PAID_AT = '2026-05-02T10:27:44+00:00'; // 18:27:44 +08

const { data: order, error: e0 } = await sb
  .from('orders')
  .select('*')
  .eq('merchant_order_no', MERCHANT_ORDER)
  .single();
if (e0) throw e0;
console.log('Before:', { status: order.status, trade_no: order.newebpay_trade_no, paid_at: order.paid_at, amount: order.amount });

if (order.amount !== 24900) {
  throw new Error(`Amount mismatch ${order.amount} vs expected 24900 — abort`);
}

const { data: updated, error: e1 } = await sb
  .from('orders')
  .update({ status: 'paid', newebpay_trade_no: TRADE_NO, paid_at: PAID_AT })
  .eq('merchant_order_no', MERCHANT_ORDER)
  .eq('status', 'pending')
  .select()
  .single();
if (e1) throw e1;
console.log('After:', { status: updated.status, trade_no: updated.newebpay_trade_no, paid_at: updated.paid_at });

const { data: granted, error: e2 } = await sb
  .from('course_access')
  .upsert(
    { user_id: order.user_id, course_id: order.course_id, access_type: 'purchased' },
    { onConflict: 'user_id,course_id,access_type' }
  )
  .select()
  .single();
if (e2) throw e2;
console.log('course_access:', granted);

const { data: course } = await sb
  .from('courses')
  .select('pro_bundle_days, title, slug')
  .eq('id', order.course_id)
  .single();
console.log('course:', course);

if (course?.pro_bundle_days && course.pro_bundle_days > 0) {
  const { data: profile } = await sb
    .from('profiles')
    .select('pro_expires_at, discord_id, email, display_name')
    .eq('id', order.user_id)
    .single();
  const now = new Date();
  const currentExpiry = profile?.pro_expires_at ? new Date(profile.pro_expires_at) : now;
  const baseDate = currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(baseDate.getTime() + course.pro_bundle_days * 86400000);
  const { error: tierError } = await sb
    .from('profiles')
    .update({ tier: 'pro', pro_expires_at: newExpiry.toISOString() })
    .eq('id', order.user_id);
  if (tierError) throw tierError;
  console.log(`Pro bundle granted: +${course.pro_bundle_days} days, expires ${newExpiry.toISOString()}`);
}

const { data: verifyOrder } = await sb.from('orders').select('*').eq('merchant_order_no', MERCHANT_ORDER).single();
const { data: verifyAccess } = await sb.from('course_access').select('*').eq('user_id', order.user_id).eq('course_id', order.course_id);
const { data: verifyProfile } = await sb.from('profiles').select('email, display_name, tier, pro_expires_at').eq('id', order.user_id).single();

console.log('\n=== VERIFY ===');
console.log('order.status =', verifyOrder.status, ' paid_at =', verifyOrder.paid_at);
console.log('course_access:', verifyAccess);
console.log('profile:', verifyProfile);
