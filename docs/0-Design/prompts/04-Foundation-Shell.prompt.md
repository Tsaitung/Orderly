# PROMPT 4 — Foundation + App Shell（地基與應用骨架）for 井然 Orderly ｜ 方向：Refined Mocha

> **使用方式**
> 接續你**現有的** Claude Design 對話直接貼上 — 沿用 Phase 1 鎖定的 **Refined Mocha** 與已綁定的元件庫，**不要重開設計系統**。
> 全新對話才貼文末「**附錄 A：地基速記**」。
> **任務**：產出**一個自足、ultra-high-fidelity 的 app shell + 共用元件庫 single HTML**，含 **light/dark + 三角色 accent + 密度（comfortable/compact）三組 live 切換**，外加該層 spec（**繁體中文**）。這是 Phase 2：app 所有內頁都長在這個骨架上，先把它定對。

---

## 0. 你的角色與這一步的定位

你是 **Principal Product Designer**。這一步做的是**整個應用的骨幹（shell）+ 下游頁面要重複組裝的共用元件庫**。它不是某一頁，而是**承載每一頁的容器**——sidebar、header、command palette、以及 button/table/modal 這些到處用的零件。把它做穩，後面各角色批次（auth/restaurant/supplier/platform）就能直接組裝、不會各畫各的。重點是**結構正確、狀態完整、三角色主題能用同一套語意 token 切換（不分叉系統）**。

---

## 1. 產品語境速記

**井然 Orderly** — 台灣繁中、餐飲 B2B 供應鏈，lifecycle：下單→配送→驗收→對帳→開票/結算；招牌 = **AI 對帳 8h→30min**。三角色各有 accent：餐廳 `#ff6b35`、供應商 `#00a896`、平台 `#6366f1`。原則：清晰優於美觀 · 效率優於完整 · 一致性優於個性 · 可及性優於炫技。

---

## 2. 鎖定方向：Refined Mocha（沿用，勿重開）

沿用 Refined Mocha 的 token 與 craft：refined Mocha 色盤、**真正重調的深色**、緊湊間距、motion layer。品牌錨點保留：Mocha `#a47864`、radius 4px（卡片 8px）、三色 accent、status taxonomy。**三角色主題用「語意 token overlay」切 accent，不複製整套系統**。

---

## 3. 質感升級（本頁四項槓桿**全開**，強制；都要 reduced-motion fallback）

### 3.1 動效與微互動（motion）
- Sidebar 收合/展開：寬度 + label 淡入的協調過場（200/320ms 標準 easing）。
- **⌘K command palette 開啟**：overlay fade + 面板 scale-in（從 0.98→1）；輸入即時 filter；鍵盤上下選取有 active 滑移。
- Nav active indicator 在項目間**滑移**（不是硬跳）。
- **view-as 橫幅** slide-in；通知 badge 用 **sync-pulse**；內容區換頁用 **page-enter**。
- 命名沿用地基：page-enter / reconciliation-scan / confidence-bar-fill / sync-pulse。

### 3.2 字體排印與資訊層級（typography）
- Sidebar：分組標題（caption/muted）→ nav label（body）→ active（semibold）三層清楚；長中文 label 不孤行、不硬斷。
- Header org 名稱與角色標籤層級分明；⌘K 結果用清楚的「群組標題 + 主文 + 次要 meta」排版。
- **所有計數/數字（nav badge、通知數）用 `JetBrains Mono` tabular**。

### 3.3 資料視覺化與金融數字（data-viz）
- Sidebar badge（待處理數、爭議數）= 帶 status 色的計數 pill。
- Header 通知面板 = 帶 status icon 的事件列。
- **ERP sync indicator**：連線狀態 + sync-pulse（connected=green / syncing=amber / error=red / offline=gray）。
- 元件庫示範 KPI 卡（趨勢 + accent bar）與一張 data table（兩種密度）。

### 3.4 細節打磨與深色模式（polish + dark）
- 深色 shell **真正重調**：sidebar / header / content 三層 surface 分明、raised 面用品牌色陰影 `rgba(164,120,100,0.15)`，不是反白。
- 8px spacing、4/8px radii 一致、真實 focus ring（nav、⌘K、dropdown 全可鍵盤走）。
- 三角色切換時 accent 乾淨替換（active、hover、badge、focus ring 都跟著換），版面結構不動。

