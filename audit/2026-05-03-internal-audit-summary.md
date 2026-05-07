# Oxford Vision 內部 4 面向 Audit 整合 (2026-05-03)

4 個並行 agent 跑完,各自獨立發現,共 ~160 條 finding。本檔 cross-reference 強信號 + 系統性議題。外部審查 (codex + gemini) 仍在跑。

---

## A. 跨 Agent Cross-Confirmed P0 (多 reviewer 同時抓到 = 高可信)

### A1. `/api/admin/migrate` 在 production 是炸彈
- Security agent: P0 — 任何持有 admin password 的人 POST 都會塞 8 個假 profile + 90 天 events + discussions + dungeons
- Code quality agent: P0 — 同樣標記
- 共識修法: 加 `if (process.env.VERCEL_ENV === 'production') return 404` 或整支刪
- 估時: 5 min

### A2. profiles 表 email 對任何登入者公開 (027 policy 漏洞)
- Security agent: P0 PII leak — `Authenticated read profiles` policy 讓任何登入用戶 SELECT 任何 profile 含 email/discord_id/auth_id
- Schema agent: P1 — 註解寫「靠 application 限定欄位」但 PostgREST 不會幫你過濾
- 攻擊路徑: `?select=email&limit=1000` 直接撈全表 email — 復活 danny wang 那種攻擊
- 修法: 拆 public_profiles view 只 expose 安全欄位,revoke select on profiles
- 估時: 30 min (要寫 migration + 改現有 query)

### A3. webhook handler 並發雙打 fulfillment
- Payment agent: P0 — 並發 webhook 時 atomic update 失敗 fallback 拿 existing 沒檢查 status,整段 fulfillment 二次執行 → 重複加 pro 天數 / 重複加 topup tokens / 重複寄信 / 重複開發票
- 修法: fallback 後 if existing.status === 'paid' 直接 finalizeLog duplicate + return
- 估時: 5 min

### A4. success page + webhook 重複寄信
- Payment agent: P0 — success page reconcileOrder 跟 webhook 都會 sendOrderConfirmation + sendCoursePurchaseAlert,正常 case 雙寄
- 修法: success page 砍成只做 mark paid + grant access,通知交給 webhook 一條 path
- 估時: 15 min

### A5. subscription 蓋掉現有 pro_expires_at
- Payment agent: P0 — webhook subscription path 直接 set pro_expires_at = now+30d,若 user 還有未過期 bundle (例 60 天) 會被縮短到 30 天 — 用戶損失
- 修法: 改用 baseDate = max(now, currentExpiry) 邏輯延長 (跟 bundle 對齊)
- 估時: 5 min

### A6. /api/video/progress 的 service-role fallback 等於 RLS 失效
- Security agent: P0 — user-scoped RLS upsert fail 後 fallback 走 admin client,沒重新驗 user_id 對應 — 是我昨天加的「保險」變成漏洞
- 修法: 移除 fallback,直接修 user-scoped path 的真正問題
- 估時: 30 min (要先查 RLS 為何 fail)

### A7. auth/callback open redirect
- Security agent: P0 — `?next=//evil.com` → `${origin}//evil.com` 解析成 `https://evil.com`
- 修法: validate next.startsWith('/') && !next.startsWith('//')
- 估時: 5 min

### A8. profiles.auth_id 沒 NOT NULL
- Schema agent: P0 — unique 對 NULL 不擋,handle_new_user 的 on conflict (auth_id) do nothing 對 NULL 也不 conflict → 可生孤兒 profile
- 修法: backfill + alter add not null
- 估時: 30 min

### A9. protect_profile_sensitive_fields trigger 用 auth.role() 字串比對
- Security agent + Schema agent: P0/P1 — 任何能讓 auth.role() != 'service_role' 的方式都會繞過;Supabase 多種內部 role 沒涵蓋
- 修法: current_user 雙驗 + set search_path = ''
- 估時: 30 min

### A10. admin shared password + in-memory rate limit
- Security agent: P0 — admin login 5/min rate limit 是 in-memory Map,Lambda cold start 重置;ADMIN_PASSWORD 知道就有 service_role 全權限
- 修法: 改 Upstash/Supabase rate limit + 加 2FA / IP allowlist
- 估時: 1-2 hr

---

## B. Single-Agent P0 / P1 (重要但只有一個 reviewer 提)

### Security only
- `/api/admin/email` 無 sanitise + 配 admin password 單因素 = phishing 全 subscriber list 工具
- `match_course_content` 5-arg overload 沒 lock SECURITY INVOKER (016 redefine 又 023 alter 4-arg only)
- service_role 在 chat / eyesy/quiz / video/signed-token / admin/resend 越權使用 — 該降權的沒降
- newebpay webhook 沒 replay protection (TradeNo nonce)
- ezpay /api/inv 沒 nonce/timestamp check + MerchantID 沒設時 fail-open
- avatar 路徑用 user-supplied filename ext
- chat parts[].length 沒 cap → DoS
- generateOrderNo 用 Math.random ≈20bit entropy
- 028 strip_user_metadata 沒擋 auth.users.role 欄位

