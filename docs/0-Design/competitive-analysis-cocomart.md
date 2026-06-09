# 井然 Orderly 競品分析與 Public Pages 優化計畫

> 對標競品：CocoMart 可可食集（食集資訊股份有限公司） · https://cocomart.com.tw
> 產出方式：13-agent workflow（8 頁抓取 → 4 維度比對 → 綜合計畫），2026-06-07。
> 程式碼引用已對照 repo 原始碼驗證（commit `fd9d852`，branch `refactor`）；其中 `HeroSection.tsx` L148-164 杜撰客戶名一項由主 thread 親自複驗屬實。
> 紀律對齊：示意數據必明標、不捏造真實客戶名/假精度、定價用真實級距、按鈕都要有對照頁。

> **實作狀態（2026-06-09 harvest 更新）**：**§7 P0 全部已實作**——v1 premium landing（12 區塊）+ `/contact`/`/privacy`/`/terms` 已交付，杜撰客戶名/demo 帳密/死按鈕/SystemStatus/hardcoded Unsplash 全清除（PUBLIC_SCOPE grep 0 hit 驗證）。**注意**：§6/§7/§相關檔案 的舊路徑引用（`components/HeroSection.tsx`、`RoleSelector.tsx`、`app/page.tsx` 等）為**實作前狀態**——`HeroSection`/`RoleSelector`/`HeroBackground` 已刪除、前端已搬入 `src/`（file-reorg PR #13），現行 landing 在 `src/components/landing/`（13 元件 + `landingData.ts`）。**P1/P2 仍為 backlog**。post-v1 設計 polish backlog 見 §9。實作決策脈絡見 plan packet harvest 審計軌 `docs/references/history/20260607-public-pages-redesign-harvest.md`。

## 1. 競品概覽

**CocoMart 公開頁一句話地圖（8 頁）：**

| 頁面 | URL | 一句話定位 |
|---|---|---|
| 首頁 | `/` | 雙邊漏斗總入口：痛點→解方→數據→logo→服務→聯絡，用 tab 切餐廳/供應商 |
| 餐飲採購 | `/www/purchaser` | 採購端專屬 landing，hero「您還在用 LINE 下單嗎？」直接點名現行替代方案 |
| 食材供應 | `/www/supplier` | 供應端專屬 landing，主打批發營運整合 + 曝光度 10 倍 |
| 產品介紹 | `/www/product` | 縱向產品流程敘事（媒合→報價→訂單→出貨→驗收→請款→對帳→報表）+ API/SLA/跨裝置 |
| 價格方案 | `/www/price` | 真正公開定價：三方案卡 + 年/月繳 + 誠實揭露「導入費 & API 另計」 |
| FAQ | `/www/faq` | 餐廳/供應商分頁問答，解上線時程、保密、上手難度 |
| 聯絡我們 | `/www/contact` | 身分分流 lead capture 表單 + 法律實體 + 社群 |
| 關於創辦人 | `/www/founder` | 創辦人職涯時間軸 + 服務過連鎖餐飲做信任背書 |

**它做對什麼（值得學的 5 件事）：**
1. **多頁分流 IA**：每個買家問題（我是誰、多少錢、安不安全、誰在用）都有一條獨立可掃描的 URL，而非全擠一頁。
2. **hero = 買家語言**，不是公司名（「您還在用 LINE 下單嗎？」）。
3. **公開定價**：買家不必聯絡業務就能初估成本，SaaS 篩選第一道門檻。
4. **量化數字分角色客製**（採購端一組、供應端一組），集中成獨立「數字會說話」區塊。
5. **真實具名 logo 牆**（14+ 家可辨識品牌）+ 具名創辦人背書，社會證明落地。

**它的結構性弱點（Orderly 可正面超車處）：**
- 定價頁**完全沒有 per-plan 功能對照**，買家看得到價格卻不知道買到什麼。
- 量化數字（60%/85%/10 倍）**無計算口徑、無第三方驗證**。
- 全站偏 **sales-led**，無自助試用、無互動式產品展示。
- 聯絡頁缺**回覆時效、電話、地址、營業時間**等信任訊號。

---

## 2. 四維度差距總表

