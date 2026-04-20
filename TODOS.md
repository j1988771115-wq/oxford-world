# TODOS

## P0: 待設定（不需要寫程式）

- [ ] GitHub OAuth — GitHub Settings → OAuth Apps → 填 callback URL 到 Supabase
- [ ] Google OAuth — Google Cloud Console → OAuth credential → 填到 Supabase
- [ ] 綁自訂域名 — Vercel Dashboard → Settings → Domains
- [x] 藍新金流 key — 已申請通過
- [ ] **Vercel 加入環境變數** — NEWEBPAY_MERCHANT_ID / NEWEBPAY_HASH_KEY / NEWEBPAY_HASH_IV
- [ ] **Supabase SQL Editor 跑 `supabase/migrations/010_master_courses_seed.sql`** — 三位講師大師課資料
- [ ] Vercel 重新部署問題 — 目前每個 project 只有首次部署成功，後續需刪重建

## P1: 功能開發

- [x] 藍新金流串接 — code 已完成（newebpay.ts + webhook + checkout + return route）
- [x] 課程頁面結構 — 列表 + 詳情 + 章節 + 付費/Pro CTA 都已完成
- [ ] Mux 影片上架 — 錄完三位講師大師課後接通影片播放
- [ ] Discord 自動整合 — addProRole 已接通，測試付款流程 Pro 角色是否自動給
- [ ] 三位講師錄影 — 久方武（太空/AI 資本）/ 黃老師（台股技術）/ YC（vibe coding）

## P2: 後續優化

- [ ] AI RAG 啟用 — pgvector embedding 生成
- [ ] 遊戲化（學習連勝 + 排行榜）接通真實資料
- [ ] Email 驗證流程美化
- [ ] OG Image — LINE/FB 分享預覽圖
- [ ] 作品集 / 學習歷程展示頁
