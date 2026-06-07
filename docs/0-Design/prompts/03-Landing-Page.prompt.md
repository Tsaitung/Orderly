# PROMPT 3 — Landing Page（行銷首頁）for 井然 Orderly ｜ 方向：Refined Mocha

> **使用方式**
> 接續你**現有的** Claude Design 對話直接貼上 — 它已經有 Phase 1 鎖定的 **Refined Mocha** 方向與綁定好的元件庫，沿用即可，**不要重開設計系統**。
> 若你是在**全新對話**貼這份，先貼文末「**附錄 A：地基速記**」再貼本文，讓設計自足。
> **任務**：在已鎖定的 Refined Mocha 上，產出一個**自足、ultra-high-fidelity 的行銷首頁（landing page）single HTML**，外加該頁的 redesign spec（**繁體中文**）。這是產品的對外門面，要用它把「升級後的質感」定錨。

---

## 0. 你的角色與這一步的定位

你是 **Principal Product Designer**。這一步做的是**新的對外 surface：行銷首頁**——不是 ops 內頁，但**質感與可信度必須與產品一致**。這頁要同時做到兩件事：(1) 像 Stripe / Ramp / Mercury / Linear 的官網一樣有 premium 行銷說服力；(2) **不掉進 marketing slop**——它賣的是一個 money-critical、data-dense 的營運工具，所以「給人看真產品」勝過「給人看漂亮插圖」。畫面裡出現的產品截圖要是**真的 rendered DOM**（用你已綁定的元件庫畫），不是 stock photo、不是假 3D。

---

## 1. 這頁要賣什麼（產品語境速記）

**井然 Orderly** — 台灣市場、繁體中文、餐飲業 B2B 數位供應鏈平台，串起餐廳與供應商的完整 **order-to-settlement** 生命週期：

> 下單 → 配送 → 驗收 → 對帳 → 開票/結算

**招牌價值 = AI 輔助對帳（對帳）**：把人工對帳從 **約 8 小時壓到約 30 分鐘**。這是整頁的英雄敘事，hero 與 AI 對帳區塊都要圍繞它。

**三角色**（各有 accent，頁面「三角色價值」區塊會用到）：餐廳 餐廳 `#ff6b35`、供應商 `#00a896`、平台/管理 `#6366f1`。

**四原則（靈魂，不可違背）**：清晰優於美觀 · 效率優於完整 · 一致性優於個性 · 可及性優於炫技。
**品牌個性**：專業可信 · 智能高效 · 簡潔明了。

---

## 2. 鎖定方向：Refined Mocha（沿用，勿重開）

沿用你 Phase 1 的 **Refined Mocha**：refined 過的 Mocha 色盤、**真正重調的深色模式**（非反白）、緊湊間距、剛建立的 motion layer。Landing 用**同一套 token 與同一套 craft**——它是「把產品質感拿到對外場合展示」，不是另立風格。品牌錨點一律保留：Mocha `#a47864`、radius base 4px（卡片 8px）、三色 module accent、status taxonomy。

---

## 3. 質感升級（本頁四項槓桿**全開**，強制）

使用者明確要求「整體設計與質感升級」，四項全部拉到最高，且每一項都要**服務理解、不是裝飾**：

### 3.1 動效與微互動（motion）
- Hero 進場：標題/副標/CTA **staggered fade-up**（120/200/320ms，標準 easing）。
- **reconciliation-scan**：AI 對帳區塊要有一條「掃描匹配」掃過 match rows 的動效 + **confidence-bar-fill**（信心條填充）+ 數字 count-up（match 率、金額）。這是讓「8h→30min」**看得見**的關鍵動效。
- Lifecycle stepper（下單→…→結算）滾動進視窗時逐段點亮。
- 卡片 hover lift、sticky nav 滾動時縮高、區塊 reveal-on-scroll。
- **全部要有 `prefers-reduced-motion` fallback**（關閉時直接呈現最終狀態，count-up 顯示終值）。動效命名沿用地基：page-enter / reconciliation-scan / confidence-bar-fill / sync-pulse。

### 3.2 字體排印與資訊層級（typography）
- Hero 標題走 **editorial**：大字級、tight letter-spacing（-0.025em）、`Noto Sans TC`（中）+ `Inter`（英/數）混排節奏對齊。
- 嚴格資訊層級：一個區塊一個主張，標題→副標→證據三層分明，不堆字。
- **所有金額/百分比/指標數字用 `JetBrains Mono` + `tabular-nums` + semibold**（NT$、匹配率、GMV 都是），讓數字像金融軟體一樣可信、可掃描。
- 中文避免單字孤行（orphan），長詞不硬斷；中英混排行高給足。

