# Orderly Public Pages — 頂級挑剔 Critique + Revision Plan + Codex Handoff

> 基準：commit `3e33b00`（branch `refactor`），本人逐頁實截實看（5566 dev server，light + dark + 全部 route）。
> 截圖證據在 `/tmp/orderly-design-cmp/AUD_*.png`。
> 既已修：5566 dev server stale → ChunkLoadError（login/register 炸）→ 清 `.next` 重啟後全部 route 200。

---

## A. 頂級挑剔（逐頁，附嚴重度）

### A-1 Landing `/`

| # | 嚴重度 | 問題 | 證據 | 該怎樣才頂級 |
|---|---|---|---|---|
| L-1 | **High** | **Hero 是 generic stock-photo slop**：深色餐廳照 + 深色漸層 + 置中白字＝範本感。真正的差異化資產（對帳工作卡）縮在右下角、又小又被吃掉。賣 money-critical 工具卻讓「心情照」當主角。 | AUD_00 / dark_hero | 降低照片支配感（更亮/更乾淨的處理，或縮成側欄），**把對帳工作卡放大成 hero 主角**＝「8h→30min」的證據；照 design spec 的「給人看真產品」精神。 |
| L-2 | **High** | **垂直留白過多、節奏鬆散**：TrustBar 之後、痛點解法雙欄之後都有大片空隙，整頁「飄」、回到「空」感。 | AUD_01（panes 結束到「運作方式」一大段空白） | 收緊 section padding 成一致 8px-scale 節奏（py-16→py-12/14），砍區塊內死白；讓內容密度撐起頁面。 |
| L-3 | **High** | **whileInView reveal 把區塊卡在 `opacity:0` 直到捲動**：無 JS / SSR 預覽 / OG 爬蟲 / 快速捲動 / 截圖都看到空白＝差勁第一印象（這就是先前全頁截圖一片空的根因）。 | 全頁截圖空白 vs 捲動才出現 | reveal **絕不可停在會持續的 opacity:0**：改 translate-only（不動 opacity）或 viewport margin 提前觸發，並給 `prefers-reduced-motion` / no-JS 直接顯示終態。 |
| L-4 | Med | count-up 太慢/不穩：TrustBar 捲到後約 1s 還停在 23億/94.4（未到 24億/99.4）。 | AUD_01 vs dark_hero | 縮短 count-up duration（~0.8s）、確保進視窗即觸發。 |
| L-5 | Med | RoleTabs 的「{角色} Dashboard 縮影」是**空的淺色佔位框**，看起來沒做完。 | SCROLL_3 | 放真實裁切產品截圖，或做一個有結構的 mini-DOM mock；不要空框。 |
| L-6 | Med | 餐廳 accent `#ff6b35` 太飽和搶眼（亮橘按鈕/tab），打架 refined Mocha。 | SCROLL_3 / contact | 降飽和或只當小標記，不整顆按鈕填滿亮橘。 |
| L-7 | Low | Hero 收尾數字「30 分鐘」accent 太淡，payoff 不夠重；hero 底部數據列貼邊太擠。 | AUD_00 | 強化「30 分鐘」對比；數據列上移留呼吸。 |

### A-2 Contact `/contact`

| # | 嚴重度 | 問題 | 該怎樣 |
|---|---|---|---|
| C-1 | Med | 表單下方**一大片空黑**，頁面沒撐滿、footer 飄很遠＝沒做完感。 | 加 LandingFooter 並讓頁面正常填滿，或把表單卡垂直置中＋限制頁高；不要留巨大空帶。 |
| C-2 | Low | 身分選「餐廳」是大面積亮橘（同 L-6）。 | 同 L-6 收斂。 |

### A-3 Privacy `/privacy` · Terms `/terms`
- 誠實 stub + footer 正常，OK。Low：footer 下方薄空帶，可忽略。

### A-4 Login `/login` · Register `/register`（既有頁，本次未改）

| # | 嚴重度 | 問題 | 該怎樣 |
|---|---|---|---|
| AU-1 | **High** | **設計不一致**：login/register 還是舊設計（棕色左欄分割版、無深色模式、字級不同）。從新 landing 點進去像兩個產品。 | 把 auth 頁重設計成新設計系統 + 支援深色模式（原 scope 外，列 P2）。 |
| AU-2 | （已修） | stale dev server 的 ChunkLoadError | 清 `.next` 重啟已解；團隊筆記：大量刪元件後 dev server 要重啟。 |

### A-5 全域
- G-1 Med：Hero 圖仍是 generic Unsplash stock。正式上線應換**真實品牌/實拍**（需素材，不可捏造）。
- G-2 Low：深色模式整體**做得好**（分層 surface、pricing/FAQ/footer 皆正確），非反白——這塊是亮點，保留。

---

## B. Revision Plan（優先序）