| 維度 | CocoMart 強項 | Orderly 現況 | 關鍵差距 | 嚴重度 |
|---|---|---|---|---|
| 功能差異 | marketplace/曝光線、報價/分級定價引擎、ERP/API 公開賣點、跨裝置 App、導入即服務 5 步驟、雙邊對帳數字 | 招牌互動式 ReconciliationDemo（CocoMart 沒有）、驗收拍照存證、供應端 CRM；但無 marketplace、無報價引擎露出、ERP 優勢藏起來 | Orderly 把最強的 ERP/API 架構優勢藏起來；供應端缺報價/分級定價這個 B2B 批發核心功能 | High |
| 行銷強調 | 量化數字分角色、規模數據貫穿全站、真實 logo 牆、創辦人故事、口語痛點 hero | hero 主標是品牌名而非痛點；**現行頁有 4 個杜撰客戶名當真實背書**（HeroSection L148-164）；數據未分角色未標示意 | 杜撰客戶名是可信度地雷且違紀；hero 沒講買家得到什麼 | High |
| 資訊完整度 | 8 個公開頁完整 IA、公開定價、FAQ、聯絡、創辦人、雙邊 segment 頁 | 僅 1 個公開行銷頁 + auth 頁；無定價/FAQ/聯絡/關於 | 買家無法自助估算成本、解疑慮、低承諾聯絡——決策路徑斷裂 | High |
| 清晰度 | 雙邊各一條獨立 URL、hero = 場景痛點、CTA 收斂、漏斗式層級 | 全受眾擠一頁靠 RoleSelector 切；**首頁混入 devops 系統狀態監控**（page.tsx L48-56）；**公開頁印 demo 帳密**（RoleSelector L153-159, 229-236）；**死按鈕**（L244-247）；nav 連登入牆後 dashboard | 行銷頁讀起來像 staging 測試頁；核心 outcome 被輪播埋掉；死 CTA | High |

---

## 3. 功能差異深析

**Orderly 真正強項（要放大，不是補洞）：**
- **互動式 AI 對帳展示**（`components/ReconciliationDemo.tsx`）——CocoMart 對帳只有靜態截圖+數字，Orderly 可體驗，是招牌差異化，最該坐 hero C 位。
- **驗收拍照存證**（RoleSelector L42-45）與 **供應端 CRM**（L60-64）——CocoMart 公開頁沒強調。
- **ERP 整合 + API 優先架構**：`app/page.tsx` metadata L30 與功能卡 L121-125 已寫，是真實架構優勢。

**最痛的功能露出缺口：**
1. **ERP/API 優勢被低估（High）** — CocoMart 把「完整 API、串接 ERP」+ 99.9% SLA 當公開賣點打中大型客戶。Orderly 只當三卡之一、無相容清單、無 SLA 數字。
2. **缺報價/分級客戶定價引擎（High）** — 供應端 4 卡無「不同客戶不同價、即時調價、毛利可視」，B2B 批發供應商最顯眼的功能空白。
3. **缺 marketplace/曝光線（High，需商業決策）** — CocoMart 供應商主訴求「曝光 10 倍」。Orderly 若不做開放市集，**必須文案主動講清定位差異**（專注對帳深度與 ERP 整合），避免被拿「曝光」當缺點打。
4. **缺跨裝置承諾、導入即服務、FAQ 功能澄清（Medium）**。

---

## 4. 行銷強調深析

**已驗證的可信度地雷（最高優先，立即處理）：**

`components/HeroSection.tsx` L148-164 在「已獲得以下企業信任」下硬寫四個客戶名（**大樂司／樂多多／烤食組合／稻舍**），無任何示意標註。這同時是 (a) 一旦被識破信任歸零的可信度地雷，且 (b) 直接違反 Orderly 自訂「不捏造真實客戶名」紀律。比「誠實說無客戶」更傷。**現行 live 站正這樣顯示。**

**其他行銷差距：**
- **hero 講「公司是誰」而非「買家得到什麼」**：H1 = 「井然 Orderly」+ tagline（L42-49）；最強的「8h→30min」被塞進每 3 秒自動輪播的 stats（L12-23），掃不到。
- **量化數字未分角色、未標示意**：四數據（90%/95%/50%/99.5%，L12-17）全站共用、無示意標。
- **缺真實 logo 牆 / 創辦人故事 / FAQ**：CocoMart 三項說服工具 Orderly 全缺。正解是用**真實可驗證數據 + 取得授權的種子客戶**逐步替換示意內容。

**Orderly 反超點**：CocoMart 數字全無計算口徑。Orderly 若堅持「示意必標 + 真實 GMV 明標來源」，反比對手未驗證行銷數字更有公信力。

---

## 5. 資訊完整度深析（Orderly 缺哪些 public 頁）

