# Orderly Public Pages 重設計與優化 Implementation Plan

**Goal:** 把 Orderly 對外公開頁（landing + 新增 /contact /privacy /terms）重做成 premium 質感、資訊不空洞、每個按鈕都有對照頁，並先清掉現行 live 站的可信度地雷與測試頁殘留。

**Architecture:** 全新 `components/landing/` 乾淨元件組（每區一元件），`app/page.tsx` 改為純組合。沿用既有 `ReconciliationDemo`、`@radix-ui/react-tabs`、`lucide-react`；新增 `next-themes`（dark）+ `framer-motion`（motion）。Hero 大圖改為本地 `public/` 資產（移除 hardcoded Unsplash）。

**Tech Stack:** Next.js 14 App Router · React 18 · Tailwind v3（darkMode:'class'）· next-themes · framer-motion · radix-tabs · lucide-react · Playwright（E2E）

---

## Goals / Why

現行公開頁三個問題（皆對照原始碼驗證，commit `fd9d852`）：
1. **可信度地雷 + 違紀**：`HeroSection.tsx` L148-164 掛「已獲得以下企業信任」+ 4 個杜撰客戶名（大樂司/樂多多/烤食組合/稻舍），live 顯示中。違反 Orderly「禁捏造真實客戶名」紀律。
2. **像 staging 測試頁**：首頁混 `SystemStatus` devops 監控、公開印 demo 帳密、2 個死按鈕（登入、查看功能比較表）。
3. **空洞 + 資訊不完整**：相對競品 CocoMart（8 公開頁、公開定價、FAQ、真實 logo 牆），Orderly 只有單一 landing，買家決策路徑斷裂；hero 講品牌名不講買家利益。

完整競品分析見 `docs/0-Design/competitive-analysis-cocomart.md`。設計方向（Hero A 大橫幅 + 12 區塊）由 brainstorm 與使用者逐項確認。

## In Scope

- **P0 清地雷**（可獨立先 ship）：移除杜撰客戶名、移除 `SystemStatus` 首頁區塊、移除 demo 帳密、修 2 個死按鈕、hero 改 outcome 標題、現有數據補「示意」標。
- **新 premium landing**：`components/landing/` 12 區塊元件 + `app/page.tsx` 組合。Hero A 置中大橫幅實景圖（本地 `public/` 資產）+ 浮真實對帳卡。
- **質感層**：`next-themes` dark mode（class 策略）+ light/dark 切換鈕；`framer-motion` 動效（hero 進場、scroll reveal、count-up、對帳掃描）+ `prefers-reduced-motion` fallback；完整響應式（手機 hero/nav/pricing）。
- **新頁**：`/contact`（身分分流表單 + 法律實體 + 回覆時效）、`/privacy`、`/terms`（內容「整理中」誠實 stub）。
- **功能露出**：功能 grid 加「ERP／API 整合」卡（P0-8，放大藏起來的架構優勢）。
- **footer 擴充**：產品/方案/定價/FAQ/聯絡/隱私/條款/公司（P0-9）。
- **landing 內 FAQ 區塊**（手風琴，分餐廳/供應商，補 High 缺口但不另開頁）。
- **按鈕全對照**：每個按鈕都連真路由（/login /register /contact 等）或頁內錨點（#features #pricing #reconciliation #roles #faq），零死連結。

## Out of Scope（延後，記入 docs/0-Design/competitive-analysis-cocomart.md P1/P2）

- 獨立 `/faq`、`/about`/創辦人頁、`/restaurant-solution`、`/supplier-solution` 雙邊獨立行銷 URL（P1/P2；v1 用 landing 內區塊 + tabs 替代）。
- `/blog` 內容行銷與 SEO（P2）。
- 供應端「報價／分級客戶定價」產品功能（P1-6，屬產品非公開頁）。
- 真實具名客戶 logo 牆 / 見證（需書面授權，未取得前一律示意或匿名情境）。
- 後端 `/contact` 表單實際寄信 / CRM 串接（v1 表單先寫入 console + 回傳成功狀態的 API route stub；正式收件管道延後）。
- 既有 dashboard（`/restaurant` `/supplier` `/platform`）內頁不動。

## Complexity Budget

| 項目 | 上限 | 本 plan |
|------|------|---------|
| 新元件檔（components/landing/） | 14 | 13（Nav, Hero, ReconCard, TrustBar, PainSolution, HowItWorks, ReconciliationShowcase, RoleTabs, FeatureGrid, Pricing, FAQ, FinalCTA, Footer） |
| 新 route 頁 | 3 | 3（/contact, /privacy, /terms） |
| 新 dependency | 2 | 2（next-themes, framer-motion） |
| 新 API route | 1 | 1（/api/contact stub） |
| 修改既有檔 | 6 | app/page.tsx, app/layout.tsx, tailwind.config.ts, HeroSection.tsx（移除前過渡）, RoleSelector.tsx（移除前過渡）, NavigationHeader.tsx |
| 新 public 圖資 | 2 | hero 主圖 + og image |

超過任一上限 → 回 plan 重新 triage，不擅自擴張。

## File Structure

