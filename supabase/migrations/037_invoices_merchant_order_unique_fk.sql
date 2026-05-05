-- T1-15: invoices.merchant_order_no 加 unique constraint + FK to orders
--
-- 之前:
-- - invoices 只 unique on invoice_number,沒擋同一訂單開兩張發票
-- - merchant_order_no 沒 FK,可寫不存在 order 的發票
-- - 並發 webhook 開兩張 = 稅務問題
--
-- 修法:
-- - 先確認沒重複(invoices 表目前 0 row 安全)
-- - 加 unique on merchant_order_no
-- - 加 FK to orders.merchant_order_no

-- 先檢查並清理重複(目前 0 row 不會跑到)
delete from public.invoices a
using public.invoices b
where a.id < b.id
  and a.merchant_order_no = b.merchant_order_no;

-- unique constraint
alter table public.invoices
  add constraint invoices_merchant_order_no_unique unique (merchant_order_no);

-- FK to orders
alter table public.invoices
  add constraint invoices_merchant_order_no_fkey
  foreign key (merchant_order_no) references public.orders(merchant_order_no)
  on delete restrict;

comment on constraint invoices_merchant_order_no_unique on public.invoices is
  'T1-15: 一筆訂單只能對一張發票,防並發 webhook 開兩張';