Orderly 公開頁現況：只有 `/`（單一 landing）+ `/login` `/register` `/forgot-password`。
導覽列（`NavigationHeader.tsx` L18-23）列 首頁/餐廳/供應商/平台管理，但 `/restaurant`、`/supplier`、`/platform` **全指向登入後 app 頁**——未登入潛客撞登入牆，nav 形同虛設。

| Orderly 缺的頁 | CocoMart 對應 | 買家無法做什麼 | 嚴重度 |
|---|---|---|---|
| 公開定價頁 | `/www/price` | 無法自助估算成本 | High |
| FAQ 頁 | `/www/faq` | 上線時程/資安/相容性疑慮無處解 | High |
| 聯絡/預約 Demo 頁 | `/www/contact` | 評估中買家無低承諾入口 | High |
| 具名見證/案例 | logo 牆 | 判斷不了同業有沒有在用 | High |
| 關於/創辦人頁 | `/www/founder` | 判斷不了團隊背景（高客單尤其不利） | Medium |
| 餐廳/供應商獨立 segment 頁 | `/www/purchaser` `/www/supplier` | 缺可獨立投放的著陸頁 | Medium |
| ERP 相容清單 + 上線時程 | `/www/product` + FAQ | 評估不了技術可行性與導入週期 | Medium |

新 landing（12 區塊單頁）+ /contact/privacy/terms 已補定價/痛點/流程/三角色/社會證明多數缺口，方向正確；**仍缺**：獨立 FAQ、關於/創辦人、雙邊獨立 segment URL、ERP 相容清單、上線時程。

**反超機會**：CocoMart 定價頁缺 per-plan 功能對照。Orderly 公開定價時**逐方案列出包含模組**，一舉超車。

---

## 6. 清晰度深析（全部有原始碼行號）

1. **首頁混入內部 devops 物件（High）** — `app/page.tsx` L48-56「系統狀態監控／確保 99.5% 可用性」+ `SystemStatus` 即時健康卡。對首訪買家是噪音，像 SRE 儀表板。
2. **公開頁暴露 demo 帳密（Medium）** — `RoleSelector.tsx` L153-159、L229-236 印 `restaurant@demo.orderly.tw / demo1234`。像未上線測試頁。
3. **死 CTA（Medium）** — `RoleSelector.tsx` L244-247「查看功能比較表」無 href/onClick；`NavigationHeader.tsx` L99-103「登入」亦無 href。
4. **hero 核心 outcome 被輪播埋掉（High）**（見 §4）。
5. **雙邊無獨立 URL（High）** — 全擠 `app/page.tsx`，hero 兩按鈕（L117-144）直接導 dashboard `/restaurant` `/supplier`，是「進系統」而非「了解方案」意圖，首訪者被丟進登入牆。
6. **nav IA 與公開頁不符（Medium）**。

---

## 7. Orderly Public Pages 優化計畫

所有項目對齊紀律：示意數據明標、不捏造真實客戶名/假精度、定價真實級距、按鈕都要有對照頁。

### P0 — 立即（進 v1 premium landing，多為移除地雷 + hero 修正）

| # | 動作 | 對應差距 | 影響 | 落地處 | 工作量 |
|---|---|---|---|---|---|
| P0-1 | **移除/改寫 4 個杜撰客戶名**，拿到授權前改中性句或整段移除 | §4 可信度地雷+違紀 | 消除信任歸零風險+守紀律 | `HeroSection.tsx` L148-164 | S |
| P0-2 | hero H1 改靜態 outcome「對帳，從 8 小時到 30 分鐘」+ 痛點副標，停止核心數字自動輪播 | §4/§6 hero 埋 outcome | 一眼掃到核心價值 | `HeroSection.tsx` L42-49, L12-23 | S |
| P0-3 | 四數據逐一加「示意數據」小字 | §4 未標示意 | 守紀律 | `HeroSection.tsx` L12-17 | S |
| P0-4 | **移除首頁 SystemStatus 區塊**；可用性壓成信任條一小指標（示意） | §6-1 devops 噪音 | 去噪 | `app/page.tsx` L47-56 | S |
| P0-5 | **移除公開頁 demo 帳密**，改單一「預約 Demo」導 `/contact` | §6-2 像測試頁 | 提升專業感 | `RoleSelector.tsx` L152-159, 229-236 | S |
| P0-6 | **修死按鈕**：「查看功能比較表」給 href，「登入」補 href `/login` | §6-3 死 CTA | 按鈕都有對照頁 | `RoleSelector.tsx` L244-247；`NavigationHeader.tsx` L99-103 | S |
| P0-7 | CTA 文案改行銷意圖（「查看採購方案」「預約 Demo」），分開「進系統」與「了解方案」 | §6-5 意圖錯位 | 降跳出 | `HeroSection.tsx` L117-144；`RoleSelector.tsx` | M |
| P0-8 | 功能 grid 新增「ERP／API 整合」卡 | §3-1 ERP 優勢被埋 | 對打 CocoMart「完整 API」 | 新 landing 功能 grid | S |
| P0-9 | footer 擴充標準 SaaS footer（定價/FAQ/聯絡/隱私/條款/公司） | §5 IA 不完整 | 基本信任配置 | `app/page.tsx` L153-168 | S |

