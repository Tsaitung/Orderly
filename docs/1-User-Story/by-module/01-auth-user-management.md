# 身份驗證與用戶管理 User Stories

> 來源: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md)
> 最後更新: 2025-12-16
> 狀態: Active

## 概述
本模組涵蓋所有與註冊、登入、身份驗證、MFA、用戶管理、角色權限相關的 User Story。

---

## P0 - MVP 必備

### US-AUTH-001: 餐廳快速註冊
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能在 5 分鐘內完成註冊，以便快速開始使用平台

**驗收標準**:
- [ ] **Line 快速註冊（主要路徑）**：一鍵授權，自動取得 Line 顯示名稱與頭像
- [ ] Line 註冊後**必須綁定 Email**（用於帳號恢復與重要通知）
- [ ] 備選：傳統 Email + 密碼註冊
- [ ] 必填：公司名稱、統編、Email、電話
- [ ] Email OTP 驗證（6 碼，10 分鐘有效）
- [ ] 註冊完成後收到歡迎信與下一步指引

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 3.4

---

### US-AUTH-002: 供應商完整註冊
**角色**: supplier_admin（供應商管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商管理者，我希望能完成完整的商業驗證註冊，以便正式加入平台供貨

**驗收標準**:
- [ ] **Line 快速註冊（主要路徑）**：一鍵授權啟動註冊流程
- [ ] Line 註冊後**必須綁定 Email**（用於帳號恢復與商業通訊）
- [ ] 備選：傳統 Email + 密碼註冊
- [ ] 支援多選產品類別
- [ ] 支援上傳多張營業證照
- [ ] 提交前可預覽所有資料
- [ ] 銀行帳戶驗證在 24 小時內完成
- [ ] 完成後可被餐廳搜尋

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 3.4

---

### US-AUTH-003: 標準登入流程（餐廳/供應商端）
**角色**: restaurant_operator（餐廳操作員）、supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳或供應商操作員，我希望能快速安全地登入系統，以便進行日常作業

**驗收標準**:
- [ ] **Line Login（主要方式）**：登入頁預設顯示「使用 Line 登入」按鈕
- [ ] 備選：Email + 密碼登入
- [ ] 登入響應時間 <2 秒
- [ ] 支援「記住我」功能（延長 Refresh Token 至 30 天）
- [ ] 登入失敗明確提示原因
- [ ] 5 次失敗後鎖定 5 分鐘
- [ ] **行動裝置優先設計**：支援 iOS/Android 行動瀏覽器完整登入體驗

**備註**: 此 User Story 適用於餐廳端與供應商端。平台端使用者請參見 US-AUTH-016。

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.1

---

### US-AUTH-004: 密碼重設
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳操作員，我希望能安全地重設忘記的密碼，以便恢復帳戶存取

**驗收標準**:
- [ ] 透過 CAPTCHA 防止濫用
- [ ] 寄送 1 小時有效的單次使用重設連結
- [ ] 重設後強制登出所有 Session
- [ ] 完成後發送通知 Email
- [ ] 每日最多 3 次重設嘗試

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 5

---

### US-AUTH-005: 帳戶驗證等級
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能透過逐步驗證解鎖更多功能，以便根據需求完成驗證

**驗收標準**:
- [ ] Level 1（Email 驗證）：可瀏覽/收藏，限 3 筆試用訂單
- [ ] Level 2（電話驗證）：可下正式單（限額）、基本分析
- [ ] Level 3（營業驗證）：完整功能、無訂單限制、所有付款方式
- [ ] 驗證進度清楚顯示

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 6

---

### US-AUTH-006: Line 主要登入與 Email 綁定
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳操作員，我希望能使用 Line 帳號一鍵登入並綁定 Email，以便快速進入系統同時確保帳戶安全

