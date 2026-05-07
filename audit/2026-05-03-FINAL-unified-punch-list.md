# Oxford Vision Final Unified Audit Punch List
2026-05-03 內部 4 agent + 外部 codex + gemini 整合

---

## ⚠️ Tier 0: 多 reviewer cross-confirmed P0 (最高可信)

外部 reviewer 找到的 5 個關鍵 P0 是 internal 完全沒抓到的(粗體標)。

### T0-1. `/api/admin/migrate` 在 prod 是炸彈
- 來源: Internal-Sec + Internal-Code + Codex
- 任何持 admin password 者 POST → 塞假 profile/events/discussions 進 prod
- 修法: `if (process.env.VERCEL_ENV === 'production') return 404` 或刪檔
- 估時: 5 min

### T0-2. profiles 表 email + auth_id + discord_id 對任何登入者公開
- 來源: Internal-Sec + Internal-Schema + Codex + Gemini (4 reviewers!)
- 027 `Authenticated read profiles` policy 沒做 column 限制 → `?select=email&limit=1000` 撈全表
- danny wang 攻擊路徑復活
- 修法: 拆 `public_profiles` view 只 expose 安全欄位,revoke select on profiles
- 估時: 30-60 min (要寫 migration + 改現有 query)

### T0-3. webhook 並發雙打 fulfillment
- 來源: Internal-Payment + Codex
- atomic update 失敗 fallback 拿 existing 沒檢查 status → fulfillment 跑兩次 → 重複加 pro 天數 + 重複加 token + 重複寄信 + 重複開發票
- 修法: fallback 後 if status === 'paid' 直接 return duplicate
- 估時: 5 min

### T0-4. success page 跟 webhook 雙寄
- 來源: Internal-Payment + Codex
- success page reconcileOrder + webhook 都 sendOrderConfirmation/sendCoursePurchaseAlert
- 學員會收到兩封購買信 + 久老師 OBS overlay 跳兩次
- 修法: success page 砍成只做 mark paid + grant access,通知交給 webhook
- 估時: 15 min

### **T0-5. ⭐ NEW (Codex 漏洞): RAG 課程內容對外公開**
- 來源: Codex (internal 漏看)
- `supabase/migrations/023_security_p0_lockdown.sql:10` — drop 錯 policy name
- 結果: 001 的 `Course content is readable` policy **仍存活**
- **付費 RAG 內容(Eyesy 看課內容做問答)現在 anon-key 能撈**
- 跟 5/2 danny wang 攻擊同類洩漏路徑,但 launch P0 lockdown 沒堵到
- 修法: drop 真實 policy name + revoke RPC,寫新 migration
- 估時: 30 min (要先 SELECT pg_policies 確認真實名字)
- **這條最緊急 — 付費內容洩漏中**

### **T0-6. ⭐ NEW (Codex + Gemini): Pro tier vs course_access 不一致**
- 來源: Codex + Gemini (cross-confirmed)
- 兩條 inconsistency 並存:
  (a) `learn/[courseId]/page.tsx:87` UI 用 `tier === 'pro'` 直接放行所有課,沒檢查 pro_expires_at → **過期 Pro 用戶仍看 pro 內容(送錢)**
  (b) `/api/video/signed-token`、`/api/video/progress`、`course_content` RLS 都只認 course_access,不認 tier='pro' → **Pro 訂閱用戶實際播不出影片**
- 兩條合起來: pro 用戶體驗錯亂(UI 看到、API 失敗或反過來)
- 修法: 全平台統一「access 計算」函數: `hasActiveAccess(user, course) = course_access exists OR (tier='pro' AND pro_expires_at > now())`,前後端共用
- 估時: 1-2 hr

### **T0-7. ⭐ NEW (Codex): Pro 用戶被擋買大師課**
- 來源: Codex
- `src/lib/actions/payment.ts:68` — `if (profile.tier === "pro") return { error: "Pro 已可免費觀看" }`
- 但 UI 寫「Pro 訂閱不含大師課,需另購」
- 結果: **目前 8 位 tier=pro 學員(都是買課送 90 天 bundle)若想買第二張課,直接被 server 擋**
- 修法: 砍掉 tier 檢查,改用 course_access 判斷
- 估時: 5 min

### **T0-8. ⭐ NEW (Codex): cron reconcile 從不開發票**
- 來源: Codex
- `src/app/api/cron/reconcile-newebpay/route.ts:83` 補 paid + grant access + 寄信,**但沒呼叫 issueInvoice**
- **kid2266 跟 張芳銘(我手動補的兩筆)都沒發票** — 稅務問題
- 修法: cron 補單時也走 issueInvoice,集中三條 path 共用 fulfillment helper (見 T0-9)
- 估時: 30 min (順便把 invoices.merchant_order_no 加 unique)

### T0-9. subscription 蓋掉現有 pro_expires_at
- 來源: Internal-Payment
- webhook subscription path: `pro_expires_at = now+30d`,若 user 還有未過期 90 天 bundle 會被縮短
- 修法: baseDate = max(now, currentExpiry)
- 估時: 5 min

### T0-10. /api/video/progress 我昨天加的 service-role fallback = RLS 失效
- 來源: Internal-Sec
- 移除 fallback,先修 user-scoped path 真因
- 估時: 30 min (查 RLS WITH CHECK 為何 fail)

### T0-11. auth/callback open redirect
- 來源: Internal-Sec
- `?next=//evil.com` → `${origin}//evil.com` → `https://evil.com`
- 修法: validate next.startsWith('/') && !next.startsWith('//')
- 估時: 5 min

### T0-12. profiles.auth_id 沒 NOT NULL → 孤兒 profile
- 來源: Internal-Schema
- 修法: backfill + alter not null
- 估時: 30 min

