# Tactical findings from 2026-05-02 webhook hotfix session

這 5 個 issue 是針對該 session 6 個 commit 的 review,等通盤 audit 完之後一起決議優先級。

## P0 - 1. /api/admin/resend-instructor-alert 沒 idempotency
- 重複 POST 同一個 order 會多次寄信給 yupupin@gmail.com
- 修法:加 instructor_alerts_sent 表,寄前 dedup
- 估時:10 min

## P1 - 2. webhook_log.merchant_order_no 永遠 null
- 藍新 webhook form data 沒 MerchantOrderNo 欄位(在 TradeInfo 加密內)
- handler 第一行 insert log 時抓不到,後續又沒 update
- 結果:從 webhook_log 反查訂單問題撈不出來
- 修法:decrypt 成功後 UPDATE webhook_log SET merchant_order_no = ?
- 估時:5 min

## P2 - 3. decryptTradeInfo padding fix 沒有 test
- src/lib/newebpay.ts 的 setAutoPadding(false) + 手動 strip 0x1A
- 0 個 test 證明這個邏輯正確
- 風險:下次有人「優化」改回 PKCS#7 整套崩潰
- 修法:寫 tests/lib/newebpay.test.ts hardcode 真實 webhook payload + expected JSON
- 估時:15 min

## P3 - 4. webhook handler 變肥(370+ 行單檔單函式)
- handle SHA verify / decrypt / order update / access grant / pro tier / discord / email / invoice / instructor alert / OBS alert / log
- 應該抽 service layer:fulfillCourseOrder / extendProBundle / notifyStudent / notifyInstructor
- 是 tech debt 不是 P0
- 估時:1-2 hr refactor

## P3 - 5. NEWEBPAY_HASH_KEY/IV 從 sensitive 變 encrypted
- 我重設 env 時沒帶 sensitive flag,變預設 encrypted
- 差別:任何 Vercel project access 者點 dashboard reveal 看得到 plain
- runtime 行為不變
- 修法:dashboard 切回 sensitive(或 vercel CLI re-add with --sensitive)
- 估時:2 min
