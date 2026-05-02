// 一次性補開 4 筆已收訂單的電子發票
// bun run scripts/backfill_invoices.ts
import { issueInvoice } from "../src/lib/ezpay-invoice";
import { createClient } from "@supabase/supabase-js";

function env(k: string): string {
  const fs = require("fs");
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    if (line.startsWith(`${k}=`)) {
      return line.slice(k.length + 1).trim().replace(/^"|"$/g, "");
    }
  }
  throw new Error(`missing ${k}`);
}

(async () => {
  const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

  const { data: paid } = await supabase
    .from("orders")
    .select("merchant_order_no, amount, order_type, course_id, profiles(email,display_name)")
    .eq("status", "paid")
    .order("paid_at", { ascending: true });

  console.log(`找到 ${paid?.length || 0} 筆 paid 訂單`);

  for (const o of paid || []) {
    const p = (o.profiles as { email?: string; display_name?: string } | null) || {};

    // 已開過就跳過
    const { data: existing } = await supabase
      .from("invoices")
      .select("invoice_number")
      .eq("merchant_order_no", o.merchant_order_no)
      .maybeSingle();
    if (existing) {
      console.log(`  ⏭️ ${o.merchant_order_no} 已有發票 ${existing.invoice_number}`);
      continue;
    }

    if (!p.email) {
      console.log(`  ❌ ${o.merchant_order_no} 沒 email,跳過`);
      continue;
    }

    // 統一用通用品名「線上教學服務」(會計報稅最穩,不寫課名 / 期間)
    const itemTitle = "線上教學服務";

    console.log(`  → 開 ${o.merchant_order_no} ${p.email} NT$${o.amount}`);
    const inv = await issueInvoice({
      merchantOrderNo: o.merchant_order_no,
      category: "B2C",
      buyerName: p.display_name || "牛津視界學員",
      buyerEmail: p.email,
      itemName: itemTitle,
      itemCount: 1,
      itemPrice: Number(o.amount),
      comment: `補開 ${o.merchant_order_no}`,
    });

    if (inv.ok) {
      console.log(`     ✅ ${inv.invoiceNumber} (隨機碼 ${inv.randomNum})`);
      await supabase.from("invoices").upsert(
        {
          merchant_order_no: o.merchant_order_no,
          invoice_number: inv.invoiceNumber,
          invoice_trans_no: inv.invoiceTransNo,
          random_num: inv.randomNum,
          total_amt: Number(o.amount),
          buyer_email: p.email,
          ezpay_status: "SUCCESS",
          issued_at: inv.createTime,
          raw: inv.rawResult || {},
        },
        { onConflict: "invoice_number" }
      );
    } else {
      console.log(`     ❌ ${inv.rawStatus} ${inv.rawMessage}`);
    }
  }
  console.log("DONE");
})();
