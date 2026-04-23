# TODOS

## P0: 待設定（不需要寫程式）

- [ ] GitHub OAuth — GitHub Settings → OAuth Apps → 填 callback URL 到 Supabase
- [ ] Google OAuth — Google Cloud Console → OAuth credential → 填到 Supabase
- [ ] 綁自訂域名 — Vercel Dashboard → Settings → Domains
- [x] 藍新金流 key — 已申請通過
- [x] **Vercel 加入環境變數** — NEWEBPAY_MERCHANT_ID / NEWEBPAY_HASH_KEY / NEWEBPAY_HASH_IV / NEWEBPAY_API_URL（Production 已設）
- [x] **Supabase SQL Editor 跑 `supabase/migrations/010_master_courses_seed.sql`** — 三位講師大師課資料已 seed
- [ ] **藍新後台申請「信用卡」啟用** — 目前測試顯示「信用卡服務未啟用」，審核約 3-5 天
- [ ] **藍新後台申請「信用卡定期定額」啟用** — Pro 月費訂閱必需
- [x] **RESEND_API_KEY 申請 + 加到 Vercel** — 2026-04-22 上線（域名驗證 + 測試信實際送達 j1988771115@gmail.com）
- [ ] **SENTRY_DSN 申請 + 加到 Vercel** — 觀測性，SDK 已 wired，設 DSN 就啟用
- [ ] Vercel 重新部署問題 — 目前每個 project 只有首次部署成功，後續需刪重建

## P1: 功能開發

- [x] 藍新金流串接 — code 已完成（newebpay.ts + webhook + checkout + return route）
- [x] 課程頁面結構 — 列表 + 詳情 + 章節 + 付費/Pro CTA 都已完成
- [x] Discord 角色授予 retry 機制 — pending_discord_grants 表 + cron daily retry（Hobby 限 daily；Pro 升級後改 hourly）
- [x] 測試基礎建設 — Vitest + 8 passing tests for newebpay 加密/驗簽/roundtrip
- [ ] Mux 影片上架 — 錄完三位講師大師課後接通影片播放
- [ ] 三位講師錄影 — 久方武（太空/AI 資本）/ 黃老師（台股技術）/ YC（vibe coding）

## P2: 後續優化

- [ ] **Admin password → Supabase admin role + RLS**
  - **What:** 目前 `/admin` 用單一 `ADMIN_PASSWORD` env var 驗證，session token 沒 bind 到個人帳號
  - **Why:** 三位講師共用一把密碼 → 分不清誰改了什麼內容；密碼外洩時 blast radius 大
  - **Pros:** 講師各自 Supabase 帳號登入、audit log 有人名、可精細權限（每位只改自己領域）
  - **Cons:** 工程約 1 天（RLS policies + admin-auth.ts 改寫 + 現有 admin routes 所有 isAdmin() 呼叫點更新）
  - **Context:** 現在只有 JD 一人進 admin，風險低。但講師開始實際登入時就是炸點。建議在三位講師首次登入 admin 前做完。
- [ ] AI RAG 啟用 — pgvector embedding 生成（但先有內容才有意義）
- [ ] 遊戲化（學習連勝 + 排行榜）接通真實資料
- [ ] Email 驗證流程美化
- [ ] OG Image — LINE/FB 分享預覽圖
- [ ] 作品集 / 學習歷程展示頁

## Frozen Backlog（凍結，解凍條件 ≥100 付費或講師抱怨內容不夠）

2026-04-21 五家獨立模型審查共識凍結：
- Research Pipeline（RSS 爬蟲 + Claude filter + 講師 Inbox + AI 生成器）
- 短影音自動化（Whisper + Claude 多格式拆分）
- 多平台自動發布（YouTube/IG/TikTok）
- Email 漏斗自動化

技術筆記存在 `~/.claude/projects/-Users-jd/memory/reference_oxford_pipeline_backlog.md`
