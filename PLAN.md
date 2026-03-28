# 牛津視界官網 — 知識變現平台

## 產品願景

打造「牛津視界」(Oxford Vision) 官方網站，結合學院品牌展示與知識變現系統。核心定位：幫「有 AI 焦慮、已開始找方向但像無頭蒼蠅」的人，提供系統化的學習路徑、講師 AI 助手、和同儕社群。

## 目標用戶

- **利基市場：** 已經在找 AI 學習方向但找不到路的人（「無頭蒼蠅」）
- **潛在市場：** 有 AI 焦慮但還沒行動的人（透過自媒體推動到行動）
- 典型用戶：Eric，米其林甜點師，放棄工作學程式，需要明確的學習路徑

## 既有資產

- 綜合 Discord 群：~20,000 人
- 區塊鏈 JAM 群：600 人
- 程式課學生 Discord：50 人
- Email 名單：700+
- YT 付費會員：數十人
- 實體課程營收：200+ 萬台幣（YC 老師 Go 語言）

## 技術選型（已決定）

- Frontend/Backend: Next.js 14+ (App Router) + **Server Actions**
- Database: PostgreSQL via **Supabase**（含 pgvector for RAG）
- Auth: **Clerk**
- Payment: **藍新金流 NewebPay**（信用卡、超商代碼、ATM、定期扣款）
- AI: **Vercel AI SDK + Claude**（預設 LLM）+ **Supabase pgvector**（RAG 向量搜尋）
- CMS: **Sanity**
- Video: **Mux**（Signed URLs, 60 min expiry）
- Deploy: **Vercel**
- Social: **Discord Bot**（自動整合）

## 交付排程：3 Waves

### Wave 1（2 週）— 開始賣課

1. 品牌官網首頁 + 學院介紹
2. 課程目錄 + 課程詳情頁
3. 用戶註冊 / 登入（Clerk）
4. 會員系統（Free + Pro: NT$499/月）
5. 課程購買（藍新一次性）+ Pro 訂閱（藍新定期扣款）
6. 付費課程影片播放（Mux Signed URLs）
7. 內容展示頁（Sanity CMS + YouTube 嵌入）
8. Email capture（Supabase）
9. Discord 自動整合（付費 → 自動加入專屬頻道）
10. 響應式設計 + SEO 基礎

**Wave 1 上線即開始賣課，不等後續 waves。**

### Wave 2（2 週）— AI 差異化

11. AI 個人化學習路徑測驗（問卷 → OpenAI → 學習路線圖）
12. 講師 AI 分身（OpenAI Assistants API，基於課程內容 RAG）
13. AI 安全防護（prompt injection 防護 + 輸入過濾）

### Wave 3（2 週）— 留存與成長

14. 遊戲化（學習連勝 + Discord 排行榜）
15. AI 週摘要推送（Email + Discord）
16. 跨社群導流自動化（2 萬人群 → 官網 → 課程 → Discord）

## 會員層級

| 層級 | 價格 | 包含內容 |
|------|------|----------|
| Free | NT$0 | 部分免費課程試看、公開報告/文章、email 訂閱 |
| Pro | NT$499/月 或 NT$4,990/年 | 所有課程、付費報告、Discord 社群、AI 助手 |

## Phase 2（Wave 1-3 完成後）

1. AI 工具訂閱層（Pro + AI: NT$999/月）
2. Stripe 整合（國際用戶支付，觸發：有明確國際需求）
3. 進階會員功能（收藏）
4. 電子報系統

## Phase 3 / Backlog

- 學習進度追蹤 + 完課證書（觸發：付費用戶 > 200 人）
- 作品集 / 學習歷程展示頁（觸發：付費用戶 > 200 人）
- 多語系支援（觸發：有明確非中文市場需求）
- 企業 B2B 功能
- 個人化推薦引擎

## 變現策略

- Phase 1 (Wave 1-3)：課程單次銷售 + Pro 訂閱驗證付費意願
- Phase 2：AI 工具訂閱作為持續收入引擎
- 自媒體（YT、直播、Discord 2 萬人群）持續經營作為獲客漏斗