### P1 — 近期（新頁 + 區塊，補決策路徑）

| # | 動作 | 對應差距 | 影響 | 落地處 | 工作量 |
|---|---|---|---|---|---|
| P1-1 | 公開**定價區塊/頁**，真實級距 Free/3,999/9,999，**逐方案列功能模組**，明標「起始級距」「導入費另計」 | §5 無定價頁 | 自助估算成本 | landing 定價區塊 + 可選 `/pricing` | M |
| P1-2 | `/contact` 身分分流表單 + 法律實體 + Email + **回覆時效承諾** | §5 無聯絡頁 | 低承諾 lead capture | 新 route `/contact` | M |
| P1-3 | `/faq`（手風琴，分餐廳/供應商）答：上線多久、ERP 相容、資安隔離、有無試用/綁約 | §5 無 FAQ | 解臨門疑慮 | 新 route `/faq` 或 landing 區塊 | M |
| P1-4 | 修導覽列：`/restaurant` `/supplier` 改指公開 segment 頁或同頁 anchor；nav 補 產品｜方案｜定價｜FAQ｜聯絡 | §6-6/§5 | 不撞登入牆 | `NavigationHeader.tsx` L18-23 | M |
| P1-5 | 三角色 tabs 供應端分頁，收款週期數字（標示意）+ ReconciliationDemo 綁一起，雙邊各一組對帳數字 | §3/§4 | 招牌功能雙邊接得住 | 新 landing 三角色 tabs | M |
| P1-6 | 供應端補「報價／分級客戶定價」卡；未支援標「規劃中」 | §3-2 報價引擎空白 | 填供應端最大功能洞 | 功能 grid / 供應端 tab | M |
| P1-7 | 精簡 `/about` 或團隊段落（真實技術出身，主打 AI 對帳深度，不放假履歷） | §5 無關於頁 | 對沖高客單信任門檻 | 新 route `/about` 或 landing 區塊 | M |
| P1-8 | 導入即服務 3 卡（需求診斷→開戶設定→教學陪跑→專人客服） | §3-4 | 對齊 CocoMart 顧問 5 步驟 | landing 區塊 + `/contact` | S |

### P2 — Later（內容行銷 + 雙邊獨立頁 + 真實社會證明）

| # | 動作 | 對應差距 | 影響 | 落地處 | 工作量 |
|---|---|---|---|---|---|
| P2-1 | 建獨立「採購方案」「供應方案」兩條行銷 URL（非只 tabs），各走 痛點→before/after→流程→定價→CTA | §6-5 無獨立 URL | 可獨立投廣告 | `/restaurant-solution` `/supplier-solution` | L |
| P2-2 | 取得真實授權後，用具名 logo/見證替換示意；ERP 相容清單 + API 文件入口 | §4 logo 牆、§3 ERP 清單 | 逼近具名背書 | 社會證明區 + ERP 區塊 | L |
| P2-3 | blog/insight 內容（採購/對帳/供應鏈長尾關鍵字）補 SEO（兩家共同弱項，可超車） | §5 無 blog | 自然流量 | 新 route `/blog` | L |
| P2-4 | 跨裝置承諾：若僅 Web RWD 則據實寫「支援手機瀏覽器即時叫貨」，**不捏造原生 App** | §3-4 | 補比較訊號 | hero 或功能卡 | S |

---

## 8. 風險與不可照抄處

CocoMart 有、但 Orderly **絕不可照抄**：

