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

驗收：每個命名目標 commit 後 `grep -rn '<字串>' $PUBLIC_SCOPE` → 0 hit（SystemStatus 元件檔本身保留，只驗 app/page.tsx 不再 import）。

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

- [ ] Step 1: dev server 切 dark，逐區檢查對比（無白字白底）、品牌色陰影、focus ring
- [ ] Step 2: Playwright 截圖 light + dark 全頁存證
- [ ] Step 3: Commit（若有修）`fix(landing): dark mode polish`

### Phase 3 — 新頁

### Task 19: E2E for new pages（RED）

**Files:** Modify `e2e/public-pages.spec.ts`

- [ ] Step 1: 加 spec：/contact 表單填寫+送出顯示成功；/privacy /terms 載入有標題與「整理中」說明；三頁皆回 200、有 nav/footer
- [ ] Step 2: Run，Expected: FAIL；Commit `test(landing): add contact/privacy/terms E2E (RED)`

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
- [ ] Step 4: 命名目標總驗：`grep -rn '大樂司\|樂多多\|烤食組合\|稻舍\|demo1234\|demo.orderly.tw\|images.unsplash.com' $PUBLIC_SCOPE` → 0 hit（**只限 PUBLIC_SCOPE**；dashboard mock 同名 OOS 不計）
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
- AC4（新頁，user-facing）：/contact 送出顯示成功；/privacy /terms 回 200 有誠實說明；三頁不撞 login 牆。
- AC5（紀律）：所有示意數據畫面標「（示意）」；無捏造客戶名/假精度；定價 Free/3,999/9,999 真實級距 + 抽成註腳。
- AC6（型別/lint）：`npm run type-check:full` + `npm run lint` 綠（**須 `:full`**——`type-check` 跑 `tsconfig.staging.json` 排除 app/components；完整輸出，不截斷）。

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