### Payment only
- ezpay invoice 沒 dedup → 並發 webhook 真的開兩張發票 (稅務問題)
- course_access upsert fail 後 businessError 標記繼續跑後續 → user 收「購買成功」但看不到課
- topup fail 後也繼續跑 → 用戶收 "+500k tokens" 但實際沒加
- pro_expires_at 過期沒 daily downgrade cron — 過期還能看 pro 內容
- cron reconcile 串行 100 筆藍新 query × 500ms = 50s 接近 60s timeout

### Schema only
- orders.user_id ON DELETE CASCADE — user 註銷整批訂單級聯刪 (財務/GDPR 違反)
- invoices.merchant_order_no 沒 FK
- alumni access_type 算入 chat quota Q1 → alumni 自動拿 1M Sonnet tokens/月
- handle_new_user trigger exception catch all 吞 → 註冊成功但沒拿課,沒 alert
- full_setup.sql 跟 migrations/ 嚴重不同步,staging 用會缺所有 023+ 安全鎖定
- discussions / submissions UPDATE policy 沒 with check → user 可改 user_id 偷別人

### Code quality only
- service-role client 散落 22 處 (重複 boilerplate + 沒 singleton)
- webhook handler 變肥到 370+ 行 single function
- fulfillment 邏輯逐字重複 3 次 (webhook / cron / admin-fulfill)
- 0 integration test (只 1 個 newebpay 加密 round-trip 單元測)
- middleware excludes /api → /api/admin/* /api/cron/* 各自驗
- 3 個 in-memory rate limit 各自獨立 Vercel scale 失效
- leaderboard 全表掃 learning_events + course_access + discussions
- vercel.json 沒設 maxDuration
- chat handler 481 行
- console.log/warn/error 90 處沒 prefix 規範
- middleware.auth.getUser() per non-static request

---

## C. 系統性議題 (不是單一 bug 是 pattern)

### C1. 缺正式 background job queue
四個 agent 都看到 best-effort try/catch 蔓延。實際上 webhook → email/invoice/discord/alert/instructor email 應該推 durable queue (Vercel WDK / Inngest / Trigger.dev),失敗自動重試 + 觀察。現在靠 cron + 人工從 webhook_log 撈。

### C2. 0 integration test
全 src/app/api/* 21 個 endpoint + 9 個 server actions + 4 個 cron 沒任何整合測。padding fix 在 SHA 簽章保護下安全沒 attack vector,但下次有人 refactor lib 沒人擋。最低補測範圍: webhook handler 5 個分支 + adminFulfillOrder + cron reconcile 3 種狀態 = ~30-40 case = 1-2 天工。

### C3. service-role overuse pattern
22 處 `createClient(URL, SERVICE_ROLE_KEY)` 散落各 endpoint,很多用在「user-scoped 也能做」的場景 (如 chat 的 profile lookup、courses 列表、Eyesy quiz 的 chapter 讀取)。每加一個 admin client 都是 RLS bypass surface。應該抽 lib/supabase/admin.ts singleton + 默認用 user-scoped,只在真需要時呼叫 admin。

### C4. webhook handler 變大教堂
從 5/1 約 100 行 → 5/3 已 481 行,新功能就塞同檔。每加一個 best-effort 動作 (instructor email、OBS alert、發票) 都讓檔案變脆弱。應抽 lib/fulfillment.ts 純函數,webhook 變 80 行 orchestrator,cron 跟 admin-fulfill 共用同一組 fulfillment helper。

### C5. RLS 設計不對稱
INSERT WITH CHECK 嚴格 vs UPDATE/SELECT USING 寬鬆 vs 沒 with check,各表各寫法。應該每張寫操作表都用 templated pattern: same predicate for using + with check, INSERT 必含 with check。建議寫 supabase/RLS_PATTERNS.md 文件統一。

---

## D. 預估修復成本

| 級別 | 條目數 | 估時 |
|---|---|---|
| 跨 agent P0 (A1-A10) | 10 | 4-6 hr |
| 單 agent P0/P1 | ~30 | 1-2 day |
| P2 backlog | ~50 | 3-5 day |
| 系統性 refactor (C1-C5) | 5 | 1-2 wk (incremental) |

---

## E. 等外部 reviewer 後再決議的議題

外部 codex + gemini 跑回來後會更新此檔,並做 cross-validation:
- 哪些 internal findings 是 false positive
- 哪些是 internal 漏看的 (independent reviewer 加值)
- 兩個 LLM family 都同意的 = 最高優先

---

