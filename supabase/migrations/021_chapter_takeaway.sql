-- 章節「你會帶走什麼」摘要 — 抽象框架,不洩漏個股
-- 2026-05-01

alter table public.course_chapters
  add column if not exists takeaway_summary text;

comment on column public.course_chapters.takeaway_summary is
  '一段話描述本章學員會帶走的投資思維,抽象框架不洩漏個股,免費可見驅動 conversion';

-- 太空課 10 章 takeaway
update public.course_chapters set takeaway_summary = '理解為什麼下一個十年最強敘事是太空,而不是 AI 也不是電動車。學會用「科技週期」框架判斷一個產業是否進入資本配置黃金窗口,以及這個窗口會持續多久。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 1;

update public.course_chapters set takeaway_summary = '看懂「垂直整合」如何在新興產業變成不可逾越的護城河 — 為什麼控制供應鏈、發射、應用三條線的玩家會吃掉整個賽道。學會辨識哪些訊號代表一家公司正在朝吃整條產業鏈邁進,以及這類公司估值容易被低估的點。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 2;

update public.course_chapters set takeaway_summary = '客戶集中型公司的雙刃劍 — 政府/軍事訂單為什麼是極穩定的現金流,卻同時是天花板。學會評估「政策依賴型」護城河的真實厚度,以及為什麼這類公司在牛市跑輸、熊市抗跌。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 3;

update public.course_chapters set takeaway_summary = '拆解新一代行動通訊基礎設施的競爭格局。為什麼直連手機的衛星挑戰者面對的不只是技術問題,還有頻譜分配、電信夥伴、訊號干擾這些常被新聞忽略的硬骨頭。學會看懂技術 thesis 與商業 thesis 的落差。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 4;

update course_chapters set takeaway_summary = '機動性發射在巨頭夾縫中的價值定位。為什麼「中型」執行者反而能找到不被霸主壓死的縫,以及這類公司估值最容易誤判的兩個參數。學會判斷小型發射商長期是真利基還是過渡產品。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 5;

update course_chapters set takeaway_summary = '差異化倖存的策略邏輯 — 在巨頭壟斷的市場另闢戰場,什麼樣的客戶切入點能換來合理 ROI,哪些誘人但實際是死局的選項。學會用「巨頭不想做的事」反推小公司的長期價值。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 6;

update course_chapters set takeaway_summary = '太空數據經濟的商業模式拆解。為什麼「每天為地球拍照」這件事的真實買家比想像中少,以及 SaaS 化轉型的機會與陷阱。學會看穿「資料即護城河」的故事中,哪些是真資產、哪些只是投影片話術。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 7;

update course_chapters set takeaway_summary = '太空產業「賣鏟人」的選股邏輯。為什麼在軌服務與太空製造是被低估的細分賽道,以及如何判斷哪家「賣鏟人」會勝出。學會用上游 vs 下游、CAPEX 密度、客戶分散度三個指標篩選真正的隱形冠軍。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 8;

update course_chapters set takeaway_summary = '政府訂單驅動的新疆界 — 月球商業化看似科幻,但有清楚的 NASA 訂單脈絡可循。學會評估「政策驅動型」公司的時序風險:訂單時間表、資金 burn rate、與里程碑遞延對股價的影響。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 9;

update course_chapters set takeaway_summary = '把前面 9 章拼成一個有 risk-adjusted return 的組合 — 怎麼分配權重、怎麼設停損、怎麼跨產業 hedge。學會用 6 個月、3 年、10 年三個時間尺度設定回顧時點,並避免「明牌信徒」的最大陷阱:只買進不檢視。'
where course_id = (select id from courses where slug = 'master-space-age-capital') and sort_order = 10;
