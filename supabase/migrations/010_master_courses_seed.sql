-- 三位講師大師課 seed（2026-04-17）
-- 久方武：太空科技新時代 × AI 資本市場
-- 黃靖哲：台股技術分析實戰
-- YC（JD）：AI × vibe coding × 超級個體

-- 清除 demo 資料（如果存在），再插入真實大師課
delete from public.course_chapters where course_id in (
  select id from public.courses where slug in (
    'ai-decision-making',
    'prompt-engineering-masterclass',
    'ai-trends-2026',
    'web3-smart-contracts'
  )
);
delete from public.courses where slug in (
  'ai-decision-making',
  'prompt-engineering-masterclass',
  'ai-trends-2026',
  'web3-smart-contracts'
);

-- ========== 久方武 大師課 ==========
insert into public.courses (slug, title, description, instructor, price, category, thumbnail_url, is_free_preview) values
  (
    'master-space-age-capital',
    '太空時代的資本配置：下一個十年的產業革命',
    '從 SpaceX、Starlink、Blue Origin 到衛星通訊、太空製造，久方武院長帶你拆解太空科技產業的投資邏輯。不只是火箭——低軌衛星、太空數據、月球經濟、國防航太，每一塊都是兆元級市場。這門課給你一套可執行的資本配置框架。',
    '久方武',
    5990,
    '太空科技 × 資本市場',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200',
    false
  );

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, ch.title, ch.sort_order, ch.is_free_preview, ch.duration_seconds
from public.courses c,
  (values
    ('先導：為什麼太空是下一個科技週期', 1, true, 900),
    ('SpaceX 帝國解剖：可重用火箭如何顛覆成本結構', 2, false, 1800),
    ('Starlink 與低軌衛星通訊的商業模式', 3, false, 1500),
    ('衛星數據經濟：Planet Labs、Maxar、Spire 的護城河', 4, false, 1650),
    ('太空製造與在軌服務：Varda、Axiom 的機會', 5, false, 1500),
    ('國防航太：Anduril、Palantir 與軍工複合體的新秩序', 6, false, 1800),
    ('月球經濟與深空探勘：Intuitive Machines、Astrobotic', 7, false, 1350),
    ('台股太空概念股地圖：從衛星零組件到地面站', 8, false, 1650),
    ('資本配置實戰：組合建構與風險管理', 9, false, 1800),
    ('未來十年展望：太空經濟的黑天鵝與灰犀牛', 10, false, 1500)
  ) as ch(title, sort_order, is_free_preview, duration_seconds)
where c.slug = 'master-space-age-capital';

-- ========== 黃靖哲 大師課 ==========
insert into public.courses (slug, title, description, instructor, price, category, thumbnail_url, is_free_preview) values
  (
    'master-tw-technical-analysis',
    '台股技術分析實戰班：從型態到籌碼',
    '持牌分析師黃靖哲一次帶你打通技術分析的底層邏輯。不是背指標，是理解市場心理與資金流動。從 K 線、均線、型態學，到籌碼面、法人動向、主力成本，用真實台股案例教你如何辨識趨勢、抓進場點、設停損。買斷制，一次學會不過期。',
    '黃靖哲',
    4990,
    '台股 × 技術分析',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200',
    false
  );

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, ch.title, ch.sort_order, ch.is_free_preview, ch.duration_seconds
from public.courses c,
  (values
    ('課程總覽：技術分析的真正價值', 1, true, 900),
    ('K 線的語言：紅綠棒背後的買賣心理', 2, false, 1500),
    ('均線系統：短中長線的攻防轉換', 3, false, 1650),
    ('型態學核心：頭肩頂、W 底、三角收斂', 4, false, 1800),
    ('支撐壓力與趨勢線的實戰畫法', 5, false, 1500),
    ('量價關係：識破假突破與真轉折', 6, false, 1650),
    ('籌碼面分析：法人、主力、散戶的三角博弈', 7, false, 1800),
    ('融資融券與主力成本推算', 8, false, 1500),
    ('進場與停損：部位管理的紀律', 9, false, 1650),
    ('台股真實案例複盤：牛熊市的應對', 10, false, 1800)
  ) as ch(title, sort_order, is_free_preview, duration_seconds)
where c.slug = 'master-tw-technical-analysis';

-- ========== YC（JD） 大師課 ==========
insert into public.courses (slug, title, description, instructor, price, category, thumbnail_url, is_free_preview) values
  (
    'master-vibe-coding-solo',
    'Vibe Coding 超級個體：AI 時代一人公司實戰',
    '我自己就是案例——從 Claude Code 到 Cursor、從 Supabase 到 Vercel，YC 帶你用 AI agent 組合技打造屬於自己的產品、服務、收入來源。這門課不是教你「寫程式」，是教你「用 AI 造價值」。包含牛津視界、敏揚 Trade Agent、Twitch 抖內系統的真實開發過程拆解。',
    'YC',
    4990,
    'AI × 超級個體',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200',
    false
  );

insert into public.course_chapters (course_id, title, sort_order, is_free_preview, duration_seconds)
select c.id, ch.title, ch.sort_order, ch.is_free_preview, ch.duration_seconds
from public.courses c,
  (values
    ('超級個體宣言：一個人就是一間公司', 1, true, 900),
    ('工具棧選型：Claude Code / Cursor / Codex 怎麼配', 2, true, 1200),
    ('Vibe Coding 的核心心法：從對話到產品', 3, false, 1500),
    ('Next.js + Supabase + Vercel 三件套實戰', 4, false, 1800),
    ('Claude Agent SDK：打造你的第一個 AI 員工', 5, false, 1800),
    ('案例拆解 I：牛津視界如何從零到上線', 6, false, 1650),
    ('案例拆解 II：敏揚 Trade Agent 跨境獲客系統', 7, false, 1650),
    ('案例拆解 III：Twitch 抖內系統與 VPS 部署', 8, false, 1500),
    ('MCP、記憶、workflow：下一代 agent 架構', 9, false, 1800),
    ('變現路徑：從 side project 到月營收六位數', 10, false, 1650)
  ) as ch(title, sort_order, is_free_preview, duration_seconds)
where c.slug = 'master-vibe-coding-solo';