1. **具名客戶 logo 牆不可造假**。CocoMart 有 14+ 家真實品牌；Orderly 沒有就是沒有。現行 HeroSection L148-164 四個名字疑似已踩線——P0-1 必須立即移除/標示意。拿到書面授權前一律用中性句或匿名情境見證（「連鎖火鍋品牌，12 家門市（示意）」）。
2. **規模數字（CocoMart 的真實營運規模）不可編**。Orderly 信任條只能放真實 GMV/餐廳數（明標來源）或明標「示意」的目標值，二擇一。
3. **未驗證效益百分比不可仿照密度堆疊**。CocoMart 數字全無計算口徑，是它的弱點。Orderly 的「8h→30min」「95% 準確率」須標示意或附計算基礎，並用互動式 ReconciliationDemo 讓買家自己看到。
4. **創辦人/團隊履歷不可虛構**。`/about` 只能寫真實背景；不足以背書就改主打技術深度。
5. **不必照抄純 sales-led**。Orderly 已有互動 Demo + 真實定價，走「自助評估 + 低承諾預約」混合，把對手「無法自助評估」做成自己賣點。

**一句話策略**：不模仿 CocoMart 的規模背書（學不來且不能造假），而用**真實定價透明 + per-plan 功能對照 + 互動式對帳展示 + 示意必標的可信度紀律**，正面打對手「無自助評估、數字無口徑、定價無功能對照」三個結構性弱點。

---

## 相關檔案（絕對路徑）

- `app/page.tsx`（L30 metadata、L47-56 SystemStatus、L153-168 footer）
- `components/HeroSection.tsx`（L12-23 stats、L42-49 H1、L117-144 CTA、L148-164 杜撰客戶名）
- `components/RoleSelector.tsx`（L42-70 功能卡、L152-159/229-236 demo 帳密、L244-247 死按鈕）
- `components/NavigationHeader.tsx`（L18-23 nav 指 dashboard、L99-103 登入無 href）
- `components/ReconciliationDemo.tsx`（招牌互動展示資產）

> 註：上列路徑為實作前（pre-reorg）參照；現行對應檔在 `src/components/`、`src/app/`。

---

## 9. Post-v1 設計 polish backlog（R1-R7）

> 來源：v1 landing 交付後一次「頂級挑剔」逐頁實截 critique（harvest 2026-06-09 從退役 packet `20260607-public-pages-redesign/revision-and-codex-handoff.md` 升格）。paste-ready Codex 執行 prompt 保留於 git history（同 packet）。執行前須先對現行 `src/components/landing/*` 重新核對（critique 基準為實作當時狀態）。

| ID | 項目 | 內容 | 狀態（2026-06-09 git 驗證）|
|----|------|------|------|
| R1 | Hero rework — product-as-hero | 降低 stock photo 支配感、把 `ReconciliationCard` 升為視覺主角（8h→30min 的證據）、`30 分鐘` payoff 加重、HERO_STATS 留白 | **open**（`Hero.tsx`/`ReconciliationCard.tsx` 初版後無 rework commit）|
| R2 | Motion robustness + count-up | reveal 不停在 `opacity:0`（translate-only 或提前觸發 + no-JS/SSR fallback）、`useReducedMotion` 顯終態、count-up ~0.8s | **done**（whileInView 初始 `opacity:1` 已修，commit `17bffd8`；`dark-mode-visual.spec.ts` 驗）|
| R3 | Vertical rhythm pass | section padding 一致化（py-14/16，砍死白）、heading spacing 用 8px scale、提內容密度 | **open** |
| R4 | RoleTabs mock + accent toning | 「{角色} Dashboard 縮影」空框換成 structured mini product mock；餐廳 accent `#ff6b35` 降飽和（小標記而非整顆填滿）| **open** |
| R5 | Contact 版面填滿 | `/contact` 表單下方巨大空帶 → 補 footer + flex 填滿或表單垂直置中 | **open**（部分 dark footer 修正已做，整體 layout fill 未驗）|
| R6 | Auth 頁設計系統一致（P2）| `login`/`register` 套新設計系統 token + 加 dark mode（next-themes class）；**僅視覺、不改 auth 行為/API** | **open**（`src/app/(auth)/{login,register}` 無 redesign commit）|
| R7 | 真實實拍 hero（P3，需素材）| 換掉 `public/hero/restaurant-hero.jpg`（現為 free-license Unsplash stock）為真實品牌/實拍；**禁捏造或暗示特定真實客戶** | **blocked-on-asset** |

硬約束（每項都守）：示意數據標「（示意）」、禁捏造客戶名/假精度、定價真實級距、按鈕零死連結、dark variants、繁中、相對 baseline 零新增 tsc error + Playwright `tests/e2e/public-pages.spec.ts` 全綠。