### T0-13. protect_profile trigger auth.role() 字串比對 + 沒 set search_path
- 來源: Internal-Sec + Internal-Schema
- SECURITY DEFINER 沒 set search_path → search_path hijack 風險
- 修法: current_user 雙驗 + set search_path = ''
- 估時: 30 min

### T0-14. admin 單因素密碼 + in-memory rate limit serverless 失效
- 來源: Internal-Sec + Codex (rate limit 部分)
- ADMIN_PASSWORD 一外洩 = service_role 全權限,5/min rate limit Lambda cold start 重置
- 修法: Upstash redis rate limit + 2FA
- 估時: 1-2 hr

### T0-15. webhook 沒 replay protection
- 來源: Internal-Sec
- 沒擋 TradeNo nonce,雖然 status='paid' 短路擋住 fulfillment 但會污染 audit log
- 修法: 加 webhook_log unique on (trade_no) 或 nonce table
- 估時: 30 min

---

## Tier 1: 單 reviewer 嚴重 P1 (修復清單)

### Security
- T1-1. `/api/admin/email` 無 sanitise + admin 單因素 → 萬一 admin pwn → phishing 全 subscriber
- T1-2. `/api/inv` (ezpay callback) MerchantID 沒設時 fail-open
- T1-3. avatar 用 user-supplied filename ext (path traversal 邊界)
- T1-4. chat parts[].length 沒 cap → DoS
- T1-5. generateOrderNo 用 Math.random ≈20bit entropy
- T1-6. 028 strip_user_metadata 沒擋 auth.users.role 欄位
- T1-7. service_role overuse: chat / eyesy/quiz / video/signed-token / admin/resend 該降權
- T1-8. match_course_content 5-arg overload 沒鎖 SECURITY INVOKER

### Money / fulfillment
- T1-9. course_access upsert fail 後仍跑後續 → user 收「成功信」但無課
- T1-10. topup fail 後仍寄信「+500k tokens」但實際沒加
- T1-11. ezpay invoice 沒前置 dedup → 並發開兩張(稅務)
- T1-12. pro_expires_at 過期沒 daily downgrade cron
- T1-13. cron reconcile 串行 100 筆藍新 query × 500ms = 50s (60s timeout 邊緣)
- T1-14. orders ON DELETE CASCADE → user 註銷砍訂單 (財務/GDPR 違反)
- T1-15. invoices.merchant_order_no 沒 FK + 沒 unique
- T1-16. discussions / submissions UPDATE 沒 with check → 可改 user_id 偷別人
- T1-17. alumni 自動拿 chat quota Q1 +1M tokens/月
- T1-18. handle_new_user trigger exception catch all 吞 → 註冊成功沒拿課沒 alert
- T1-19. full_setup.sql 跟 migrations/ 嚴重不同步 (staging 缺所有 023+ 安全鎖)
- T1-20. webhook 沒 fulfillment_status 欄位 → 半殘狀態無法重補

### Code quality / Performance
- T1-21. service-role client 散落 22 處 (重複 + 無 singleton)
- T1-22. webhook handler 481 行單檔 (要拆 lib/fulfillment.ts)
- T1-23. fulfillment 邏輯重複 3 次 (webhook / cron / admin-fulfill)
- T1-24. 0 integration test (1 個 newebpay 加密 round-trip 不算)
- T1-25. 3 個 in-memory rate limit Vercel scale 失效
- T1-26. leaderboard 全表掃 learning_events / course_access / discussions
- T1-27. middleware.auth.getUser() per non-static request
- T1-28. anomaly-watch 有 dead RPC call (line 109)
- T1-29. embeddings.ts module load 時就 throw (沒 OPENAI_API_KEY)
- T1-30. vercel.json 沒設 maxDuration

---

## Tier 2: P2 backlog (大量,先記住)

50+ 條, 包括 console.log 沒 prefix / DRY violation / index 缺漏 / enum 欠缺 / fire-and-forget XP insert / Discord placeholder URL / etc。詳見 4 個 internal agent 原始 finding。

---

## 系統性 refactor (1-2 週 incremental)

- **C1** 抽 `lib/fulfillment.ts` — 共用 webhook/cron/admin-fulfill (一次解 T1-22, T1-23, T0-8)
- **C2** 導入 Vercel WDK / Inngest 做 durable job queue (解 best-effort try/catch 蔓延)
- **C3** 抽 `lib/supabase/admin.ts` singleton (解 T1-21)
- **C4** 補 integration test infra (vitest + supabase-js mock,~30-40 case)
- **C5** RLS template pattern + supabase/RLS_PATTERNS.md (統一 USING + WITH CHECK 寫法)
- **C6** 寫一個共用的 `hasActiveAccess()` access 判斷函數 (解 T0-6)

---

## 修復成本估計

| 級別 | 條目數 | 估時 |
|---|---|---|
| Tier 0 P0 (T0-1 ~ T0-15) | 15 | 6-9 小時 |
| Tier 1 P1 (T1-1 ~ T1-30) | 30 | 1.5-2 天 |
| Tier 2 P2 backlog | ~50 | 3-5 天 |
| 系統性 refactor (C1-C6) | 6 | 1-2 週 incremental |

**外部 reviewer 多抓的 5 個關鍵 P0** (T0-5, T0-6, T0-7, T0-8 + T0 attribution sources) 是 internal 完全漏看的,證明雙重審查鐵則(memory `feedback_model_review`)再次成立。Claude 對自己的 patch 確實 rubber-stamp,沒抓到「自己昨天動的 cron 沒開發票」「自己 5/2 launch 寫的 023 drop 錯 policy 名」這種精準洞察。