**驗收標準**:
- [ ] **Line Login 為主要登入方式**，登入頁首選顯示
- [ ] 首次 Line 登入**強制綁定 Email**
- [ ] Email 綁定流程：輸入 Email → 發送 OTP → 驗證通過 → 綁定完成
- [ ] 已綁定 Email 的 Line 帳號可直接登入
- [ ] 支援 Line 登入後自動同步頭像與顯示名稱
- [ ] Line 帳號與平台帳號一對一綁定
- [ ] 支援解除綁定（需先設定密碼作為備用登入）

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.1.1

---

### US-AUTH-019: 供應商分享邀請（餐廳加入 Orderly）
**角色**: supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商操作員，我希望能用 Line QR Code 或邀請 Email 分享加入連結給餐廳使用者，以便對方快速加入平台並開始建立合作關係

**驗收標準**:
- [ ] 可在供應端「客戶/餐廳」或「邀請合作夥伴」入口建立邀請
- [ ] 產生可分享的邀請連結/邀請碼（可設定有效期、可撤銷）
- [ ] **Line 分享（選項）**：可產生 QR Code（可下載或一鍵分享至 Line）
- [ ] **邀請 Email（選項）**：可寄送含邀請連結/碼的 Email（含預設模板）
- [ ] 可選填餐廳基本資訊（名稱、聯絡人、Email/電話）供受邀頁面預填
- [ ] 邀請狀態可追蹤（已發送/已查看/已接受/已拒絕/已過期）

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 3.5

---

### US-AUTH-020: 餐廳分享邀請（供應商加入 Orderly）
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳操作員，我希望能用 Line QR Code 或邀請 Email 分享加入連結給供應商使用者，以便對方快速加入平台並開始數位化供貨流程

**驗收標準**:
- [ ] 可在餐廳端「供應商」或「邀請合作夥伴」入口建立邀請
- [ ] 產生可分享的邀請連結/邀請碼（可設定有效期、可撤銷）
- [ ] **Line 分享（選項）**：可產生 QR Code（可下載或一鍵分享至 Line）
- [ ] **邀請 Email（選項）**：可寄送含邀請連結/碼的 Email（含預設模板）
- [ ] 可選填供應商基本資訊（公司名、聯絡人、Email/電話）供受邀頁面預填
- [ ] 邀請狀態可追蹤（已發送/已查看/已接受/已拒絕/已過期）

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 3.5

---

### US-AUTH-021: 受邀加入並確認既有/新合作關係（自動收藏）
**角色**: restaurant_operator（餐廳操作員）、supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為受邀方使用者，我希望能透過邀請連結/QR Code 完成註冊或登入並接受邀請，同時確認我們是既有合作夥伴或新合作夥伴，以便正確建立關係並在供應商/餐廳選單中快速找到對方

**驗收標準**:
- [ ] 邀請落地頁清楚顯示邀請方資訊（名稱、聯絡方式、邀請訊息、有效期）
- [ ] 若未登入：以 **Line 登入/註冊** 為主路徑，並支援 Email 備選登入
- [ ] 若已有帳號：登入後可選擇將邀請綁定至目前登入的組織（需二次確認避免誤綁）
- [ ] 受邀註冊/加入後仍走既有安全流程（Email 綁定、OTP 驗證、必要商業資訊），不得因邀請跳過
- [ ] 接受邀請時需選擇「既有合作夥伴 / 新合作夥伴」：
  - 既有：可提供對方既有客戶編號/供應商代碼或統編等識別資訊（選填）以利比對
  - 新合作：直接建立新關係
- [ ] 接受成功後自動建立雙方合作關係，並在「供應商池/餐廳池」中可互相看到對方
- [ ] 接受成功後預設將對方標記為 **Favorite 供應商/餐廳**（可取消收藏）

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 3.5

## P1 - 重要功能

### US-AUTH-007: MFA 雙因素驗證
**角色**: supplier_admin（供應商管理者）
**優先級**: P1
**狀態**: Active

**故事**: 作為供應商管理者，我希望能啟用 MFA 保護帳戶，以便提高安全性