| 階段 | 項目 | 內容 | 對應挑剔 |
|---|---|---|---|
| **P0 已完成** | dev server 清快取重啟 | 全 route 200 | AU-2 |
| **P1 頂級 polish（核心）** | R1 Hero rework | 對帳卡升為主角、照片處理變乾淨、payoff 數字加重、數據列呼吸 | L-1, L-7 |
| | R2 Motion pass | reveal 改 translate-only / 提前觸發 / no-JS fallback；count-up 加速 | L-3, L-4 |
| | R3 Rhythm pass | 全頁 section padding 一致化、砍死白、提密度 | L-2 |
| | R4 RoleTabs + accent | 角色縮影換真 mock、accent 降飽和 | L-5, L-6, C-2 |
| | R5 Contact 版面 | 補 footer / 填滿 / 表單置中，去巨大空帶 | C-1 |
| **P2 一致性** | R6 Auth 頁重設計 | login/register 套新設計系統 + 深色模式 | AU-1 |
| **P3 素材** | R7 真實實拍 hero | 換掉 stock（需品牌素材，user 提供） | L-1, G-1 |

**共用硬約束（每項都守）**：示意數據標「（示意）」、禁捏造客戶名/假精度、定價真實級距、按鈕零死連結、深色 variants、繁中文案。驗證標準：相對 baseline（1074）零新增 tsc error（`npx tsc --noEmit`）+ Playwright `e2e/public-pages.spec.ts` 全綠（fresh dev server）+ 命名目標 PUBLIC_SCOPE grep 0 命中。

---

## C. Codex Handoff Prompts（paste-ready，逐項；英文＝機器讀）

> Run each via `codex exec` from repo root, or paste into Codex CLI. Each is self-contained. Do ONE at a time, verify, commit precise paths (no `git add -A`, no `--no-verify`, no push). Repo has 1074 pre-existing tsc errors — your bar is ZERO NEW, not exit-0. Dark mode is `next-themes` class-based (already wired). Sample data uses the `sample` flag in `components/landing/landingData.ts`. NEVER add fabricated customer names. Verify visually by starting a fresh dev server on a temp port and screenshotting (do NOT trust that it "looks right" without a screenshot).

### Prompt R1 — Hero rework (make the product the hero)
```
File: components/landing/Hero.tsx (+ components/landing/ReconciliationCard.tsx). Work in /Users/leeyude/Projects/Orderly.

The current hero is a generic dark stock-photo with centered white text; the reconciliation card (our real differentiator) is tiny in the bottom-right and lost. Rework so the PRODUCT is the hero:
1. Reduce photo dominance: lighter overlay or move the photo to a side/right column instead of full-bleed-behind-text; the page must not read as "mood photo + slogan".
2. Make ReconciliationCard the visual centerpiece — significantly larger, foregrounded, with the scan/confidence animation clearly visible. It is the proof of「8 小時→30 分鐘」.
3. Strengthen the payoff: make「30 分鐘」(HERO.titleAccent) higher-contrast/heavier.
4. Give the HERO_STATS row breathing room (not jammed at the very bottom edge).
Keep: HERO/HERO_STATS from landingData, local image HERO_IMAGE_SRC ('/hero/restaurant-hero.jpg'), CTAs (/contact, #reconciliation), dark mode variants, framer-motion entrance with reduced-motion fallback, responsive (mobile: card stacks under text, photo de-emphasized).
Constraints: no fabricated names; sample stats keep「（示意）」. Verify: npx tsc --noEmit (zero new errors in Hero.tsx/ReconciliationCard.tsx), then start dev on a temp port and screenshot the hero (light + dark) to confirm the card is prominent and text is legible. Commit only the 2 files.
```

### Prompt R2 — Motion robustness + count-up
```
Files: all components/landing/*.tsx that use framer-motion `whileInView` / reveal, plus the count-up (TrustBar.tsx). Work in /Users/leeyude/Projects/Orderly.

Problem: reveal-on-scroll uses initial={{opacity:0}} which leaves sections INVISIBLE until scrolled — blank on no-JS, SSR preview, OG crawlers, fast scroll, and full-page screenshots. Fix across all landing sections:
1. Never leave content stuck at opacity:0. Either (a) animate transform only (translateY) and keep opacity:1, or (b) use whileInView with viewport={{ once: true, margin: '0px 0px -15% 0px' }} so it triggers before fully entering, AND ensure the initial state still renders text (prefer translate-only). 
2. Honor useReducedMotion(): when true, render final state immediately (no transform, no opacity ramp).
3. Guarantee a no-JS / SSR fallback shows final content (don't rely solely on JS to reveal).
4. TrustBar count-up: shorten duration to ~0.8s and ensure it starts on enter-viewport; final values must always be reached.
Constraints: keep dark variants + responsive. Verify: take a FULL-PAGE screenshot WITHOUT scrolling on a fresh dev server — every section's text must be visible (not blank). Then run npx playwright test e2e/public-pages.spec.ts (must stay green). Zero new tsc errors. Commit the touched files.
```

