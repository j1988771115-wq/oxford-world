@AGENTS.md

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. The
skill has multi-step workflows, checklists, and quality gates that produce better
results than an ad-hoc answer. When in doubt, invoke the skill. A false positive is
cheaper than a false negative.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke /office-hours
- Strategy, scope, "think bigger", "what should we build" → invoke /plan-ceo-review
- Architecture, "does this design make sense" → invoke /plan-eng-review
- Design system, brand, "how should this look" → invoke /design-consultation
- Design review of a plan → invoke /plan-design-review
- Developer experience of a plan → invoke /plan-devex-review
- "Review everything", full review pipeline → invoke /autoplan
- Bugs, errors, "why is this broken", "wtf", "this doesn't work" → invoke /investigate
- Test the site, find bugs, "does this work" → invoke /qa (or /qa-only for report only)
- Code review, check the diff, "look at my changes" → invoke /review
- Visual polish, design audit, "this looks off" → invoke /design-review
- Developer experience audit, try onboarding → invoke /devex-review
- Ship, deploy, create a PR, "send it" → invoke /ship
- Merge + deploy + verify → invoke /land-and-deploy
- Configure deployment → invoke /setup-deploy
- Post-deploy monitoring → invoke /canary
- Update docs after shipping → invoke /document-release
- Weekly retro, "how'd we do" → invoke /retro
- Second opinion, codex review → invoke /codex
- Safety mode, careful mode, lock it down → invoke /careful or /guard
- Restrict edits to a directory → invoke /freeze or /unfreeze
- Upgrade gstack → invoke /gstack-upgrade
- Save progress, "save my work" → invoke /context-save
- Resume, restore, "where was I" → invoke /context-restore
- Security audit, OWASP, "is this secure" → invoke /cso
- Make a PDF, document, publication → invoke /make-pdf
- Launch real browser for QA → invoke /open-gstack-browser
- Import cookies for authenticated testing → invoke /setup-browser-cookies
- Performance regression, page speed, benchmarks → invoke /benchmark
- Review what gstack has learned → invoke /learn
- Tune question sensitivity → invoke /plan-tune
- Code quality dashboard → invoke /health

## 改動前必讀的踩雷區

### RLS 改 courses 表前 → 先開 incognito 驗首頁不空
2026-05-07 起,行銷頁(/  /courses)用 anon key 讀 courses 走真 ISR(commit 9efd7a6)。
代表:**如果未來把 courses 的 RLS 鎖緊不允許 anon SELECT,首頁會靜默變空** —
沒錯誤、沒 log、就是沒課程顯示,Google 也會看到空白頁。

改 courses RLS / migration 之前:
1. staging 改完先開 incognito(無 cookie)瀏覽 https://oxford-vision.com/ 跟 /courses
2. 確認課程卡片有顯示,「太空時代的資本配置」要在
3. 沒問題再 push prod

同樣邏輯適用 `course_chapters`(沒 video 偵測會壞)。

### Postgres function overload 不要重複
2026-05-07 修過一個 4 天 silent fail 的 RAG bug:`match_course_content` 同時有 4-arg + 5-arg,
PostgREST 帶 keyword args 時不知挑哪個 → ambiguous error → silent return null。
建新 RPC 一律 **單一 signature**,需要 optional 就用 `default null` 而不是另開 overload。

### 新加 marketing / 公開頁 → server component 不准讀 cookies
讀 cookies 會 opt-in dynamic rendering,`revalidate` 失效,TTFB 從 100ms 飆到 2s+。
公開資料一律走 `getPublicSupabase()` (lib/actions/courses.ts),user-scoped 才用 createClient。
細節:`feedback_oxford_perf_hygiene.md`(個人記憶)。

### 新 client widget 重的 → 一律 lazy
任何帶 `@ai-sdk/react` / Mux / 大 lib 的 client component,放 root layout 之前先包 dynamic import + ssr:false。
範本:`src/components/eyesy/lazy-chat-widget.tsx`。

### Vercel Preview deploy 整站 noindex(2026-05-07)
preview hash URL 不會被 Google 索引(避免跟正式站打架)。
如果要分享 preview 給講師 review,**他們得直接收 URL,Google 搜不到**。