| 檔案 | 動作 | 職責 |
|------|------|------|
| `components/landing/LandingNav.tsx` | Create | sticky nav，logo / 產品·方案·定價·FAQ·聯絡 anchors / 登入(/login) / 預約Demo(/contact) / light-dark 切換 / 滾動縮高 / 手機漢堡 |
| `components/landing/Hero.tsx` | Create | Hero A：大圖背景 + overlay 標題「對帳，從 8 小時到 30 分鐘」+ 痛點副標 + CTA + 底部示意數據 + 浮 ReconciliationCard |
| `components/landing/ReconciliationCard.tsx` | Create | hero 浮卡：confidence bar + match/diff rows（示意），對帳掃描動效 |
| `components/landing/TrustBar.tsx` | Create | GMV/餐廳/供應商/匹配率，mono tabular + count-up，全標「示意」 |
| `components/landing/PainSolution.tsx` | Create | 人工對帳 vs Orderly before/after 雙欄 |
| `components/landing/HowItWorks.tsx` | Create | 下單→配送→驗收→對帳→結算 stepper，scroll 點亮 |
| `components/landing/ReconciliationShowcase.tsx` | Create | 招牌區，包/沿用 `ReconciliationDemo`，深色底 + 掃描/信心填充動效 |
| `components/landing/RoleTabs.tsx` | Create | 三角色 radix tabs（餐廳#ff6b35/供應商#00a896/平台#6366f1），各價值 + 該角色「了解更多」連 dashboard |
| `components/landing/FeatureGrid.tsx` | Create | 8 功能卡（含新增 ERP／API 整合卡），lucide icon |
| `components/landing/Pricing.tsx` | Create | Free/NT$3,999/NT$9,999 真實級距，逐方案列功能模組，抽成註腳，CTA→/register 或 /contact |
| `components/landing/FAQ.tsx` | Create | 手風琴，分餐廳/供應商，答上線時程/ERP相容/資安/試用綁約 |
| `components/landing/FinalCTA.tsx` | Create | 收斂 預約Demo(/contact) + 開始使用(/register) |
| `components/landing/LandingFooter.tsx` | Create | 四欄 nav + 法務(/privacy,/terms) + 聯絡(/contact) + 繁中；取代 app/page.tsx 舊 footer。**「公司」欄只連現有目標或純文字，不新增 /about（OOS）** |
| `components/landing/landingData.ts` | Create | 集中文案/示意數據/功能清單/定價/FAQ 資料（皆標示意者明標），元件只讀此檔 |
| `components/ThemeProvider.tsx` | Create | next-themes provider wrapper（class 策略、defaultTheme system） |
| `app/page.tsx` | Modify | 改為純組合 landing/* 元件；移除 SystemStatus 區塊與 import |
| `app/layout.tsx` | Modify | 包 ThemeProvider；加 JetBrains Mono 字體；suppressHydrationWarning |
| `tailwind.config.ts` | Modify | `darkMode: 'class'`；確認 mocha/accent/status token、字體 family |
| `app/(marketing)/contact/page.tsx` | Create | /contact 身分分流表單 + 法律實體 + 回覆時效 |
| `app/(marketing)/privacy/page.tsx` | Create | /privacy 誠實 stub（「整理中」+ 聯絡窗口） |
| `app/(marketing)/terms/page.tsx` | Create | /terms 誠實 stub |
| `app/api/contact/route.ts` | Create | POST 表單 stub：驗證 + console.log + 回 200（正式寄信延後，Out of Scope） |
| `components/HeroSection.tsx` | Modify→Delete | 被 landing/Hero.tsx 取代後刪除（含杜撰客戶名 L148-164） |
| `components/RoleSelector.tsx` | Modify→Delete | 被 landing/RoleTabs.tsx 取代後刪除（含 demo 帳密、死按鈕） |
| `components/HeroBackground.tsx` | Modify→Delete | 被 landing/Hero.tsx 內建本地圖背景取代；移除 hardcoded Unsplash URL |
| `components/SystemStatus.tsx` | Keep（不再被 landing 引用） | 保留檔案供 dashboard/system 頁用；僅從公開 landing 移除引用 |
| `public/hero/restaurant-hero.jpg` | Create | hero 大圖本地資產（下載自由授權來源，標來源於 landingData 註解） |
| `e2e/public-pages.spec.ts` | Create | landing 12 區塊 + 全按鈕可達 + /contact /privacy /terms 的 Playwright journey |

## 命名目標進度表（移除類目標——必須 commit 後 grep 不到）

| 命名目標（可 grep 字串） | 動詞 | 第 1 輪狀態 | 真的動的 task | 備註 |
|---|---|---|---|---|
| `大樂司` / `樂多多` / `烤食組合` / `稻舍` | delete | 真的動了 (T1) | T1（移除 HeroSection 信任區）+ T15（刪 HeroSection.tsx） | 杜撰客戶名，最高優先；T1 先中性化，T15 整檔刪除根除 |
| `restaurant@demo.orderly.tw` / `supplier@demo.orderly.tw` / `demo1234` | delete | 真的動了 (T2) | T2（移除 RoleSelector demo 帳密區）+ T16（刪 RoleSelector.tsx） | 公開頁測試帳密 |
| `images.unsplash.com/photo-1414235077428` | delete | 真的動了 (T4) | T4（Hero 改本地圖）+ T17（刪 HeroBackground.tsx） | hardcoded 外部 stock URL |
| `查看功能比較表`（無 href Button） | delete/replace | 真的動了 (T2) | T2 / T16（RoleSelector 刪除時連同消失） | 死按鈕 |
| `SystemStatus`（app/page.tsx 內 import + 區塊） | delete | 真的動了 (T3) | T3（app/page.tsx 移除 import 與區塊） | 只移除公開頁引用；元件檔保留供他處 |

**驗收範圍 PUBLIC_SCOPE**（grep 只限這些路徑，避免誤打 Out of Scope dashboard）：
`app/page.tsx components/HeroSection.tsx components/RoleSelector.tsx components/HeroBackground.tsx components/landing/ "app/(marketing)/"`

驗收：每個命名目標 commit 後 `grep -rn '<字串>' $PUBLIC_SCOPE` → 0 hit（SystemStatus 元件檔本身保留，只驗 app/page.tsx 不再 import）。2026-06-08 已把 `images.unsplash.com` provenance 註解改成 photo id，因此不再需要 carve-out。

> ⚠ 已知 OOS：杜撰名（大樂司/樂多多/烤食組合/稻舍）亦存在於 dashboard mock 資料——`components/admin/UserManagement.tsx`、`components/supplier/logistics/delivery-list.tsx`、`delivery-map.tsx`、`components/supplier/finance/invoice-manager.tsx`。**這些屬 Out of Scope（登入後 dashboard 假資料，非公開行銷背書），本 plan 不動**，列為未來獨立 mock-data 清理。grep 驗收絕不可擴及這些檔，否則違反 Out of Scope。

---

## Tasks

> 階段：**Phase 1（T1-T5）= P0 清地雷**，可獨立先驗先 ship。**Phase 2（T6-T18）= 新 landing 全量**。**Phase 3（T19-T22）= 新頁**。
> User-facing acceptance 走 TDD：E2E spec（RED）先於 impl（GREEN）。E2E 用 dev server 真實 click chain，非靜態 gate。

### Task 0: 環境準備（deps + tailwind dark + theme provider）

**Files:**
- Modify: `package.json`（加 next-themes, framer-motion）
- Modify: `tailwind.config.ts`
- Create: `components/ThemeProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] Step 1: `npm install next-themes framer-motion` —— 驗 `grep -E 'next-themes|framer-motion' package.json` 兩者出現
- [ ] Step 2: `tailwind.config.ts`（注意是 `.ts` 非 `.js`）於 config 物件頂層加 `darkMode: 'class'`；確認 `fontFamily` 含 Noto Sans TC / Inter / JetBrains Mono
- [ ] Step 3: 建 `components/ThemeProvider.tsx`：

```tsx
'use client'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] Step 4: `app/layout.tsx` 的 `<html>` 加 `suppressHydrationWarning`，`<body>` 內包 `<ThemeProvider>{children}</ThemeProvider>`
- [ ] Step 5: `npm run type-check:full` 通過（**必須 `:full`**——`type-check` 跑 `tsconfig.staging.json` 會排除 `app/**` 與 `components/**`，驗不到 landing）；`npm run dev` 起得來
- [ ] Step 6: Commit `chore(landing): add next-themes + framer-motion + tailwind dark base`

### Phase 1 — P0 清地雷（過渡式，先讓 live 乾淨；元件最終會被 Phase 2 取代）

> **交付策略註**：T1（杜撰客戶名）因 live 可信度/紀律風險，**務必最先做**，且適合單獨早 ship。T3（app/page.tsx 移除 SystemStatus）、T4（NavigationHeader 修登入 + hero 圖本地化）動的是 Phase 2 不刪的檔，照做。**T2、T5 動的 HeroSection/RoleSelector 將於 Phase 2（T15/T16）刪除**——若 Phase 1 與 Phase 2 同一 PR 一次交付，T2/T5 可略過（直接由 Phase 2 新元件取代），避免對將被刪的檔做白工；只有當要先單獨 ship Phase 1 才需 T2/T5。

### Task 1: 移除 HeroSection 杜撰客戶名（最高優先）

**Files:** Modify `components/HeroSection.tsx` L147-165

- [ ] Step 1: 刪除整段「信任標誌」區塊（L147-165，含「已獲得以下企業信任」+ 4 個客戶名 div）。無真實授權客戶前不放任何具名背書。
- [ ] Step 2: 驗 `grep -rn '大樂司\|樂多多\|烤食組合\|稻舍' $PUBLIC_SCOPE` → 0 hit（**只限 PUBLIC_SCOPE**；dashboard mock 同名屬 OOS 不動，見命名目標進度表註）
- [ ] Step 3: `npm run dev`，瀏覽 `/`，確認該區塊消失、版面無破。
- [ ] Step 4: Commit `fix(landing): remove fabricated customer names from hero (credibility/discipline)`

### Task 2: 移除 RoleSelector demo 帳密 + 死按鈕

**Files:** Modify `components/RoleSelector.tsx` L152-159, L229-236, L241-248

- [ ] Step 1: 刪 restaurant demo 帳密區（L152-159）與 supplier demo 帳密區（L229-236）
- [ ] Step 2: 死按鈕「查看功能比較表」（L243-247）改成 `<Link href="#features">` 包裹，或整段「Comparison Section」移除（擇一；優先改 href 到功能區）
- [ ] Step 3: 驗 `grep -rn 'demo.orderly.tw\|demo1234\|查看功能比較表' app/ components/` → 0 hit（或比較表已有 href）
- [ ] Step 4: Commit `fix(landing): remove demo credentials and dead button from role selector`

### Task 3: 移除首頁 SystemStatus 區塊

**Files:** Modify `app/page.tsx` L9-23（dynamic import）, L47-56（區塊）

- [ ] Step 1: 移除 `SystemStatus` 的 dynamic import（L9-23）與「系統狀態監控」`<section>`（L47-56）。`components/SystemStatus.tsx` 檔案保留。
- [ ] Step 2: 驗 `grep -n 'SystemStatus' app/page.tsx` → 0 hit
- [ ] Step 3: `npm run dev` `/` 確認區塊消失、無 import error
- [ ] Step 4: Commit `fix(landing): remove devops SystemStatus section from public landing`

### Task 4: 修死按鈕（NavigationHeader 登入）+ hero 大圖本地化

**Files:** Modify `components/NavigationHeader.tsx` L99-103, L164-167；`components/HeroBackground.tsx`；Create `public/hero/restaurant-hero.jpg`

- [ ] Step 1: NavigationHeader 桌面登入 Button（L99-103）與手機登入 Button（L164-167）改用 `<Link href="/login">` 包裹
- [ ] Step 2: 下載一張自由授權餐飲大圖到 `public/hero/restaurant-hero.jpg`（來源 URL 記在 `landingData.ts` 註解）；`HeroBackground.tsx` 的 `fallbackUrl` 改指 `/hero/restaurant-hero.jpg`，移除 `images.unsplash.com/...` hardcode
- [ ] Step 3: 驗 `grep -rn 'images.unsplash.com' components/` → 0 hit；登入按鈕點擊導 /login
- [ ] Step 4: Commit `fix(landing): wire dead login button + localize hero image`

### Task 5: hero 改 outcome 標題 + 數據標示意（過渡）

**Files:** Modify `components/HeroSection.tsx` L12-17, L42-49

- [ ] Step 1: H1（L42-49）改靜態 outcome：主標「對帳，從 8 小時到 30 分鐘」、副標點名痛點「還在用人工逐筆比對訂單、送貨單、發票嗎？」（保留品牌名為次要）
- [ ] Step 2: 停用 stats 每 3 秒自動輪播（L19-26 interval），改為全部同時呈現或靜態強調
- [ ] Step 3: stats（L12-17）每筆 label 補「（示意）」小字
- [ ] Step 4: `npm run dev` `/` 目視；Commit `fix(landing): outcome-first hero headline + label sample data`

> Phase 1 完成 = live 站地雷清除、紀律合規。可在此設 checkpoint 先 ship；Phase 2 接著做全新元件並最終刪除過渡元件。

### Phase 2 — 新 premium landing 元件組

### Task 6: E2E spec 先行（RED）

**Files:** Create `e2e/public-pages.spec.ts`

- [ ] Step 1: 寫 Playwright spec（先 RED，元件未建會 fail）——**範圍限 landing 本頁**（/contact /privacy /terms 的 route-200 由 Task 19 spec 涵蓋，因該頁 Phase 3 才建，避免 Task 14 green 卡死在尚未建立的頁）：
  - `/` 載入，hero 標題含「8 小時」「30 分鐘」
  - 12 區塊各有可見錨點 id（#features #pricing #reconciliation #roles #faq 等）
  - **頁內 nav/CTA 錨點可點且捲動到對應 section**；`/login`、`/register` 連結回 200（兩頁已存在）
  - 預約Demo / 聯絡 CTA 的 `href` 指向 `/contact`（驗 href 正確即可，**不在此 spec 斷言 200**——/contact 於 Phase 3 建，200 留 Task 19）
  - dark mode 切換鈕點擊後 `<html class="dark">` 出現
  - 無 console error
- [ ] Step 2: Run `npx playwright test e2e/public-pages.spec.ts`，Expected: FAIL（元件未建）
- [ ] Step 3: Commit `test(landing): add public-pages E2E journey (RED)`

### Task 7: landingData.ts（集中資料 + 示意標記）

**Files:** Create `components/landing/landingData.ts`

- [ ] Step 1: 定義並 export：`HERO`（標題/副標/CTA）、`TRUST_STATS`（每筆 `{value,label,sample:true}`）、`PAIN`/`SOLUTION` 條列、`STEPS`、`FEATURES`（8 筆含 ERP/API）、`ROLES`（三角色 accent+價值+href）、`PRICING`（3 方案真實級距+模組清單）、`FAQ`（分角色問答）。所有示意數值帶 `sample: true`，元件據此渲染「（示意）」。
- [ ] Step 2: `npm run type-check` 通過
- [ ] Step 3: Commit `feat(landing): centralized landing data with sample-data flags`

### Task 8-13: 逐區元件（每個一 commit；motion + dark + 響應式 + a11y）

> 每個元件 step 統一：(a) 建元件讀 landingData + dark: classes + framer-motion（含 reduced-motion fallback）+ 響應式 + focus ring；(b) `npm run type-check`；(c) `npm run dev` 目視該區；(d) commit。

- [ ] **Task 8: LandingNav.tsx** — sticky、anchors、登入/預約Demo、dark 切換鈕、滾動縮高、手機漢堡
- [ ] **Task 9: Hero.tsx + ReconciliationCard.tsx** — 大圖本地背景 + overlay 標題 + CTA + 示意數據 + 浮對帳卡（掃描動效）
- [ ] **Task 10: TrustBar.tsx + PainSolution.tsx + HowItWorks.tsx** — count-up（reduced-motion 顯終值）、before/after、stepper scroll 點亮
- [ ] **Task 11: ReconciliationShowcase.tsx** — 深色底包/沿用 `ReconciliationDemo`，信心填充 + 掃描動效
- [ ] **Task 12: RoleTabs.tsx + FeatureGrid.tsx** — radix tabs 三角色 accent；8 卡含 ERP/API 卡（lucide icon，非 emoji）
- [ ] **Task 13: Pricing.tsx + FAQ.tsx + FinalCTA.tsx + LandingFooter.tsx** — 定價逐方案模組清單；FAQ 手風琴分角色；footer 全連結

### Task 14: 組合 app/page.tsx（GREEN）

**Files:** Modify `app/page.tsx`

- [ ] Step 1: `app/page.tsx` 改為純組合：依序 render `LandingNav` → `Hero` → `TrustBar` → `PainSolution` → `HowItWorks` → `ReconciliationShowcase` → `RoleTabs` → `FeatureGrid` → `Pricing` → `FAQ` → `FinalCTA` → `LandingFooter`。移除舊 `HeroSection`/`RoleSelector`/`NavigationHeader`/`SystemStatus`/`ReconciliationDemo` 直引用（ReconciliationDemo 改由 Showcase 內部用）。
- [ ] Step 2: Run `npx playwright test e2e/public-pages.spec.ts`，Expected: PASS（此時 spec 只含 Task 6 的 landing-scope 斷言；/contact 等 route-200 於 Task 19 加入後才驗，故此處不會卡在未建頁）
- [ ] Step 3: dev server 目視全頁 + dark 切換 + 手機寬度；截圖存證
- [ ] Step 4: Commit `feat(landing): compose new premium landing in app/page.tsx`

### Task 15-17: 刪除過渡元件（命名目標根除）

- [ ] **Task 15:** 確認無引用後 `git rm components/HeroSection.tsx`；驗 `grep -rn 'HeroSection' app/ components/` 0 hit；commit
- [ ] **Task 16:** `git rm components/RoleSelector.tsx`；驗 `grep -rn 'RoleSelector\|demo1234' app/ components/` 0 hit；commit
- [ ] **Task 17:** `git rm components/HeroBackground.tsx`；驗 `grep -rn 'HeroBackground\|unsplash' app/ components/` 0 hit；commit

> 刪除前每檔先 `grep -rn '<元件名>' app/ components/` 確認 0 引用（除自身）才刪，避免斷 import。

### Task 18: dark mode 全頁複驗

- [x] Step 1: dev server 切 dark，逐區檢查對比（無白字白底）、品牌色陰影、focus ring
- [x] Step 2: Playwright 截圖 light + dark 全頁存證（2026-06-08，`/tmp/orderly-public-{light,dark}-{home,contact,privacy,terms}.png`；重點檢查 dark home/contact/privacy/terms；另新增 `e2e/dark-mode-visual.spec.ts` 可重跑 dark screenshot + h1 contrast checks）
- [x] Step 3: Commit（若有修）`fix(landing): dark reveal robustness`

> 收尾註（2026-06-08）：dark visual pass 首輪發現 home full-page screenshot 因 `whileInView` initial opacity 造成首屏外區塊大面積空白，且 `/privacy` footer 在高 viewport 下後方留空。已修成 reveal 內容初始 `opacity:1`（只保留位移/縮放動效），並把 `/privacy` 改為 flex column + `main.flex-1`。重新截圖後 dark home/contact/privacy/terms 無白字白底、無主要內容重疊、footer 位置正常。`PLAYWRIGHT_BASE_URL=http://localhost:5613 npx playwright test e2e/dark-mode-visual.spec.ts --reporter=line` → 4/4 passed。

### Phase 3 — 新頁

### Task 19: E2E for new pages（post-execution GREEN）

**Files:** Modify `e2e/public-pages.spec.ts`

- [x] Step 1: 加 spec：/contact 表單填寫+送出顯示成功；/privacy /terms 載入有標題與「整理中」說明；三頁皆回 200、有 nav/footer
- [x] Step 2: Run，Result: PASS（2026-06-08，`PLAYWRIGHT_BASE_URL=http://localhost:5612 npx playwright test e2e/public-pages.spec.ts --reporter=line` → 11/11 passed）
- [x] Step 3: Commit `test(landing): add contact privacy terms e2e`

> 收尾註（2026-06-08）：Task 19 的自動化覆蓋已補齊。`e2e/public-pages.spec.ts` 現在包含 11 tests：原 landing/auth 8 tests + `/contact` submit success、`/privacy`、`/terms` 三頁 200/標題/「整理中」/nav/footer 斷言。AC4 automation gap 已關閉。

### Task 20: /contact 頁 + /api/contact stub

**Files:** Create `app/(marketing)/contact/page.tsx`, `app/api/contact/route.ts`

- [ ] Step 1: `/api/contact` route：POST 驗證必填（身分/公司/聯絡人/email/需求）→ **僅 log `{ requestId, role, timestamp }`，禁 log email/聯絡人/需求內容等 PII** → 回 `{ ok: true }`（正式寄信 Out of Scope）
- [ ] Step 2: `/contact` 頁：身分分流（餐廳/供應商/平台）表單 + 法律實體 + Email + **回覆時效承諾**；submit 打 /api/contact 顯示成功；含 LandingNav + LandingFooter
- [ ] Step 3: type-check + dev 手動送出一次驗證成功路徑
- [ ] Step 4: Commit `feat(contact): contact page + form stub`

### Task 21: /privacy + /terms 誠實 stub

**Files:** Create `app/(marketing)/privacy/page.tsx`, `app/(marketing)/terms/page.tsx`

- [ ] Step 1: 兩頁各：標題 + 「本政策內容整理中，正式版上線前如有疑問請聯絡 <聯絡窗口>」+ LandingNav/Footer。**不寫任何捏造法律條文**。
- [ ] Step 2: type-check + dev 目視
- [ ] Step 3: Commit `feat(legal): privacy + terms honest stubs`

### Task 22: 全量驗收（GREEN + runtime evidence）

- [ ] Step 1: Run `npx playwright test e2e/public-pages.spec.ts` 全綠
- [ ] Step 2: `npm run type-check:full` + `npm run lint` 通過（**須 `:full`**——`type-check` 跑 staging config 排除 app/components，驗不到 landing；輸出存 /tmp 完整讀，不截斷）
- [ ] Step 3: dev server 真實點擊全部按鈕一遍，確認零死連結（每個按鈕導真路由或捲到錨點）
- [ ] Step 4: 命名目標總驗：`grep -rn '大樂司\|樂多多\|烤食組合\|稻舍\|demo1234\|demo.orderly.tw\|images.unsplash.com' $PUBLIC_SCOPE` → 0 hit。2026-06-08 已把 provenance 註解改成不含完整 remote domain，因此不再需要 `images.unsplash.com` carve-out。
- [ ] Step 5: Playwright 全頁截圖（light/dark/手機）存證
- [ ] Step 6: Commit `test(landing): full acceptance green + runtime evidence`

---

## Risks & Open Questions

- **R1 hero 大圖授權**：須挑真正自由授權（Unsplash/Pexels license 允許）圖，來源記註解。風險：選到受限圖。緩解：用明確 free-license 來源，檔頭註明。
- **R2 next-themes hydration 閃爍**：SSR/CSR 主題不一致閃白。緩解：`suppressHydrationWarning` + `disableTransitionOnChange` + class 策略（已含 Task 0）。
- **R3 ReconciliationDemo 與 Showcase 整合**：既有元件可能帶自身樣式/狀態。緩解：Showcase 只包裹不重寫；若樣式衝突，於 Showcase 層覆寫不改原件。
- **R4 middleware 可達性（已驗證，非阻擋）**：`middleware.ts` L76-87 只對 `/dashboard|/admin|/platform|/settings` 前綴在無 session 時 redirect 到 `/`（非 `/login`）。`/contact /privacy /terms` 不符任何保護前綴 → L89 直接放行，**不需改 middleware**。E2E（Task 19）仍驗三頁回 200 把關。
- **OQ1**：/contact 表單正式收件管道（email/CRM）未定 → v1 stub，待使用者提供收件信箱或 CRM。

## Acceptance Criteria

- AC1（清地雷，user-facing）：`/` 上 grep 不到任何杜撰客戶名 / demo 帳密 / 死按鈕 / hardcoded unsplash / SystemStatus 引用；Playwright 驗證。
- AC2（landing 完整，user-facing）：`/` 含 12 區塊，E2E 驗每區可見 + 每按鈕導真目標（錨點捲動或路由 200），零 console error。
- AC3（質感，user-facing）：dark 切換鈕作用（`<html class="dark">`）；reduced-motion 下動效顯終值；手機寬度 hero/nav/pricing 不破。
- AC4（新頁，user-facing）：/contact 送出顯示成功；/privacy /terms 回 200 有誠實說明；三頁不撞 login 牆。**執行後狀態**：頁面/API 已交付，且 Task 19 已補 Playwright 三頁斷言；2026-06-08 focused run `public-pages.spec.ts` 11/11 passed。
- AC5（紀律）：所有示意數據畫面標「（示意）」；無捏造客戶名/假精度；定價 Free/3,999/9,999 真實級距 + 抽成註腳。
- AC6（型別/lint）：**驗證標準＝相對 baseline 零新增 type error**（非 exit-0）。Repo 既有 **1074 個 pre-existing type error**（Task 0 實測，`git stash` baseline 對照確認），`type-check:full` 無法回 exit-0。每個 task 的判定：`npx tsc --noEmit` 後 `comm -13 <baseline> <current>` = 空集合（本 task 新增 0 error），且本 task 觸及的檔不在錯誤清單。`npm run lint` 對新增/修改檔綠。完整輸出不截斷。（pre-existing 1074 錯屬 Out of Scope，另案處理。）

## 紀律硬約束（implementation 全程）

1. 示意數據必明標「（示意）」。
2. 禁捏造真實客戶名 / 假精度數字；無授權客戶不放具名背書。
3. 定價用真實級距（Free / NT$3,999 / NT$9,999）+ 抽成 1.5–3% GMV 註腳。
4. 每個按鈕都要有對照頁或頁內錨點，零死連結。
5. hero 大圖須自由授權，來源記註解。
6. verify 輸出禁 tail/head 截斷（`> /tmp/out.log 2>&1` 後完整讀）。

---

## Changes Made — Round 1 (self)

- M1（撤銷）→ §Risks R4：原擬「/contact/privacy/terms 須加 middleware public 清單」經讀 `middleware.ts` L76-89 驗證為**誤判**——中介層只擋 `/dashboard|/admin|/platform|/settings`，新路徑預設放行。改寫 R4 為「不需改 middleware」，並移除原本要加的 middleware 任務步驟。
- W1 → §Tasks Phase 1 header：補「交付策略註」，釐清 T2/T5（編輯將被刪的 HeroSection/RoleSelector）在同 PR 交付時可略過，只有單獨早 ship Phase 1 才需；T1 仍務必最先做。

## Changes Made — Round 2 (codex)

3 must-fix（皆 source-verified 後套用）+ 3 warning：
- C-MF1（排序死結）→ §Task 6 Step 1 + §Task 14 Step 2：Task 6 E2E 範圍剔除 /contact/privacy/terms 的 route-200（改驗 href 正確），那三頁 route-200 留 §Task 19（Phase 3 建頁後）。解除「Task 14 green 卡在尚未建立的 /contact」死結。
- C-MF2（grep 範圍誤打 OOS）→ 新增 `$PUBLIC_SCOPE` 定義 + §Task 1/§Task 22 grep 改限 PUBLIC_SCOPE + 命名目標表加 OOS 註：杜撰名亦在 dashboard mock（UserManagement/delivery-list/delivery-map/invoice-manager），屬 Out of Scope 不動。
- C-MF3（tailwind 檔名錯）→ 全 plan `tailwind.config.js` → `tailwind.config.ts`（§Complexity Budget/§File Structure/§Task 0），改 TS config 形式。
- C-W1（type-check 漏 app/components）→ §Task 0 Step 5 / §Task 22 Step 2 / §AC6 改 `npm run type-check:full`（`type-check` 跑 staging config 排除 app/components）。
- C-W2（/api/contact PII）→ §Task 20 Step 1：僅 log `{requestId,role,timestamp}`，禁 log email/聯絡人/需求 PII。
- C-W3（footer /about OOS）→ §File Structure LandingFooter：「公司」欄連現有目標或純文字，不新增 /about。

## Changes Made — Round 3 (codex)

- C-MF3 殘留修正 → §Task 0 `**Files:**` 行還寫 `tailwind.config.js`（Round 2 漏改），改為 `tailwind.config.ts`。Codex Round 2 抓出。

---

## Execution Progress

- **Task 0 ✅ DONE**（commit `114f0a8`）：next-themes ^0.4.6 + framer-motion ^12.40.0 安裝；`tailwind.config.ts` 加 `darkMode:'class'`；`components/ThemeProvider.tsx` 建立；`app/layout.tsx` 包 ThemeProvider（在 AuthProvider 外）。controller 驗證：ThemeProvider/next-themes/framer-motion 新增 0 type error。
  - **發現**：`type-check:full` = 1074 pre-existing error（baseline）。已據此改 AC6 驗證標準為「相對 baseline 零新增」。
- **Task 1 ✅ DONE**（commit `866e5bf`）：移除 HeroSection.tsx 杜撰客戶名信任區塊；PUBLIC_SCOPE grep 0 hit；JSX 平衡確認。**live 可信度地雷已清除**。
- **Phase 1 其餘 redundancy 決議**（同 PR 全量交付）：T2(RoleSelector demo 帳密/死按鈕)、T3(app/page.tsx SystemStatus)、T5(HeroSection hero 文案) 動的檔將於 Phase 2 被刪除/重寫取代 → **同 PR 下略過**（由 Phase 2 新元件根除）。T4 拆兩半：**T4a NavigationHeader 登入 href（該檔存活，仍需做）**；T4b HeroBackground 圖本地化由 Phase 2 Hero.tsx 內建本地圖取代 → 略過。
- **Task 4a ✅ DONE**（commit `f0784d6`）：NavigationHeader 桌面+手機登入按鈕補 `<Link href="/login">`。**死登入按鈕已修**。
- **Task 7 ✅ DONE**（commit `0943f29`）：`components/landing/landingData.ts`（typed SSOT，全 14 export，sample flag、真實定價、ERP/API feature、無杜撰名）。0 新 tsc error。
- **Task 6 ✅ DONE（RED）**（commit `0943f29`）：`e2e/public-pages.spec.ts`（landing-scope，8 tests）+ `playwright.config.ts`（baseURL 5566）。
- **@playwright/test ✅ 安裝**（commit `ffd95bf`，^1.60.0 + chromium）；spec 可列 8 tests。
- ⚠ 給元件實作者：dark-toggle 需 accessible name 含 `深色/dark/主題/切換`（E2E locator 用 `getByRole('button',{name:/(dark|深色|theme|主題|切換)/i})`）→ LandingNav 切換鈕加 `aria-label="切換深色模式"`。
- **Task 8-13 ✅ DONE**（commit `5ec5089`）：13 landing 元件（workflow 並行 build）。
- **Task 14 ✅ DONE**（commit `9129969`）：app/page.tsx compose 12 區塊；E2E GREEN。
- **Task 15-17 ✅ DONE**（commit `9129969`）：刪 HeroSection/RoleSelector/HeroBackground（grep 確認無 dangling import）。
- **Task 19 ✅ DONE（post-execution GREEN）**：`e2e/public-pages.spec.ts` 已補 `/contact` submit 成功、`/privacy`、`/terms` route-200 + 標題/整理中說明 + nav/footer 斷言；2026-06-08 focused run `PLAYWRIGHT_BASE_URL=http://localhost:5612 npx playwright test e2e/public-pages.spec.ts --reporter=line` → **11/11 passed**。AC4 automation gap 已關閉。
- **Task 20-21 ✅ DONE**（commit `d2ced75`）：/contact（form + /api/contact PII-safe stub）、/privacy、/terms 誠實 stub。三頁存在，且 /api/contact 只記不含 PII 的 requestId/role/timestamp 或 validation metadata。
- **Task 22 ✅ controller 親自驗證（public-pages green）**：tsc 1072（< 1074 baseline，無 regression，新檔 0 error）；PUBLIC_SCOPE 命名目標 grep 0 命中；**Playwright public-pages 11/11 passed**（2026-06-08 自跑 :5612 與 :5613，涵蓋 landing/auth + /contact /privacy /terms）；**dark-mode visual 4/4 passed**；截圖 oracle 確認 hero+12 區塊 render、對齊 mockup、真實定價、lucide icon。
- **whileInView robustness ✅ DONE（2026-06-08）**：reveal 初始狀態不再使用 `opacity:0`，改為內容可見、只做位移/縮放；full-page dark screenshot 不再出現首屏外大面積空白。
- **Task 18 dark ✅ DONE（2026-06-08）**：toggle 經 E2E 驗證可加 `class="dark"`；dark screenshots 已檢查 `/`、`/contact`、`/privacy`、`/terms`，無白字白底或主要內容重疊。`/privacy` footer layout 已補 flex 修正。
- **狀態：Phase 1-3 核心頁面交付完成；Task 18/19 gaps、whileInView robustness、provenance rewrite 均已補齊**。目前無已知阻擋 merge 的剩餘項。PR/merge 時機 user 決定。

---

## 執行後驗證稽核 (Post-Execution Verification Audit) — 2026-06-08（plan-review ultra-research）

> 對「已執行」的本 plan，把 Execution Progress 的宣稱逐條對照 codebase 真實狀態（靜態驗證 + 手動 spot-check）。目的：修正 audit trail 失真、釐清剩餘項，**非**擴張 scope、**非**新增 feature。下列皆為「文件準確性 / 證據誠實度」修正與 honest 收尾清單。

### A. 結構性宣稱 — 全部 ✓（無漂移）

- **過渡元件真刪**：`components/HeroSection.tsx`、`components/RoleSelector.tsx`、`components/HeroBackground.tsx` 三檔皆**不存在**（`git rm` 確實生效，非只改 import）。
- **13 landing 元件齊全**：`components/landing/` 有 13 個 `.tsx`（LandingNav/Hero/ReconciliationCard/TrustBar/PainSolution/HowItWorks/ReconciliationShowcase/RoleTabs/FeatureGrid/Pricing/FAQ/FinalCTA/LandingFooter）+ `landingData.ts`，與 §Complexity Budget「13」一致。
- **app/page.tsx 純組合**：import 並依序 render 12 區塊（LandingNav→Hero→TrustBar→PainSolution→HowItWorks→ReconciliationShowcase→RoleTabs→FeatureGrid→Pricing→FAQ→FinalCTA→LandingFooter）；無 `SystemStatus`/`HeroSection`/`RoleSelector` 殘留引用。
- **新頁齊全**：`app/(marketing)/{contact,privacy,terms}/page.tsx` + `app/api/contact/route.ts` 皆存在。
- **E2E spec 存在**：`e2e/public-pages.spec.ts`（11 tests，含 /contact /privacy /terms）+ `playwright.config.ts`。

### B. 紀律硬約束 — ✓真守

- **hero 圖在地化**：`public/hero/restaurant-hero.jpg` 實體存在（602 KB）；`Hero.tsx:107` `src={HERO_IMAGE_SRC}`，`landingData.ts:20` `HERO_IMAGE_SRC = '/hero/restaurant-hero.jpg'`。**無 runtime Unsplash 熱連**。
- **/api/contact PII-safe**：route.ts 共 3 個 console 語句，**皆無 PII**——成功 `console.info`（`:76`）記 `{requestId, role, timestamp}`（註解「唯一允許落地的稽核資訊…無任何 PII」）；2 個失敗 `console.warn`（`:48` invalid JSON、`:68` validation failed）僅記 `{requestId, timestamp}` / `{requestId, timestamp, missing}`。email/聯絡人/需求只用於驗證、不入任何 log。守 C-W2。（Codex R4 修正：原寫「唯一落地 console.info」不準——尚有 2 個 PII-safe warn log。）
- **示意標記**：6 個 landing 元件含「示意」字樣；定價真實級距（`landingData.ts` 含 3,999 / 9,999 / Free）。
- **dark variants**：11 個 landing 元件含 `dark:` class。