### Prompt R3 — Vertical rhythm pass
```
Files: components/landing/*.tsx (section wrappers) + app/page.tsx. Work in /Users/leeyude/Projects/Orderly.

The landing has excessive vertical whitespace — big empty gaps after TrustBar and after the PainSolution panes — making it feel sparse/"hollow" despite full content. Establish a consistent, tighter vertical rhythm:
1. Normalize every section to one padding scale (e.g. py-14 md:py-16, not py-20+); remove dead intra-section spacing.
2. Ensure consistent section-heading spacing (label → h2 → lead → content) using the 8px scale.
3. Increase content density so sections connect visually instead of floating.
Do NOT remove any section or content. Constraints: keep dark variants, responsive, anchors (#features #pricing #reconciliation #roles #faq) intact (E2E depends on them). Verify: scroll-through screenshots on fresh dev server showing tighter rhythm; playwright green; zero new tsc errors. Commit touched files.
```

### Prompt R4 — RoleTabs mock + accent toning
```
Files: components/landing/RoleTabs.tsx, and wherever module accent #ff6b35 renders as a large filled element (RoleTabs, app/(marketing)/contact/page.tsx identity selector). Work in /Users/leeyude/Projects/Orderly.

1. The「{role} Dashboard 縮影」placeholder is an empty tinted box and looks unfinished. Replace with a styled mini product mock (a small structured DOM mockup: header bar + a few rows/cards in the role's accent), OR a cropped illustrative panel — not an empty box. Keep it clearly illustrative (no fabricated data presented as real).
2. The restaurant accent #ff6b35 is too saturated as a full button/tab fill; tone it down (use a softer tint as background with accent text/border, reserve solid accent for small markers). Apply consistently in RoleTabs and the contact identity selector.
Constraints: keep the 3 module accents distinguishable (restaurant/supplier/platform), radix tabs keyboard a11y, dark variants. Verify: screenshot RoleTabs (all 3 tabs) + contact selector on fresh dev server; zero new tsc errors; playwright green. Commit touched files.
```

### Prompt R5 — Contact page layout fill
```
File: app/(marketing)/contact/page.tsx. Work in /Users/leeyude/Projects/Orderly.

The contact page has a large empty band below the form (page doesn't fill, footer floats far away). Fix the layout so there is no giant empty space: either add <LandingFooter/> at the bottom and make the content area flex to fill, or vertically center the form card within a min-h-screen flex container. The page should look intentional top-to-bottom in both light and dark.
Keep: identity-segmented form, POST /api/contact, reply-time line, LandingNav. Constraints: dark variants, responsive, no PII added to logs. Verify: full-page screenshot (light + dark) on fresh dev server shows no dead empty band; playwright green (/contact still reachable); zero new tsc errors. Commit the file.
```

### Prompt R6 — Auth pages design-system consistency (P2)
```
Files: app/(auth)/login/page.tsx, app/(auth)/register/page.tsx (and their immediate components). Work in /Users/leeyude/Projects/Orderly.

The auth pages still use the OLD design (brown split-panel, no dark mode, different type scale) — jarring vs the new landing. Restyle them to the new design system: same Mocha tokens, typography, card/focus styles as components/landing/*, AND add dark mode support (next-themes class-based, already wired in app/layout.tsx). Keep all existing auth FUNCTIONALITY and form fields/logic intact — this is a visual/style pass only, do not change auth behavior or API calls. 
Constraints: do not break existing login/register flow; dark variants; responsive; 繁中. Verify: screenshot /login and /register (light + dark) on fresh dev server matching the landing's look; manually confirm the form still submits to the same endpoint (read the existing handlers first, don't rewire them); zero new tsc errors beyond baseline. Commit touched files.
```

### Prompt R7 — Real hero photography (P3, needs asset)
```
Blocked on asset: replace public/hero/restaurant-hero.jpg (currently a generic Unsplash stock) with real brand/owned restaurant photography once provided by the team. Update the source comment in Hero.tsx / landingData.ts. Do NOT fabricate or imply a specific real customer. If no asset is available, leave the stock image but keep the licensing comment accurate.
```

---

## D. 驗證腳本（每個 Codex prompt 收尾都跑）
```bash
cd /Users/leeyude/Projects/Orderly
# 1) tsc baseline-diff (bar = no new errors in touched files; baseline 1074)
npx tsc --noEmit > /tmp/tc.log 2>&1; grep -c 'error TS' /tmp/tc.log; grep -E 'components/landing/|app/page.tsx|app/\(marketing\)|app/\(auth\)' /tmp/tc.log
# 2) named-target grep (must be 0)
grep -rn '大樂司\|樂多多\|烤食組合\|稻舍\|demo1234\|demo.orderly.tw' app/page.tsx components/landing/ "app/(marketing)"
# 3) E2E on fresh server
(PORT=5612 npm run dev > /tmp/dev.log 2>&1 &); sleep 14
PLAYWRIGHT_BASE_URL=http://localhost:5612 npx playwright test e2e/public-pages.spec.ts --reporter=line
lsof -ti:5612 | xargs kill 2>/dev/null
# 4) visual: screenshot the changed surface (light + dark) and LOOK at it — do not claim "looks good" without the screenshot
```