---

## 4. 要交付的東西（shell 解剖 + 三角色 nav + header + ⌘K + 元件庫）

### 4.1 App shell 版面
左 sidebar + 上 header + 右 content。Sidebar 可收合（展開 / icon-only）。**響應式**：桌面固定側欄；平板可收合；手機 sidebar 變抽屜（drawer），header 留漢堡 + ⌘K + 通知 + 頭像。content 區頂部含 breadcrumb。

### 4.2 Sidebar nav（三角色主題，live 可切）
逐角色給出**真實 nav 結構**，每項配 lucide icon、active/hover/focus 態、可帶 badge：
- **餐廳 餐廳（accent `#ff6b35`）**：儀表板總覽 / 訂單管理 / 驗收管理 / 對帳 / 供應商管理 / 財務報表 / 系統設定 / 幫助中心。
- **供應商（accent `#00a896`）**：供應商總覽 / 訂單管理 / 產品目錄 / SKU / 物流配送 / 財務管理 / 客戶關係 / 即時溝通 / 數據分析 / 系統設定 / 幫助支援。
- **平台/管理（accent `#6366f1`）**：平台總覽 / 客戶管理 / 供應商管理 / SKU管理 / 類別管理 / 角色管理 / 使用者管理 / 計費管理。
Sidebar 還要有：分組標題、collapse 鈕、底部 user/org 區、**「檢視模式 / view-as」狀態提示**（當平台管理代入餐廳/供應商時）。

### 4.3 Top header
org switcher（組織下拉）、**角色 / view-as 切換器**（平台代入餐廳/供應商）、全域搜尋觸發（顯示 ⌘K 提示）、通知鈴（含下拉事件面板）、user menu（頭像下拉：個人/設定/登出）。代入模式時頂部顯示 **view-as 橫幅**（明顯但不刺眼，含「結束代入」）。

### 4.4 Command palette（⌘K，做成一等公民）
全域搜尋 + 動作：fuzzy filter、結果分群（前往頁面 / 執行動作 / 搜尋實體如訂單/供應商/SKU）、鍵盤上下 + Enter、最近項目、空狀態、無結果狀態。開啟動效見 §3.1。這是「鍵盤驅動」的核心，要 wired 可實際打字 filter。

### 4.5 共用元件庫（在 shell 脈絡內呈現，供下游組裝）
把下游每批都會用到的核心零件，用 Refined Mocha 在這個檔裡呈現一次（每個給齊狀態）：Button（solid/outline/ghost/destructive × sizes × 三 accent × loading/icon）、Input/Select/Checkbox/Switch、Badge / **Status pill（完整 status taxonomy）**、Tabs、Breadcrumb、Avatar、Tooltip、Dropdown/Menu、**KPI 卡**、**Data table（含 comfortable/compact 兩密度、sticky header、row hover/selected）**、Modal/Dialog、Drawer/Sheet、Toast、Inline alert/Banner、Skeleton、Confirmation dialog（destructive 要二次確認）。這層**不必重畫 PROMPT 1 的完整 §4 全集**——聚焦 shell + 跨頁高頻零件，當下游的 reference kit。

---

## 5. 內容與資料紀律
- 頂部固定註記 **「Sample data for design illustration only — not real records.（示意資料，僅供設計呈現）」**。
- nav badge 數字、通知事件、org/user 名稱**一律示意**（明顯佔位，如「示意：新鮮蔬果行」），**不得**捏造像真的特定公司/人名或假精度統計。
- zh-TW 用詞自然；nav label 與 button 動詞貼合既有產品語言。

---

## 6. 自足 HTML 技術需求（單檔）
- **單一 `.html`**、開即可、無 build。
- **Tailwind via CDN**，config 對齊地基 token。
- **Google Fonts** `Noto Sans TC` + `Inter` + `JetBrains Mono`；**lucide via CDN**（禁 emoji 當 icon）。
- **三組 live 切換**：light/dark、三角色 accent（餐廳/供應商/平台）、密度（comfortable/compact）。
- **⌘K 真的可用**（打字即 filter、鍵盤操作）；sidebar 可收合；通知/下拉/modal/drawer 可開關。
- 最小 vanilla JS；真實 focus ring；完整鍵盤路徑；reduced-motion 偵測。

