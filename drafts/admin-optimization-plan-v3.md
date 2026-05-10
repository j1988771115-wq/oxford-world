# 牛津視界 Admin 優化方案 v3（三重 review 後 final）

## 三重 review 結論

| Reviewer | Verdict | 關鍵發現 |
|---|---|---|
| Self (Claude Opus) | initial | 框架方向 |
| Gemini | NEEDS_REVISION | Phase 排序、砍 Segment Builder UI / A/B、加 Audit/MFA/Mask/Unsubscribe |
| **Codex** | **NEEDS_REVISION** | RLS bug `profiles.id` 應為 `auth_id`、service role bypass、nudge cap 漏洞、hover reveal 弱、ADMIN_PASSWORD 不能一次拔 |

## v2 → v3 修正

| 項目 | v2 | v3 |
|---|---|---|
| RLS 條件 | `profiles.id = auth.uid()` ❌ | `profiles.auth_id = auth.uid()` ✅ |
| Service role 路徑 | UI conditional 擋 ❌ | 每 endpoint actor-scoped filter ✅ |
| Nudge 防爆寄 | per-sequence PK ❌ | global 7-day cap + priority ✅ |
| Email reveal | hover 顯示 ❌ | click-only + rate limit + dedicated endpoint + audit ✅ |
| ADMIN_PASSWORD 移除 | 一次拔 ❌ | staged: legacy → dual → supabase only ✅ |
| Unsubscribe | mailto: only | HMAC token + /unsubscribe page + db filter |
| Audit log metadata | jsonb 全存 ❌ | PII whitelist（hash + count + masked target，禁完整 HTML/list）|
| Resend separation | quota buffer | 真分 account（Music King vs Oxford 各自 Resend account）|

## Phase 重排（Codex final）

### P0a — Email Safety Hotfix（4 hr）
**最緊急**，5/10 incident 後 + 後續寄信都要它

1. **Unsubscribe HMAC token 機制**
   - `email_unsubscribes` table（email PK + unsubscribed_at + reason）
   - HMAC token: `sha256(email + 'unsubscribe' + EMAIL_SECRET)`，包進信件 link
   - `/unsubscribe?token=...&email=...` page 驗 token 後 INSERT db
   - sendBatchEmails 寄前 filter `email_unsubscribes`
2. **Transactional vs marketing 分流**
   - 訂單通知 / 異常 alert 不受 unsubscribe 影響（continue to send）
   - 行銷 / 推廣信 / Nudge 才 filter
3. **Audit log 最小版本** (`admin_audit_logs` table)
   - metadata 只存 `{ recipient_count, target, hash(html) }`
   - 禁存完整 HTML / recipient emails / PII

### P0b — Auth Dual-mode（3 hr）
**JD 自己不會被擋出 admin**

1. profiles 加 `role` 欄位
2. `lib/admin-auth.ts` 加 `ADMIN_AUTH_MODE` env: `legacy` / `dual` / `supabase`
3. 先 dual mode：ADMIN_PASSWORD cookie OR supabase auth role 任一通過
4. seed JD = superadmin, yupupin = instructor
5. JD 確認 supabase auth 進得了 → 切 supabase only
6. Break-glass: 保留 SUPERADMIN_BREAKGLASS_EMAILS env + short-lived emergency cookie

### P0c — Authorization Hardening（4 hr）
**核心 — instructor 真的看不到別人課**

1. `course_permissions` table 多對多
2. `requireRole(['instructor'])` middleware 回傳 actor profile，不只 boolean
3. **每個 admin server action / API route 加 actor-scoped filter**：
   - admin/email API: instructor 強制 `target=course:<slug>`，server 端驗 actor 對該 course 有 permission
   - admin/orders: instructor 只 query 自己課的 orders
   - 全部使用 service role 但加 explicit `where instructor_user_id = actor.id`
4. **Email reveal 改 click-only**：
   - `/api/admin/reveal-email?id=<order_id>` POST，每次 audit + rate limit (instructor 50/day)
   - 列表預設 masked，點擊單筆才 reveal 30 秒
   - 禁 bulk reveal (除 superadmin)
5. RLS 寫 `profiles.auth_id = auth.uid()` ✅

### P1 — Email Nudge cron（3 hr）

1. `nudge_sent_log` 加 `sent_date date`，加 unique constraint `(user_id, sent_date)` = 一人一天 1 封 cap
2. Sequence priority: onboarding > trial_to_paid > win_back > re_engagement
3. cron 跑時對每 user pick 最高 priority sequence 一次
4. 寄前 filter unsubscribed + paid suppression（已付費不寄推廣）
5. cron 跟 admin/email 共用 `email_send_log` 看 daily Resend cap

### P2 — Dashboard（4 hr）
- 收入 / trend / funnel
- instructor view 只 show 自己課
- 不寫 mobile responsive

### P3 — UX 拆碎（5 hr）
- search / cmd+K palette / nav 按 role

## 工程量

```
P0a Email safety   4 hr   ← 今晚 ship
P0b Auth dual      3 hr   ← 明天
P0c Auth hardening 4 hr   ← 明天
P1  Nudge cron     3 hr   ← 5/13
P2  Dashboard      4 hr   ← 5/14
P3  UX             5 hr   ← 5/16+
總 ~23 hr (v2 17 hr,Codex 加固後增 6 hr)
```

## 必補 patch（v3 鐵則）

1. **`requireRole()` 回傳 actor profile**，不只 boolean
2. **所有 admin server-side query** 必須 actor-scoped（不能裸 service role query 全表）
3. **course_permissions RLS** 用 `profiles.auth_id = auth.uid()`
4. **`nudge_sent_log`** unique `(user_id, sent_date)` 防一人一天多封
5. **reveal email** dedicated endpoint + rate limit + audit
6. **Audit metadata PII whitelist** 禁存完整 HTML / recipient emails
7. **Unsubscribe HMAC token** 防猜 email 代退訂
8. **transactional unsubscribe 分流** 訂單通知不受影響

## Resend 真分 account（待 JD 動作）

- 開新 Resend account 用 yupupin@gmail.com 或 oxford 專屬 email
- verify oxford-vision.com domain DNS
- 拿新 RESEND_API_KEY 設 Vercel
- Music King 留 lbk-music.com domain 在原 account
- Vercel env `RESEND_OTHER_PROJECTS_DAILY=0`（解除 buffer）

## 不做

- ❌ Segment Builder UI
- ❌ A/B test
- ❌ Mobile responsive admin
- ❌ 完整 SaaS BI
- ❌ Resend Pro（free tier 對 100 emails/day 夠，Pro 真正價值是 Custom Tracking Domain，等 1000+/day 再升）

---

## Final verdict

v3 SAFE_TO_IMPLEMENT。下一步：開始 P0a Email Safety Hotfix。
