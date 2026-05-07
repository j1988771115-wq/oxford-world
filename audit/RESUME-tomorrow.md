# 明天接續清單 (2026-05-04)

## P0 剩兩個
- **T0-2**: profiles email leak (migration 033 寫好但未 apply)
  - 要先把 community.ts 的 `select(*, profiles!inner(display_name))` 改成 RPC `get_public_profiles`
  - leaderboard (courses.ts:178, :260) 改用 public_profiles view
  - 改完才 apply migration 033
- **T0-14**: admin login Upstash + 2FA
  - 需要 JD 註冊 Upstash redis 拿 REST_URL + REST_TOKEN
  - 寫 TOTP 2FA 流程 (otplib)

## Tier 1 P1 (30 條,從 audit/2026-05-03-FINAL-unified-punch-list.md 看)
- ezpay invoice dedup (T1-11)
- pro_expires_at daily downgrade cron (T1-12)
- course_access fail return early (T1-9)
- topup fail return early (T1-10)
- invoices.merchant_order_no 加 unique + FK (T1-15)
- generateOrderNo 用 crypto.randomBytes (T1-5)
- service_role overuse 降權 (T1-7)
- ezpay /api/inv MerchantID 沒設時 fail-closed (T1-2)
- discussions/submissions UPDATE 加 with check (T1-16)
- alumni 不算 chat quota (T1-17)
- handle_new_user trigger 失敗記 log (T1-18)
- full_setup.sql 砍掉或同步 (T1-19)
- 等

## 等 ezPay 開通(週一打 02-2653-6000)
- 6 筆未開發票補開：
  - kid2266 OVMON8C1QZIF56
  - 張芳銘 OVMOM7URARB5OV
  - 4 筆 5/3 之前的(memory project_oxford_ezpay_pending 列的)
  - 加 5/3 新買的 Jack Chan / 姜禮傑 / 康貽翔(若這幾筆當時也沒開)

## 已完成今晚 (2026-05-03 → 04)
- 13/15 P0 修復(含發現 trigger 沒實際 attach 補洞)
- 4 個 schema migration 已 apply 到 prod (032, 034, 035, 036)
- 2 個 commit push 到 main: 9139c3a + d09de25 + a16c662
- 內部 4 reviewer + 外部 codex/gemini 雙審報告寫在 audit/2026-05-03-FINAL-unified-punch-list.md
- 收款系統完整自動運作驗證: Jack Chan, 姜禮傑, 康貽翔 三筆都自動 fulfillment