---

## 7. 品質紅線（要 / 不要）
**要**：Linear / Stripe / Ramp / Retool 級的 app shell craft。結構清楚、狀態完整、鍵盤可全走、深色真正重調、三角色用同一套語意 token 切換。
**不要（AI-slop）**：紫/藍通用漸層、無目的 glassmorphism、emoji 當 icon、浮動陰影、不一致 radii、只有 happy path（每個 async/互動要有 hover/focus/active/loading/empty）。
**守品牌**：Mocha `#a47864`、4px radius、三色 accent、status taxonomy 必須存活。

---

## 8. 輸出格式與自我驗收
**輸出順序**：
1. **一段設計意圖**（繁中）：shell 的結構主張 + 2–3 個最高槓桿質感升級。
2. **Shell + 元件庫 spec**（繁中）：shell 解剖、三角色 nav 清單、header/⌘K/view-as 行為、每個共用元件的變體與狀態、鍵盤a11y 契約、三角色語意 overlay 怎麼運作。
3. **單一自足 HTML 檔**。若會截斷，先 spec 再清楚標記續傳 HTML。

**完成前自我驗收，逐項報 pass/fail**：
- [ ] Shell（sidebar+header+content）三角色主題用同一套語意 token live 切換，結構不分叉。
- [ ] 三角色 nav 結構完整、各項有 icon + active/hover/focus + 可帶 badge。
- [ ] Header 含 org switcher / view-as 切換 / 通知 / user menu；代入時有 view-as 橫幅。
- [ ] ⌘K 可實際打字 filter、鍵盤操作、有空/無結果狀態。
- [ ] 共用元件庫每個零件齊狀態；destructive 有二次確認；data table 有兩密度。
- [ ] 四項質感槓桿各有具體落實，全有 reduced-motion fallback。
- [ ] light/dark + 三角色 + 密度 三組切換都 live；深色真正重調。
- [ ] 計數/數字 mono tabular；focus ring、touch ≥44px、鍵盤可走。
- [ ] 示意資料明確標示；無捏造假名/假精度。
- [ ] 無 §7 AI-slop 紅旗；品牌仍可辨識。

---

## 附錄 A：地基速記（**只有開新對話才需要貼**）

- **Primary「Mocha Mousse」**：`#a47864`（ramp 50 `#faf9f7`→900 `#533e35`；hover `#8f6b56`、active `#7a5a4a`）。
- **Module accents**：restaurant `#ff6b35` · supplier `#00a896` · platform `#6366f1`。
- **Status taxonomy**：pending `#f59e0b` · processing `#3b82f6` · approved `#10b981` · disputed `#ef4444` · draft `#6b7280`。Feedback：success `#38A169` · warning `#D69E2E` · error `#E53E3E` · info `#3182CE`。ERP sync：connected=green / syncing=amber / error=red / offline=gray。
- **Type**：`Noto Sans TC`（中）· `Inter`（拉丁）· `JetBrains Mono`（金融, tabular-nums）。H1 32/700/-0.025em · H2 24/600 · H3 20/600 · H4 18/600 · Body 16 · Caption 12。
- **Shape/space**：radius base **4px**（卡片 8px、pill full、input 6px）；8px spacing scale；soft layered shadow；對帳/raised 面品牌色陰影 `rgba(164,120,100,0.15)`；z-index：dropdown 1000→sticky 1100→overlay 1300→modal 1400→popover 1500→toast 1700→tooltip 1800。
- **密度**：comfortable / compact 作為 token 層（data table 必備）。
- **A11y**：WCAG **AA**（≥4.5:1）、touch **≥44px**、完整鍵盤、可見 focus、reduced-motion、async 用 `aria-live`。
- **Stack**：Next.js 14 App Router · React 18 · Tailwind v3 + CVA · Radix UI · lucide-react · Recharts。
- **方向**：Refined Mocha（演進式：保留識別、提升 craft、真深色、緊間距、motion layer）。