### C. 命名目標移除 — ✓真除（純 0 hit）

| 命名目標 | PUBLIC_SCOPE grep | 判定 |
|---|---|---|
| `大樂司`/`樂多多`/`烤食組合`/`稻舍` | 0 hit（PUBLIC_SCOPE） | ✓ 真除 |
| `demo1234`/`demo.orderly.tw` | 0 hit | ✓ 真除 |
| `查看功能比較表` 死按鈕 | 0 hit（RoleSelector 已刪） | ✓ 真除 |
| `SystemStatus`（app/page.tsx import） | 0 hit | ✓ 真除（元件檔依設計保留供他處）|
| `images.unsplash.com` | 0 hit | ✓ 真除；圖已在地化，provenance 改用 photo id |

### D. audit-accuracy 修正（已套用）

§Task 22 Step 4 與 §AC1 原寫 `images.unsplash.com` grep「0 hit」，但 `Hero.tsx`、`landingData.ts` 一度各有 1 行**來源出處註解**含該字串。2026-06-08 已把來源註解改寫為 Unsplash photo id，不含完整 remote domain；PUBLIC_SCOPE grep 現在可直接要求純 0 hit，無 carve-out。

### E. Honest 收尾狀態

1. **Task 19 行銷頁 E2E gap 已關閉（2026-06-08）**：`e2e/public-pages.spec.ts` 已補 `/contact` submit→成功、`/privacy`/`/terms` 200 + 標題 +「整理中」+ nav/footer 斷言；focused run `PLAYWRIGHT_BASE_URL=http://localhost:5612 npx playwright test e2e/public-pages.spec.ts --reporter=line` → **11/11 passed**。§AC4 的 Playwright automation 已達。
2. **Task 18 深色逐區人工目視已完成（2026-06-08）**：dark screenshots 已檢查 `/`、`/contact`、`/privacy`、`/terms`；首輪發現的 reveal 空白與 `/privacy` footer layout 已修正。Focused ESLint 通過；`public-pages.spec.ts` 11/11 passed；`dark-mode-visual.spec.ts` 4/4 passed。
3. **whileInView reveal robustness 已完成（2026-06-08）**：landing/marketing reveal 初始狀態改為 `opacity:1`，避免 full-page screenshot、無 JS/預覽情境下內容不可見；保留位移/縮放動效與 reduced-motion 終態。
4. **provenance 註解可選改寫已完成（2026-06-08）**：`Hero.tsx`/`landingData.ts` 來源註解已改成 Unsplash photo id，不含完整 `images.unsplash.com` domain；PUBLIC_SCOPE grep 可純 0 hit。