**驗收標準**:
- [ ] 支援 SMS OTP、Email OTP、TOTP（Google Authenticator）
- [ ] supplier_admin 強制啟用 MFA
- [ ] 提供備用碼功能
- [ ] MFA 設定變更需重新驗證身份

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.2

---

### US-AUTH-008: 備選 OAuth 登入（Google）
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳操作員，我希望能使用 Google 帳號作為備選登入方式，以便在 Line 不可用時仍能登入

**驗收標準**:
- [ ] 支援 Google OAuth 作為**備選登入方式**
- [ ] 首次 Google 登入需綁定 Email（若未綁定）
- [ ] 綁定既有帳戶需使用者確認
- [ ] OAuth 登入後若帳戶啟用 MFA 仍需驗證
- [ ] Google 帳號可與 Line 帳號同時綁定同一平台帳戶

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.1.1

---

### US-AUTH-009: 使用者清單管理
**角色**: platform_admin（平台管理員）
**優先級**: P1
**狀態**: Active

**故事**: 作為平台管理員，我希望能查看和管理全平台使用者，以便維護平台運營

**驗收標準**:
- [ ] 即時搜尋（姓名/Email/電話）
- [ ] 支援角色/組織/狀態/時間篩選
- [ ] 清單載入 <1 秒，搜尋 <500ms
- [ ] 支援批量啟用/停用/角色指派
- [ ] 顯示使用者總數、活躍數、停用數

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 9.1

---

### US-AUTH-010: 組織用戶管理
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能管理組織內的用戶和角色，以便控制員工權限

**驗收標準**:
- [ ] 邀請新成員加入組織（支援 Line 邀請連結）
- [ ] 設定成員角色（admin/manager/operator）
- [ ] 停用/啟用組織成員
- [ ] 設定部門與職位
- [ ] 查看成員最後登入時間與綁定狀態（Line/Email）

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 9.5

---

### US-AUTH-011: 查看個人權限
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳操作員，我希望能查看我的權限範圍，以便了解可執行的操作

**驗收標準**:
- [ ] 顯示目前角色和有效權限
- [ ] 區分繼承權限與自訂權限
- [ ] 提供權限申請入口
- [ ] 權限變更時收到通知

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 9.5

---

## P2 - 進階功能

### US-AUTH-012: Super User 跨組織存取
**角色**: platform_admin（平台管理員）
**優先級**: P2
**狀態**: Active

**故事**: 作為平台管理員，我希望能在緊急情況下獲得跨組織存取權限，以便處理重大問題

**驗收標準**:
- [ ] Super User 為附加權限標記，非獨立角色
- [ ] 預設 24 小時後自動過期
- [ ] 啟用需 MFA + 說明原因
- [ ] 超過 1 小時需 2 位 platform_admin 核准
- [ ] 所有操作完整審計記錄

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 2.2

---

### US-AUTH-013: 進階安全設定
**角色**: platform_admin（平台管理員）
**優先級**: P2
**狀態**: Active

**故事**: 作為平台管理員，我希望能設定進階安全規則，以便保護平台安全

**驗收標準**:
- [ ] 設定 IP 白名單允許範圍
- [ ] 設定登入時間限制
- [ ] 新地點/新裝置強制 MFA
- [ ] 異常登入即時告警
- [ ] Session 併發數限制（最多 5 個）

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.3, 4.4

---

### US-AUTH-014: 行動裝置生物辨識
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P2
**狀態**: Active

**故事**: 作為餐廳操作員，我希望能使用指紋或臉部辨識登入，以便更快進入系統

**驗收標準**:
- [ ] 支援 iOS Face ID / Touch ID
- [ ] 支援 Android 指紋辨識
- [ ] 生物辨識失敗後回退至 Line Login 或密碼登入
- [ ] 可在設定中開關生物辨識

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.4

---

### US-AUTH-015: 組織層級管理
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P2
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能管理多層級組織結構，以便反映實際企業架構