### 3.3 資料視覺化與金融數字（data-viz）
- 信任條的指標卡帶 **mini sparkline / 趨勢**；AI 對帳區用 **confidence 漸層徽章 + diff 高亮**（數量差/價差用 status 色標）。
- 「金錢與數據」要看起來 **premium 且不假裝精度**：呈現對齊的 NT$ 欄、match/diff row、confidence 值，全部 tabular。
- 圖表走 Recharts 慣例的視覺語彙（line/area/donut），**color = 意義**（status/money/module），不為好看上色。

### 3.4 細節打磨與深色模式（polish + dark）
- **深色模式真正重調**：分層 surface、對帳面用品牌色陰影 `0 4px 12px rgba(164,120,100,0.15)`，不是把白底反相。
- 間距走 8px scale、radii 一致（4/8px）、真實 focus ring、optical alignment 對齊。
- Glass 只在有意義處（例如 sticky nav 半透明），不到處糊。陰影要「撐得起東西」，不漂浮。
- 產品 demo 嵌入若有載入態，用 skeleton（不是空白）。

---

## 4. 頁面結構（區塊逐一，連動效與狀態）

由上到下，每個區塊都要交代：**意圖（賣什麼）/ 主要內容元件 / 行動按鈕（primary/secondary）/ 動效 / 響應式（含手機）**。

1. **Sticky slim header / nav** — logo 井然 Orderly；nav：產品 / 解決方案 / 定價 / 資源；右側：登入（ghost）+ **預約 Demo**（primary, Mocha）。內含 **light/dark 切換**。滾動時縮高 + 加底線陰影。
2. **Hero** — 主標圍繞「**對帳，從 8 小時到 30 分鐘**」；副標一句點出 AI 自動對帳。Primary CTA「預約 Demo」+ secondary「看產品實際運作」。右/下方放**真實 rendered 的對帳工作區縮影**（live 感，confidence bar + match rows），帶 reconciliation-scan 動效。**不要** stock 照片、不要巨型行銷插畫。
3. **信任條（trust bar）** — 一排 illustrative 指標（年處理 GMV、服務餐廳數、串接供應商數、平均自動匹配率）+ 客戶 logo 列。數字用 mono tabular + count-up。**全部明確標示為示意數據**（見 §5）。
4. **痛點 → 解法** — 左：人工對帳的痛（紙本/Excel/逐筆對單/爭議往返）；右：Orderly 自動化後的樣子。用 before/after 對比，誠實、不誇張。
5. **核心流程 how-it-works** — 下單→配送→驗收→對帳→結算 的 lifecycle，做成可逐段點亮的 stepper，每段一句話 + 小圖示（lucide）。
6. **AI 對帳深度秀（招牌區塊，最高 fidelity）** — 把 hero 功能攤開：live auto-match feed、confidence indicator（高/中/低）、match/diff row（數量差、價差、未匹配，差異 delta 高亮）、一鍵核准。這區是「8h→30min」的證據，動效（scan + confidence-fill + count-up）集中在這裡。
7. **三角色價值** — 分頁（Tabs）餐廳 / 供應商 / 平台，各用自己的 accent（`#ff6b35` / `#00a896` / `#6366f1`），每頁 3 條價值主張 + 一張該角色畫面縮影。
8. **功能亮點 grid** — 次要功能卡：訂單管理、驗收拍照核對、SKU 主檔、權限矩陣、ERP 同步、即時通知、財務報表、稽核軌跡。每卡 lucide icon + 一句。
9. **定價（pricing）** — 三階：**免費版 Free / 專業版 Professional NT$3,999 / 企業版 Enterprise NT$9,999**（月費，**產品真實級距，非示意**）；交易抽成 1.5–3% GMV 以註腳呈現。專業版標「最受歡迎」。價格數字 mono tabular。
10. **社會證明 / 案例** — 一則 illustrative 見證或導入成效（**標示示意，且不得捏造像真的特定客戶名/數字**，用「示意：某北部連鎖餐飲」這類明顯佔位）。
11. **最終 CTA** — 大區塊收斂到「預約 Demo / 開始使用」，Mocha primary + 次要「聯絡業務」。
12. **Footer** — 產品/解決方案/資源/公司 四欄 nav + 法務連結 + 聯絡 + 語言（繁中）。

**響應式**：手機版 hero 直排、nav 收成漢堡、三角色 tabs 可橫滑、pricing 卡直疊；touch target ≥ 44px。

---

## 5. 內容與資料紀律（示意但**不可造假精度**）

