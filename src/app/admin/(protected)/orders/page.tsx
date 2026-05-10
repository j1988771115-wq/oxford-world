import { createClient } from "@supabase/supabase-js";
import { adminFulfillOrder, adminBulkReconcileNewebPay, adminTestNewebPayRoundtrip } from "@/lib/actions/admin-fulfill";
import { getAdminActor } from "@/lib/admin-auth";
import { MaskedEmail } from "@/components/admin/masked-email";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return "-";
  const m = email.match(/^(.{1,3})([^@]*)@(.+)$/);
  return m ? `${m[1]}***@${m[3]}` : "***";
}

interface SearchParams {
  searchParams: Promise<{ result?: string; error?: string; q?: string }>;
}

async function runFulfill(formData: FormData) {
  "use server";
  await adminFulfillOrder(formData);
}

async function runBulkReconcile() {
  "use server";
  const r = await adminBulkReconcileNewebPay();
  console.log("[admin-bulk-reconcile]", JSON.stringify(r, null, 2));
}

async function runRoundtripTest() {
  "use server";
  const r = await adminTestNewebPayRoundtrip();
  console.log("[admin-roundtrip-test]", JSON.stringify(r, null, 2));
  // 結果在 Vercel log 看,result 物件裡會有完整資訊
}

export default async function AdminOrdersPage({ searchParams }: SearchParams) {
  const sp = await searchParams;
  const actor = await getAdminActor();
  // P0c: superadmin 看完整 email,其他 role (instructor / admin) 走 mask + reveal
  const showFullEmail = actor?.role === "superadmin";
  const supabase = getAdminClient();
  const q = (sp.q ?? "").trim();

  // search filter (merchant_order_no OR profiles.email/display_name OR courses.title)
  // service role bypass RLS,直接 ilike OR
  const buildQuery = (status: "pending" | "paid") => {
    let qb = supabase
      .from("orders")
      .select(
        status === "pending"
          ? "id, merchant_order_no, amount, order_type, course_id, status, created_at, profiles(email, display_name), courses(title)"
          : "id, merchant_order_no, amount, paid_at, order_type, profiles(email, display_name), courses(title)"
      )
      .eq("status", status);
    if (q) {
      qb = qb.or(`merchant_order_no.ilike.%${q}%`);
    }
    return qb;
  };

  const { data: pending } = await buildQuery("pending")
    .order("created_at", { ascending: false })
    .limit(q ? 200 : 50);

  const { data: paid } = await buildQuery("paid")
    .order("paid_at", { ascending: false })
    .limit(q ? 200 : 20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">訂單與補單工具</h1>
        <p className="text-gray-400 text-sm">
          金流出狀況時用這裡 — 可手動補單或全自動對帳藍新查所有 pending 是否其實已付款
        </p>
      </div>

      {/* Search box */}
      <form className="flex gap-2 items-end" method="GET">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">搜尋訂單號</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="OVMOM... 或部分訂單號"
            className="w-full bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded font-mono text-sm focus:ring-2 ring-blue-600/50 focus:outline-none"
          />
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-5 py-2 rounded font-bold">
          搜尋
        </button>
        {q && (
          <a href="/admin/orders" className="text-gray-400 text-sm px-3 py-2 hover:text-white">
            清空
          </a>
        )}
      </form>

      {q && (
        <div className="text-xs text-amber-400">
          搜尋中: <span className="font-mono">{q}</span> · pending {pending?.length ?? 0} / paid {paid?.length ?? 0}
        </div>
      )}

      {sp.result && (
        <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-200 px-4 py-3 rounded text-sm">
          ✅ {sp.result}
        </div>
      )}
      {sp.error && (
        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded text-sm">
          ❌ {sp.error}
        </div>
      )}

      {/* 全自動對帳 */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-2">🔁 全自動對帳藍新</h2>
        <p className="text-gray-400 text-sm mb-4">
          抓最近 200 筆 pending 訂單,逐筆問藍新 QueryTradeInfo,SUCCESS 的自動 mark paid + grant access + 推抖內 alert + 寄信。可重複跑,idempotent。
        </p>
        <form action={runBulkReconcile}>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm"
          >
            開始對帳（log 在 Vercel）
          </button>
        </form>
      </section>

      {/* 自我測試 KEY/IV roundtrip */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-2">🧪 webhook KEY/IV 自我測試</h2>
        <p className="text-gray-400 text-sm mb-4">
          用我們手上的 NEWEBPAY_HASH_KEY/IV 加密一段假 payload,再解密回來。
          通過 = KEY/IV 自身沒問題,藍新→我們的 decrypt 失敗就是後台 KEY 跟我們不一樣。
          沒通過 = KEY/IV 有 \n/空白等格式問題,要修 env。
          結果在 Vercel logs 看(查 [admin-roundtrip-test])。
        </p>
        <form action={runRoundtripTest}>
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm"
          >
            跑自我測試
          </button>
        </form>
      </section>

      {/* 單筆補單 */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-2">🔧 手動補單(單筆)</h2>
        <p className="text-gray-400 text-sm mb-4">
          知道訂單號就可以強制補單 — mark paid + grant access + 抖內 alert + 寄信
        </p>
        <form action={runFulfill} className="flex gap-2 flex-wrap items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">訂單編號</label>
            <input
              name="merchant_order_no"
              required
              placeholder="OVMOM..."
              className="bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded font-mono text-sm w-64"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">藍新交易編號(可空)</label>
            <input
              name="trade_no"
              placeholder="自動填 MANUAL_..."
              className="bg-gray-950 border border-gray-700 text-white px-3 py-2 rounded font-mono text-sm w-48"
            />
          </div>
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-lg text-sm"
          >
            補單
          </button>
        </form>
      </section>

      {/* Pending */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-3">
          📌 Pending 訂單（最近 50）共 {pending?.length || 0}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-800">
                <th className="pb-2">時間</th>
                <th className="pb-2">學員</th>
                <th className="pb-2">類型</th>
                <th className="pb-2 text-right">金額</th>
                <th className="pb-2">訂單號</th>
                <th className="pb-2">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pending?.map((o) => {
                const p = o.profiles as { email?: string; display_name?: string } | null;
                const c = o.courses as { title?: string } | null;
                return (
                  <tr key={o.merchant_order_no}>
                    <td className="py-2 text-gray-400 text-xs">
                      {new Date(o.created_at).toLocaleString("zh-TW", {
                        timeZone: "Asia/Taipei",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2">
                      <div>{p?.display_name || "-"}</div>
                      <div className="text-xs text-gray-500">
                        {showFullEmail ? (
                          p?.email
                        ) : (
                          <MaskedEmail
                            targetType="order"
                            targetId={(o as { id: string }).id}
                            initial={maskEmail(p?.email)}
                          />
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-xs">
                      {o.order_type === "course" ? c?.title?.slice(0, 12) || "course" : o.order_type}
                    </td>
                    <td className="py-2 text-right">NT${o.amount.toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs">{o.merchant_order_no}</td>
                    <td className="py-2">
                      <form action={runFulfill}>
                        <input type="hidden" name="merchant_order_no" value={o.merchant_order_no} />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded"
                        >
                          補單
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Paid */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-bold mb-3">✅ 最近 Paid 訂單</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-800">
              <th className="pb-2">時間</th>
              <th className="pb-2">學員</th>
              <th className="pb-2">類型</th>
              <th className="pb-2 text-right">金額</th>
              <th className="pb-2">訂單號</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {paid?.map((o) => {
              const p = o.profiles as { email?: string; display_name?: string } | null;
              const c = o.courses as { title?: string } | null;
              return (
                <tr key={o.merchant_order_no}>
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
                  <td className="py-2">
                    <div>{p?.display_name || "-"}</div>
                    <div className="text-xs text-gray-500">{p?.email}</div>
                  </td>
                  <td className="py-2 text-xs">
                    {o.order_type === "course" ? c?.title?.slice(0, 12) || "course" : o.order_type}
                  </td>
                  <td className="py-2 text-right">NT${o.amount.toLocaleString()}</td>
                  <td className="py-2 font-mono text-xs">{o.merchant_order_no}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