**驗收標準**:
- [ ] 支援最多 5 層層級（總公司→區域→分店→部門→小組）
- [ ] 支援組織合併/分拆
- [ ] 支援人員批量調動
- [ ] 權限可按層級繼承

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 9.3

---

### US-AUTH-016: 平台用戶獨立登入
**角色**: platform_admin（平台管理員）、platform_support（平台支援）、super_admin（系統超管）
**優先級**: P0
**狀態**: Active

**故事**: 作為平台管理員，我希望能使用獨立於 Line 的安全登入方式，以便維護平台運營安全

**驗收標準**:
- [ ] **平台用戶使用獨立登入系統**，與餐廳/供應商的 Line Login 完全分離
- [ ] 登入方式：Email + 密碼 + **強制 MFA**（TOTP 或 SMS）
- [ ] **不支援** Line Login 或 Google OAuth
- [ ] 平台用戶帳號由 super_admin 或現有 platform_admin 創建
- [ ] 首次登入強制變更密碼
- [ ] 登入失敗 3 次後鎖定 15 分鐘（比一般用戶更嚴格）
- [ ] 所有登入行為記錄完整審計日誌
- [ ] 支援 IP 白名單限制登入來源（可選）

**設計原則**:
- 平台用戶需更高安全等級，不適用社群登入
- 獨立身份系統降低第三方服務依賴風險
- 審計追蹤滿足合規要求

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.5

---

### US-AUTH-017: 行動裝置 Web 登入支援
**角色**: restaurant_operator（餐廳操作員）、supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳或供應商操作員，我希望能在手機瀏覽器上完整使用系統，以便隨時處理業務

**驗收標準**:
- [ ] 響應式設計：支援 iOS Safari 與 Android Chrome 完整功能
- [ ] Line Login 在行動瀏覽器中正常運作（OAuth redirect flow）
- [ ] 觸控友善：按鈕最小 44×44px，表單適配手機鍵盤
- [ ] 支援手機原生功能：相機（拍照上傳）、GPS（定位）、電話撥打
- [ ] 離線提示：網路斷線時顯示友善提示，恢復後自動重連
- [ ] PWA 支援：可加入主畫面、支援推播通知（需用戶授權）
- [ ] 行動裝置效能：首次載入 <3 秒（4G 網路）、互動延遲 <100ms

**裝置相容性**:
- iOS 14+ (Safari)
- Android 10+ (Chrome)
- 最小螢幕寬度：320px

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.6

---

### US-AUTH-018: 原生 App 登入支援（iOS/Android）
**角色**: restaurant_operator（餐廳操作員）、supplier_operator（供應商操作員）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳或供應商操作員，我希望能使用原生 App 登入系統，以便獲得更流暢的操作體驗

**驗收標準**:
- [ ] **iOS App**：支援 iOS 14+，可在 App Store 下載
- [ ] **Android App**：支援 Android 10+，可在 Google Play 下載
- [ ] Line Login 整合：使用 Line SDK 原生登入（非 WebView）
- [ ] 生物辨識整合：支援 Face ID / Touch ID / Android 指紋解鎖
- [ ] 推播通知：訂單狀態、驗收提醒、對帳通知
- [ ] 離線模式：可查看已快取的訂單/商品資訊
- [ ] 自動更新：支援強制更新機制（重大安全修補）
- [ ] Deep Link：支援從通知或外部連結直接開啟對應頁面

**技術選型建議**:
- React Native 或 Flutter 跨平台開發
- 與 Web 端共用 API 與認證機制
- 使用 Line SDK 4.0+ for Mobile

**來源**: [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) Section 4.6

---