- 頁面頂部固定一條註記：**「Sample data for design illustration only — not real records.（示意資料，僅供設計呈現）」**。
- **定價數字是產品真實級距**（Free / NT$3,999 / NT$9,999），照用。
- 指標（GMV、餐廳數、匹配率）、見證、客戶 logo **一律示意**：用明顯佔位（如「示意：1,200+ 餐廳」「示意：某連鎖餐飲集團」），**不得**寫出像真的特定公司名、不得給出假裝精準到個位數的假統計。
- zh-TW 用詞自然、白話；button 動詞明確（預約 Demo / 開始使用 / 聯絡業務）。

---

## 6. 自足 HTML 技術需求（單檔）

- **單一 `.html`**，瀏覽器開即可、無 build。
- **Tailwind via CDN**，config 對齊地基 token（Mocha ramp、accents、status、radius 4px、8px spacing）。
- **Google Fonts**：`Noto Sans TC` + `Inter` + `JetBrains Mono`。
- **lucide icons via CDN**（**禁 emoji 當 icon**）。
- **最小 vanilla JS**：nav 縮高、light/dark 切換、三角色 tabs、reveal-on-scroll、count-up、reduced-motion 偵測。
- **真 light/dark 切換**（深色真正重調）；**完整響應式**；真實 focus ring；鍵盤可操作。

---

## 7. 品質紅線（要 / 不要）

**要**：Linear / Stripe Dashboard / Ramp / Mercury 級的對外官網 craft。資訊層級優先。color = 意義。數字 tabular 對齊。深色真正重調。動效澄清狀態、不裝飾。產品畫面是真 DOM。

**不要（AI-slop 紅旗）**：紫/藍通用漸層、無目的 glassmorphism、emoji 當 icon、把 ops 工具包裝成浮誇行銷 hero、漂亮但空洞的卡片、什麼都置中、捏造精度的假數字、不一致 radii、撐不起東西的浮動陰影。

**守品牌**：Mocha `#a47864`、4px radius、三色 accent、status taxonomy 必須存活——使用者一眼還是認得這是 Orderly。

---

## 8. 輸出格式與自我驗收

**輸出順序**：
1. **一段設計意圖**（繁中）：這頁的敘事主軸 + 你做的 2–3 個最高槓桿質感升級。
2. **Landing 頁 spec**（繁中，Artifact B 的這一節）：逐區塊 redesign rationale + 元件/行動/狀態/鍵盤a11y 清單 + 套用的跨頁升級。
3. **單一自足 HTML 檔**（Artifact A）。若會被截斷，先給 spec，再用清楚標記的續傳給 HTML。

**完成前自我驗收，逐項報 pass/fail**：
- [ ] 沿用 Refined Mocha；品牌（Mocha/4px/三 accent/status）仍可辨識。
- [ ] Hero 與 AI 對帳區塊清楚傳達「8h→30min」。
- [ ] 四項質感槓桿（motion / typography / data-viz / polish+dark）每項都有具體落實，且都有 reduced-motion fallback。
- [ ] 金額/指標皆 `JetBrains Mono` tabular 對齊。
- [ ] 深色模式真正重調（非反白）。
- [ ] 響應式（含手機 hero/nav/pricing）、touch ≥44px、focus ring、鍵盤可走。
- [ ] 示意數據明確標示；定價用真實級距；**無捏造的假客戶名/假精度**。
- [ ] 無 §7 AI-slop 紅旗。

---

## 附錄 A：地基速記（**只有開新對話才需要貼**；接續舊對話可略過）

- **Primary「Mocha Mousse」**：`#a47864`（ramp 50 `#faf9f7`→900 `#533e35`；hover `#8f6b56`、active `#7a5a4a`）。
- **Module accents**：restaurant `#ff6b35` · supplier `#00a896` · platform `#6366f1`。
- **Status taxonomy**：pending `#f59e0b` · processing `#3b82f6` · approved `#10b981` · disputed `#ef4444` · draft `#6b7280`。Feedback：success `#38A169` · warning `#D69E2E` · error `#E53E3E` · info `#3182CE`。
- **Type**：`Noto Sans TC`（中）· `Inter`（拉丁）· `JetBrains Mono`（金融, tabular-nums）。H1 32/700/-0.025em · H2 24/600 · H3 20/600 · Body 16 · Caption 12。
- **Shape/space**：radius base **4px**（卡片 8px、pill full）；8px spacing scale（4/8/12/16/24/32/48/64）；soft layered shadow；對帳面品牌色陰影 `rgba(164,120,100,0.15)`。
- **A11y**：WCAG **AA**（≥4.5:1）、touch **≥44px**、完整鍵盤、可見 focus、reduced-motion、async 用 `aria-live`。
- **Stack（讓設計可被實作）**：Next.js 14 App Router · React 18 · Tailwind v3 + CVA · Radix UI · lucide-react · Recharts。
- **方向**：Refined Mocha（演進式：保留識別、提升 craft、真深色、緊間距、motion layer）。
