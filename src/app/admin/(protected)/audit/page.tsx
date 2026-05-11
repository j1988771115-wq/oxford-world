import { createClient } from "@supabase/supabase-js";
import { requireSuperAdminOrAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

interface Props {
  searchParams: Promise<{ actor?: string; action?: string; days?: string }>;
}

export default async function AdminAuditPage({ searchParams }: Props) {
  await requireSuperAdminOrAdmin(); // instructor 不能看
  const sp = await searchParams;
  const supabase = getAdminClient();
  const filterActor = (sp.actor ?? "").trim();
  const filterAction = (sp.action ?? "").trim();
  const days = parseInt(sp.days ?? "7", 10);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let q = supabase
    .from("admin_audit_logs")
    .select("id, actor_email, actor_role, action, target_type, target_id, metadata, ip, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterActor) q = q.ilike("actor_email", `%${filterActor}%`);
  if (filterAction) q = q.eq("action", filterAction);

  const { data: logs } = await q;

  // 統計 action distribution
  const { data: stats } = await supabase
    .from("admin_audit_logs")
    .select("action")
    .gte("created_at", since);
  const actionCount = (stats ?? []).reduce<Record<string, number>>((m, r) => {
    m[r.action] = (m[r.action] ?? 0) + 1;
    return m;
  }, {});
  const topActions = Object.entries(actionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">Audit Log</h2>
        <p className="text-xs text-gray-500">過去 {days} 天 · {logs?.length ?? 0} 筆</p>
      </div>

      {/* Filter form */}
      <form className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-end" method="GET">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Actor email</label>
          <input
            name="actor"
            defaultValue={filterActor}
            placeholder="例: yupupin@gmail.com"
            className="bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded text-sm w-56"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Action</label>
          <select
            name="action"
            defaultValue={filterAction}
            className="bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded text-sm w-56"
          >
            <option value="">全部</option>
            {Object.keys(actionCount)
              .sort()
              .map((a) => (
                <option key={a} value={a}>
                  {a} ({actionCount[a]})
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">天數</label>
          <select
            name="days"
            defaultValue={String(days)}
            className="bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded text-sm w-24"
          >
            {[1, 3, 7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d}d
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-5 py-2 rounded font-bold"
        >
          套用
        </button>
        {(filterActor || filterAction || days !== 7) && (
          <a href="/admin/audit" className="text-gray-400 text-sm px-3 py-2 hover:text-white">
            清空
          </a>
        )}
      </form>

      {/* Top actions */}
      {topActions.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-bold mb-3 text-gray-300">Top 10 actions ({days}d)</h3>
          <div className="flex flex-wrap gap-2">
            {topActions.map(([action, count]) => (
              <span
                key={action}
                className="text-xs bg-gray-800 border border-gray-700 px-3 py-1.5 rounded"
              >
                <span className="text-blue-300">{action}</span>
                <span className="text-gray-500 ml-2">{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Logs table */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-800">
                <th className="pb-2 pr-3">時間</th>
                <th className="pb-2 pr-3">Actor</th>
                <th className="pb-2 pr-3">Role</th>
                <th className="pb-2 pr-3">Action</th>
                <th className="pb-2 pr-3">Target</th>
                <th className="pb-2">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(logs ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString("zh-TW", {
                      timeZone: "Asia/Taipei",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 pr-3 font-mono text-gray-300">
                    {row.actor_email}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        row.actor_role === "superadmin"
                          ? "text-amber-300"
                          : row.actor_role === "instructor"
                            ? "text-emerald-300"
                            : "text-gray-400"
                      }
                    >
                      {row.actor_role || "?"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-blue-300">
                    {row.action}
                  </td>
                  <td className="py-2 pr-3 text-gray-400">
                    {row.target_type ? `${row.target_type}:${(row.target_id || "").slice(0, 12)}` : "-"}
                  </td>
                  <td className="py-2 text-gray-500 font-mono text-[10px] max-w-md">
                    <pre className="whitespace-pre-wrap break-all">
                      {JSON.stringify(row.metadata, null, 0).slice(0, 200)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!logs || logs.length === 0) && (
          <p className="text-center text-gray-500 text-sm py-8">
            符合條件的紀錄為空
          </p>
        )}
      </section>
    </div>
  );
}