## 功能需求對照表

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 註冊流程（Line 優先）| ✅ | ✅ | ❌ | US-AUTH-001, US-AUTH-002 |
| 標準登入（Line 優先）| ✅ | ✅ | ❌ | US-AUTH-003 |
| 密碼重設 | ✅ | ✅ | ✅ | US-AUTH-004 |
| 驗證等級 | ✅ | ✅ | ❌ | US-AUTH-005 |
| **Line 登入 + Email 綁定** | ✅ | ✅ | ❌ | US-AUTH-006 |
| **合作夥伴邀請（供應商↔餐廳）** | ✅ | ✅ | ❌ | US-AUTH-019, US-AUTH-020, US-AUTH-021 |
| MFA 設定 | ⚙️ | ⚙️ | 🔒 | US-AUTH-007 |
| Google OAuth（備選）| ✅ | ✅ | ❌ | US-AUTH-008 |
| 用戶清單 | 👁️ | 👁️ | ✅ | US-AUTH-009 |
| 組織用戶管理 | ✅ | ✅ | ✅ | US-AUTH-010 |
| 個人權限查看 | ✅ | ✅ | ✅ | US-AUTH-011 |
| Super User | ❌ | ❌ | ✅ | US-AUTH-012 |
| 進階安全設定 | ❌ | ❌ | ✅ | US-AUTH-013 |
| 生物辨識 | ✅ | ✅ | ❌ | US-AUTH-014 |
| 組織層級 | ✅ | ✅ | ✅ | US-AUTH-015 |
| **平台獨立登入（Email+MFA）** | ❌ | ❌ | 🔒 | US-AUTH-016 |
| **行動瀏覽器支援** | ✅ | ✅ | 📱 | US-AUTH-017 |
| **原生 App（iOS/Android）** | ✅ | ✅ | ❌ | US-AUTH-018 |

> 圖例: ✅ 完整功能 | 👁️ 僅檢視 | ❌ 不適用 | 🔒 強制啟用 | ⚙️ 可選啟用 | 📱 限 Web 管理後台

---

## 三方使用者登入方式比較

| 使用者類型 | 主要登入方式 | 備選方式 | MFA 要求 | 行動裝置支援 |
|-----------|-------------|---------|---------|-------------|
| **餐廳端** (restaurant_*) | Line Login | Email + 密碼 / Google | 建議（admin 強烈建議）| Web + 原生 App |
| **供應商端** (supplier_*) | Line Login | Email + 密碼 / Google | 強制（admin）/ 建議（manager）| Web + 原生 App |
| **平台端** (platform_*, super_admin) | Email + 密碼 | 無 | 🔒 強制（TOTP）| 僅 Web（管理後台）|

> 📌 **設計原則**：平台端使用者為內部員工，安全等級最高，不使用第三方社群登入。

---

## 角色定義

| 角色代碼 | 角色名稱 | MFA 要求 | 說明 |
|---------|---------|----------|------|
| restaurant_admin | 餐廳管理者 | 建議 | 組織完全控制，財務、用戶管理 |
| restaurant_manager | 餐廳經理 | 建議 | 營運、庫存、報表 |
| restaurant_operator | 餐廳操作員 | 可選 | 下單、收貨、基礎操作 |
| supplier_admin | 供應商管理者 | 強制 | 商品、價目、用戶管理 |
| supplier_manager | 供應商經理 | 建議 | 商品、訂單、報表 |
| supplier_operator | 供應商操作員 | 可選 | 收單、出貨、基礎操作 |
| platform_admin | 平台管理員 | 強制 | 平台設定、租戶審核 |
| platform_support | 平台支援 | 強制 | 客服、營運支援 |
| super_admin | 系統超管 | 強制(TOTP) | 全系統控制 |

---

## 相關文件
- [PRD-Auth-Module.md](../../2-PRD/PRD-Auth-Module.md) - 身份驗證完整 PRD
- [06-customer-hierarchy.md](./06-customer-hierarchy.md) - 客戶層級管理
- [07-onboarding-process.md](./07-onboarding-process.md) - 導入流程
- [08-referral-system.md](./08-referral-system.md) - 推薦/邀請系統