### F. Positive（認可，保留）

- 過渡元件「先中性化（T1）→ 後整檔刪（T15-17）」雙段策略確實根除杜撰名，非只改 wording。
- hero 圖在地化 + provenance photo id 註解保留＝可信度與授權追溯兼顧，且不需 remote-domain grep carve-out。
- /api/contact 主動標註「唯一允許落地」欄位、明擋 PII，超出 stub 最低要求。
- E2E 走真 dev server click chain（非靜態 gate），符 runtime-validation 原則。

### G. Plan-Review Round 7（self，2026-06-08）— 獨立複驗 + 收斂

> 本輪只做文件準確度複驗，不重開 implementation scope、不擴 feature。對 §A–§F 每條宣稱重跑 grep / 檔案檢查實證。

**Verdict：APPROVED（0 fatal / 0 must-fix）。** Plan 已誠實且與 codebase 一致。

**獨立複驗證據（2026-06-08 重跑）：**
- 過渡元件 `HeroSection.tsx` / `RoleSelector.tsx` / `HeroBackground.tsx` 三檔 `ls` 皆 absent。
- `components/landing/` = 13 `.tsx` + `landingData.ts`；`components/SystemStatus.tsx` 依設計保留。
- 新頁 `app/(marketing)/{contact,privacy,terms}/page.tsx` + `app/api/contact/route.ts` 皆存在；`public/hero/restaurant-hero.jpg`（602 KB）在。
- 命名目標 PUBLIC_SCOPE grep：杜撰名 / `demo1234` / `demo.orderly.tw` / `查看功能比較表` / `app/page.tsx` 內 `SystemStatus` / `images.unsplash.com` 全 0 hit。**6/6 命名目標真除（100%），無跨輪停滯。**
- `app/api/contact/route.ts` 共 3 個 console（`:48` warn / `:68` warn / `:76` info），payload 僅 `requestId` / `role` / `timestamp` / `missing`，無 PII，與 §B 一致。
- `e2e/public-pages.spec.ts` = 11 tests，含 `/contact` submit success、`/privacy`、`/terms` 的 200/標題/整理中/nav/footer 斷言；檔頭已更新為 GREEN 現況。

**本輪新增 nice-to-have 已關閉（2026-06-08）：**
- `e2e/public-pages.spec.ts:3-10` 檔頭註解已更新為目前 GREEN / public-pages 現況，不再描述 RED 或排除 `/contact /privacy /terms`。

**結論：** 無 scope 變動、無 feature 新增。Task 18 dark visual pass、Task 19 E2E gap、whileInView robustness、provenance rewrite 均已關閉；目前無已知阻擋 merge 的剩餘項。
