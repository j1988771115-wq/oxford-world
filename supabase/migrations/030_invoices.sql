-- 電子發票紀錄表
-- 開發票流程:webhook 標 paid 後呼叫 ezPay issueInvoice → 拿 invoice_number → 寫這表
-- ezPay 也會 callback /api/inv 來補登(idempotent on invoice_number)
-- 2026-05-02

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  merchant_order_no text not null,
  invoice_number text not null,
  invoice_trans_no text,
  random_num text,
  total_amt numeric(12, 2),
  buyer_email text,
  ezpay_status text,
  issued_at text, -- ezPay 給的 ISO/timestamp 字串
  raw jsonb, -- 整包 ezPay 回傳備查
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(invoice_number)
);

create index if not exists idx_invoices_merchant_order_no
  on public.invoices(merchant_order_no);

-- RLS:client 全擋(只有 service_role 寫,client 不需讀)
alter table public.invoices enable row level security;

drop policy if exists "Anyone can read invoices" on public.invoices;
drop policy if exists "Public read invoices" on public.invoices;
drop policy if exists "Users read own invoices" on public.invoices;

-- 用戶可讀自己的發票(透過 orders 關聯)
create policy "Users read own invoices"
  on public.invoices for select
  using (
    merchant_order_no in (
      select o.merchant_order_no
      from public.orders o
      where o.user_id in (select id from public.profiles where auth_id = auth.uid())
    )
  );
