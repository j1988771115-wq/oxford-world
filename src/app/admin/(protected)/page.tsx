import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getAdminCourses } from "@/lib/actions/admin";
import { getAdminActor } from "@/lib/admin-auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export const dynamic = "force-dynamic";

interface DashboardStats {
  today_count: number;
  today_amount: number;
  month_count: number;
  month_amount: number;
  total_count: number;
  total_amount: number;
  week_count: number;
  week_amount: number;
}

async function getStats(allowedCourseIds: string[] | null): Promise<DashboardStats> {
  const supabase = getAdminClient();
  const now = new Date();
  const taipei = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStart = new Date(taipei.toISOString().slice(0, 10) + "T00:00:00+08:00");
  const monthStart = new Date(taipei.getUTCFullYear(), taipei.getUTCMonth(), 1);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (allowedCourseIds && allowedCourseIds.length === 0) {
    return {
      today_count: 0, today_amount: 0,
      month_count: 0, month_amount: 0,
      total_count: 0, total_amount: 0,
      week_count: 0, week_amount: 0,
    };
  }

  let q = supabase.from("orders").select("amount, paid_at").eq("status", "paid");
  if (allowedCourseIds && allowedCourseIds.length > 0) {
    q = q.in("course_id", allowedCourseIds);
  }
  const { data: orders } = await q;
  const list = (orders ?? []).filter((o) => o.paid_at);

  const inRange = (paid: string, since: Date) => new Date(paid) >= since;
  const sumOf = (arr: { amount: number; paid_at: string | null }[]) => ({
    count: arr.length,
    amount: arr.reduce((s, o) => s + (o.amount ?? 0), 0),
  });

  const todayList = list.filter((o) => inRange(o.paid_at!, todayStart));
  const monthList = list.filter((o) => inRange(o.paid_at!, monthStart));
  const weekList = list.filter((o) => inRange(o.paid_at!, weekAgo));

  return {
    today_count: sumOf(todayList).count,
    today_amount: sumOf(todayList).amount,
    month_count: sumOf(monthList).count,
    month_amount: sumOf(monthList).amount,
    week_count: sumOf(weekList).count,
    week_amount: sumOf(weekList).amount,
    total_count: list.length,
    total_amount: list.reduce((s, o) => s + (o.amount ?? 0), 0),
  };
}

export default async function AdminPage() {
  const actor = await getAdminActor();
  const courses = await getAdminCourses();
  const supabase = getAdminClient();

  let allowedCourseIds: string[] | null = null;
  if (actor?.role === "instructor") {
    const { data: perms } = await supabase
      .from("course_permissions")
      .select("course_id")
      .eq("user_id", actor.profileId);
    allowedCourseIds = (perms ?? []).map((p) => p.course_id);
  }

  const stats = await getStats(allowedCourseIds);

  let recentQuery = supabase
    .from("orders")
    .select("id, merchant_order_no, amount, paid_at, courses(title)")
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(10);
  if (allowedCourseIds && allowedCourseIds.length > 0) {
    recentQuery = recentQuery.in("course_id", allowedCourseIds);
  }
  const { data: recent } = await recentQuery;

  const isInstructor = actor?.role === "instructor";

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">總覽</h2>
        <div className="text-xs text-gray-500">
          {actor?.role || "?"} · {actor?.email || "legacy admin"}
          {isInstructor && allowedCourseIds && (
            <span className="ml-2 text-amber-400">
              · 限 {allowedCourseIds.length} 門課
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="今日營收" count={stats.today_count} amount={stats.today_amount} />
        <MetricCard label="本月營收" count={stats.month_count} amount={stats.month_amount} />
        <MetricCard label="7 日營收" count={stats.week_count} amount={stats.week_amount} />
        <MetricCard label="累計" count={stats.total_count} amount={stats.total_amount} highlight />
      </div>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-3">最近 10 筆 paid 訂單</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-800">
                <th className="pb-2">時間</th>
                <th className="pb-2">課程</th>
                <th className="pb-2 text-right">金額</th>
                <th className="pb-2">訂單號</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recent?.map((o) => {
                const c = o.courses as { title?: string } | null;
                return (
                  <tr key={(o as { id: string }).id}>
                    <td className="py-2 text-gray-400 text-xs">
                      {o.paid_at &&
                        new Date(o.paid_at).toLocaleString("zh-TW", {
                          timeZone: "Asia/Taipei",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </td>
                    <td className="py-2 text-xs">{c?.title?.slice(0, 16) || "?"}</td>
                    <td className="py-2 text-right">NT${o.amount.toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs">{o.merchant_order_no}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <Link href="/admin/orders" className="text-blue-400 hover:underline">
            → 完整訂單列表 (含 email reveal)
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-500 text-sm mb-1">{isInstructor ? "我的課程" : "課程數"}</p>
          <p className="text-3xl font-bold">
            {isInstructor && allowedCourseIds ? allowedCourseIds.length : courses.length}
          </p>
        </div>
        <Link
          href="/admin/courses"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-600/50 transition-colors"
        >
          <p className="text-gray-500 text-sm mb-1">快捷操作</p>
          <p className="text-lg font-bold text-blue-400">管理課程 →</p>
        </Link>
        <Link
          href="/admin/email"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-600/50 transition-colors"
        >
          <p className="text-gray-500 text-sm mb-1">寄送 Email</p>
          <p className="text-lg font-bold text-blue-400">行銷信件 →</p>
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  count,
  amount,
  highlight = false,
}: {
  label: string;
  count: number;
  amount: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        highlight
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-gray-900 border-gray-800"
      }`}
    >
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p
        className={`text-2xl font-bold ${
          highlight ? "text-amber-300" : "text-white"
        }`}
      >
        NT${amount.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500 mt-1">{count} 筆</p>
    </div>
  );
}
