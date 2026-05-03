-- T0-15: webhook replay protection
--
-- 目前 webhook handler 只用 SHA verify + status='paid' 短路擋 fulfillment。
-- 但攻擊者捕獲 valid TradeInfo+TradeSha (例如 leak log) 重打:
-- - 業務面 OK (status=paid 直接 duplicate)
-- - 但每次重打都會在 webhook_log 留新 row → audit log 污染
-- - 攻擊者也可能用 retry 攻擊 cron / fulfillment race
--
-- 加 trade_no unique 索引,handler 看到 duplicate insert 直接拒絕。

-- 加 trade_no 欄位 (從 webhook_log 解 TradeInfo 後填,目前只有 merchant_order_no)
alter table public.webhook_log
  add column if not exists trade_no text;

-- partial unique:同一 trade_no 不可重複進來 (NULL 不算 unique)
create unique index if not exists idx_webhook_log_trade_no_unique
  on public.webhook_log(trade_no)
  where trade_no is not null;

-- 補 index 給 trade_no lookup
create index if not exists idx_webhook_log_trade_no_lookup
  on public.webhook_log(trade_no)
  where trade_no is not null;

comment on column public.webhook_log.trade_no is
  'NewebPay TradeNo (from decrypted TradeInfo). Has partial unique index for replay protection — duplicate webhook with same TradeNo will fail to insert.';
