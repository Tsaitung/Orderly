# 身分驗證、註冊與使用者管理 PRD

## Document Information

- **Version**: 1.0
- **Date**: 2025-09-19
- **Owner**: Product Team
- **Status**: In Review（本文件已切換為中文撰寫，欄位命名維持英文）
- **Implementation Priority**: P0 - Critical
- **範圍**：整合原 Auth Module 與 User Management 需求，統一權限模型與管理功能。

---

## 0. 設計原則與技術選擇（中文版新增）
- 單一身份源：所有登入、租戶隔離、角色與權限由 `backend/user-service-fastapi` 提供；API Gateway 僅驗證與轉發授權。
- 多租戶隔離：強制 `tenant_id`；所有查詢需帶租戶條件，禁止跨租戶存取。
- 角色 + 細粒度權限：`role`（枚舉） + `permissions`（JSON/array）用於例外授權，避免僵硬 RBAC。
- 無狀態授權：短效 JWT 搭配 Refresh Token；JWT 包含 `sub`、`tenant_id`、`role`、`permissions`、`org_id` 等最小必要聲明。
- 契約單一來源：`shared/types` 定義 User/Session/Permission DTO，前後端與 Gateway 共用。
- 審計與安全：強制審計欄位（`created_at/updated_at/created_by/updated_by`）、短效 Access Token（15–30 分鐘）、可選 MFA（TOTP）、Refresh Token 可吊銷。

## 1. Executive Summary（中文重述）

### 1.1 Product Context

Orderly 需要一套兼顧易用與企業級安全的身分與使用者管理系統，支援餐廳與供應商的 B2B 註冊，並提供集中化的使用者與權限管理。此模組是所有使用者的入口，需與 API Gateway 驗證/授權流程無縫整合，並支援管理端的清單、詳情、角色/權限、組織與部門維護。

### 1.2 Business Objectives

- Enable rapid onboarding of restaurants and suppliers (< 5 minutes registration)
- Maintain 99.9% authentication service availability
- Achieve 0% unauthorized access incidents
- Support 10,000+ concurrent authenticated users
- Enable super user capabilities for critical platform operations

### 1.3 Success Metrics

| Metric                       | Target           | Measurement Method      |
| ---------------------------- | ---------------- | ----------------------- |
| Registration Completion Rate | > 85%            | Funnel analysis         |
| Average Registration Time    | < 5 minutes      | Time tracking           |
| Login Success Rate           | > 95%            | Authentication logs     |
| Password Recovery Success    | > 90%            | Recovery flow analytics |
| MFA Adoption Rate            | > 60% for admins | User settings analysis  |
| Security Incident Rate       | 0 breaches       | Security monitoring     |

> 📖 **完整 User Story**：[US-AUTH-001 至 US-AUTH-018](../1-User-Story/by-module/01-auth-user-management.md)
> - US-AUTH-016：平台用戶獨立登入
> - US-AUTH-017：行動裝置 Web 登入支援
> - US-AUTH-018：原生 App 登入支援（iOS/Android）

---

## 2. User Roles & Permissions

### 2.1 Existing Role Structure

Based on current system analysis:

- **restaurant_admin**：餐廳組織完全控制
- **restaurant_manager**：營運管理但無全域設定
- **restaurant_operator**：建立訂單、基本操作
- **supplier_admin**：供應商組織完全控制
- **supplier_manager**：商品與訂單管理
- **platform_admin**：平台級管理
- **super_admin**：系統超管（平台內部使用）

### 2.1.1 角色三類主體設計（餐廳／供應商／平台）
- 餐廳端（Restaurant）  
  - 角色：`restaurant_admin`（全域設定/財務/用戶管理）、`restaurant_manager`（營運/庫存/報表）、`restaurant_operator`（下單/收貨/基礎操作）。  
  - 範圍：僅本租戶；預設資料範圍 `org`，必要時可縮到 `self`。  
  - 安全：Admin/Manager 建議啟用 MFA；Operator 可選。
- 供應商端（Supplier）  
  - 角色：`supplier_admin`（全域設定/商品/價目/用戶管理）、`supplier_manager`（商品/訂單/報表）、`supplier_operator`（收單/出貨/基礎操作）。  
  - 範圍：僅本租戶；價目/結算等敏感操作需 Manager 以上。  
  - 安全：Admin 必須 MFA；Manager 建議；Operator 可選。
- 平台管理者（Platform）  
  - 角色：`platform_admin`（平台設定/租戶審核/跨租戶稽核）、`platform_support`（客服/營運支援）、`super_admin`（系統超管，可附加 `super_user` 標記做臨時跨租戶）。  
  - 範圍：可跨租戶，但必須完整審計；`super_admin/super_user` 操作須記錄原因與時長，強制 MFA。  
  - 安全：平台側一律強制 MFA；super_user 需 TOTP + 事前核可。

### 2.2 New Super User Permission

**Role Name**: `super_user`

**Definition**: A cross-organizational permission level that transcends standard role boundaries for critical platform operations and emergency interventions.

**Key Characteristics**:

- Not a standalone role but an additional permission flag
- Can be assigned to any existing role (e.g., platform_admin with super_user)
- Time-bound activation (expires after 24 hours by default)
- Requires multi-factor authentication for activation
- All actions are audit-logged with enhanced detail

**Use Cases**:

1. **Emergency Access**: Resolve critical system issues across organizations
2. **Data Migration**: Bulk operations during system upgrades
3. **Compliance Audits**: Access all data for regulatory requirements
4. **Security Incident Response**: Investigate and contain security breaches
5. **Critical Bug Fixes**: Apply patches that require cross-tenant access
6. **Customer Support Escalation**: Resolve complex multi-organization issues

**Permissions Matrix**:
| Permission | Standard Admin | Super User |
|------------|---------------|------------|
| View own organization data | ✓ | ✓ |
| Modify own organization | ✓ | ✓ |
| View all organizations | ✗ | ✓ |
| Modify any organization | ✗ | ✓ (with audit) |
| Access system logs | Limited | Full |
| Override business rules | ✗ | ✓ (with justification) |
| Bypass API rate limits | ✗ | ✓ |
| Emergency system shutdown | ✗ | ✓ |

### 2.3 使用者資料模型（中文新增）
- 使用者種類：餐廳（admin/manager/operator）、供應商（admin/manager/operator）、平台（admin/support）、系統超管（super_admin）。
- 核心欄位（英文命名，中文說明）：
  - `id` (UUID)：使用者唯一識別
  - `tenant_id`：租戶 ID（餐廳或供應商）
  - `role`：枚舉（restaurant_admin/manager/operator、supplier_admin/manager/operator、platform_admin/support、super_admin）
  - `permissions`：JSON/array，細粒度功能開關與例外授權
  - `email`（唯一）、`phone`、`display_name`、`avatar_url`
  - `password_hash`、`mfa_enabled`、`mfa_secret`（選填）、`last_login_at`
  - `status`（active/suspended/pending）、`locale`、`timezone`
  - 審計：`created_at`、`updated_at`、`created_by`、`updated_by`
- 契約來源：`shared/types` 定義 DTO；資料庫欄位需在 `backend/user-service-fastapi` Alembic 遷移同步。

### 2.4 認證／授權流程（中文新增）
1. 登入：User Service `/auth/login` 驗證密碼（bcrypt），簽發短效 Access JWT + Refresh Token。
2. Gateway 校驗：API Gateway 中間件驗證 JWT，並在上游請求頭附帶 `x-user-id`、`x-tenant-id`、`x-role`、`x-permissions`。
3. 租戶隔離：下游服務所有查詢強制帶 `tenant_id` 條件。
4. Refresh：`/auth/refresh` 以 Refresh Token 交換新 Access Token，可於 Redis/DB 吊銷。
5. MFA（可選）：支援 TOTP，啟用後登入需額外通過 MFA。

---

## 3. 用戶註冊流程（全中文）

### 3.1 註冊場景

- 餐廳註冊：公開註冊頁、夥伴推薦連結、業務邀請、**合作夥伴邀請（供應商/餐廳雙向）**。
- 供應商註冊：供應商入口、平台邀請、API 註冊、**合作夥伴邀請（供應商/餐廳雙向）**。

### 3.2 必填欄位（依租戶類型）

**餐廳：**
- 基本：`restaurantName`、`businessRegistrationNumber`、`email`、`phone`、`password`
- 營運：`restaurantType`、`locationsCount`、`avgMonthlyPurchaseVolume`、`currentSuppliersCount`
- 驗證：Email OTP、SMS OTP，可選 `businessLicenseUpload`

**供應商：**
- 基本：`companyName`、`businessRegistrationNumber`、`taxId`、`email`、`phone`、`password`
- 營運：`productCategories[]`、`serviceAreas`、`minOrderRequirement`、`deliveryCapabilities`、`paymentTermsOffered`、`currentCustomerCount`
- 驗證：Email OTP、SMS OTP、`businessLicenseUpload`（必填）、食安證書（選填）、銀行帳戶驗證

### 3.3 驗證規則
- Email：RFC 5322 格式、拒絕一次性網域、全租戶唯一、6 碼 OTP（10 分鐘）。
- 密碼：最少 12 碼，大小寫/數字/特殊字元各 1，不得接近 email 或組織名，不得重複最近 5 組。
- 營業資訊：統編/稅籍 checksum + 政府 API 查核；電話 E.164 + 簡訊可達性；供應商須提供營業／稅務證照。

### 3.4 用戶故事（中文）

**Line 快速註冊（主要路徑）**：
- 餐廳/供應商：一鍵 Line 授權啟動註冊 → **強制綁定 Email** → 補齊必要商業資訊 → 完成
- 優勢：降低註冊門檻、自動取得 Line 顯示名稱與頭像、簡化身份驗證

**傳統註冊（備選路徑）**：
- 餐廳：5 分鐘內完成註冊；未完成營業驗證前可瀏覽／收藏，驗證後可正式下單；收到歡迎信與下一步指引。
- 供應商：可多選品類、上傳多張證照，提交前可預覽；銀行驗證 24 小時內完成；完成後可被餐廳搜尋。

### 3.5 合作夥伴邀請導向註冊/登入（供應商 ↔ 餐廳）

本段描述「受邀方」在註冊/登入/綁定邀請時的行為與安全要求；邀請碼生成、追蹤、獎勵與關係健康度等，詳見 `docs/2-PRD/PRD-Referral-System.md` 與 `docs/2-PRD/PRD-Onboarding-Process.md`。

#### 3.5.1 邀請分享方式（發起方）

- **Line 分享（選項）**：產生邀請連結與 QR Code（可下載或一鍵分享至 Line 對話）。
- **邀請 Email（選項）**：寄送含邀請連結/邀請碼的 Email（含預設模板）。
- 邀請碼預設 30 天有效，可撤銷；需可追蹤狀態（已發送/已查看/已接受/已拒絕/已過期）。

> 權限：餐廳/供應商端至少 `*_operator` 可發起邀請；組織管理者可依內控需求收斂為僅 admin/manager（可選）。

#### 3.5.2 受邀落地頁（Invite Landing）

- 受邀者可透過邀請連結或 QR Code 開啟落地頁。
- 落地頁需清楚顯示邀請方資訊（名稱、聯絡方式、邀請訊息、有效期），並提示「接受後將建立合作關係」。
- CTA：以 **Line 登入/註冊** 為主路徑；Email + 密碼為備選。

#### 3.5.3 受邀者流程（既有帳戶/新帳戶）

- 未登入：
  - 新用戶：走既有註冊流程（Line 授權 → Email 綁定 → 補齊商業資訊 → OTP），不得因邀請跳過強制安全步驟。
  - 既有用戶：先完成登入後再接受邀請。
- 已登入：
  - 接受邀請前需顯示「將綁定到目前登入的組織」並二次確認，避免誤綁。

#### 3.5.4 既有/新合作夥伴確認（避免重複客戶/供應商）

- 接受邀請時，受邀者需選擇：
  - **既有合作夥伴**：可填對方既有客戶編號/供應商代碼/統編等識別資訊（選填）以利系統比對與合併提示。
  - **新合作夥伴**：直接建立新關係。

#### 3.5.5 建立關係後的預設行為（Favorite）

- 接受成功後自動建立供應商↔餐廳合作關係。
- 在雙方的「供應商池/餐廳池」中將對方預設標記為 **Favorite**（可取消），以利後續快速選取。

#### 3.5.6 安全與防濫用

- 邀請碼需不可枚舉（高熵），並對查詢/驗證接口做 rate limit。
- 邀請碼過期或撤銷需回傳明確錯誤並提供替代動作（重新邀請、登入後查看既有合作夥伴）。
- 邀請綁定需審計（inviter、invitee、tenant、IP、UA、結果）。

---

## 4. 登入與 MFA（中文）

### 4.1 標準登入流程
1. 輸入 email；判斷是否啟用 MFA  
2. 驗證密碼（bcrypt）  
3. 若啟用 MFA：要求 OTP（SMS/Email/TOTP）  
4. 簽發 Access + Refresh JWT；記錄審計事件  
5. 導向儀表板

### 4.1.1 Line 登入（主要方式）與 Email 綁定

**設計原則：Line Login 為平台主要登入方式**
- 登入頁預設顯示「使用 Line 登入」作為首選
- 台灣市場用戶普遍使用 Line，降低登入門檻
- Email + 密碼登入作為備選方式

**Line Login 流程**：
1. 前端導向 `/auth/oauth/line/initiate`，取得 state + redirect_uri
2. 用戶在 Line 授權頁同意
3. 回調 `/auth/oauth/line/callback`，交換 code/token，取得 Line `sub`、`displayName`、`pictureUrl`
4. **強制 Email 綁定**（首次登入）：
   - 輸入 Email → 發送 6 碼 OTP（10 分鐘有效） → 驗證通過 → 綁定完成
   - Email 全平台唯一，用於帳號恢復與重要通知
5. 已綁定 Email 的 Line 帳號可直接登入，簽發 JWT

**Email 綁定規則**：
- 首次 Line 登入**強制綁定 Email**
- Line 帳號與平台帳號一對一綁定
- Email 已存在時：需使用者確認是否綁定既有帳戶
- 支援解除 Line 綁定（需先設定密碼作為備用登入方式）
- Email 變更需 OTP 驗證

**Google OAuth（備選方式）**：
- 入口：「使用 Google 登入」作為備選
- 流程：`/auth/oauth/google/initiate` → Google 授權 → `/auth/oauth/google/callback`
- Google 帳號可與 Line 帳號同時綁定同一平台帳戶

**共通規則**：
- 安全：state/nonce 檢查、防重放
- MFA：若帳號啟用 MFA，OAuth 登入成功後仍需補 MFA
- 審計：記錄 provider、user_id、tenant_id、IP、UA、狀態（成功/失敗/綁定/拒絕）
- 新用戶：需補齊租戶資訊（餐廳/供應商）與角色，建立後才簽發 JWT

### 4.2 MFA 規則（依角色）
| 角色 | MFA 要求 | 方法 |
| --- | --- | --- |
| restaurant_operator | Optional | SMS, Email |
| restaurant_manager | Recommended | SMS, Email, TOTP |
| restaurant_admin | Recommended | SMS, TOTP |
| supplier_manager | Recommended | SMS, Email, TOTP |
| supplier_admin | Mandatory | SMS, TOTP |
| platform_admin | Mandatory | TOTP only |
| super_admin / super_user | Mandatory | TOTP + Biometric |

### 4.3 安全設定
- Rate limit：5 次失敗鎖 5 分鐘；10 次鎖 30 分鐘；15 次需人工解鎖。
- Session：Access 15 分；Refresh 7 天（使用時旋轉）；最多 5 個併發 Session；綁定 IP + UA。
- 風險事件：新地點/新裝置強制 MFA；多次失敗要求 CAPTCHA；異常時段需額外驗證。
### 4.4 登入用戶故事
- 一般使用者：支援「記住我」（延長 Refresh 30 天）、行動生物辨識、密碼管理器自動填寫。
- 平台管理者：強制 MFA、登入通知、Session 審計、可設定允許 IP 範圍。

### 4.5 平台用戶獨立登入系統

**設計原則：平台用戶與餐廳/供應商完全分離**

平台端使用者（`platform_admin`、`platform_support`、`super_admin`）為內部員工，安全等級最高，需使用獨立於第三方社群登入的認證系統。

**獨立性特徵**：
- **不支援** Line Login、Google OAuth 等社群登入
- 登入方式：Email + 密碼 + **強制 MFA**（TOTP 優先）
- 帳號由 `super_admin` 或現有 `platform_admin` 創建（非公開註冊）
- 首次登入強制變更密碼

**安全強化**：
- 登入失敗：3 次鎖定 15 分鐘（比一般用戶更嚴格）
- 所有登入行為記錄完整審計日誌
- 支援 IP 白名單限制登入來源（可選）
- Session 併發數限制：最多 3 個（比一般用戶更嚴格）

**設計理由**：
1. 降低第三方服務依賴風險（Line/Google 服務中斷不影響平台營運）
2. 滿足企業內部合規要求（審計追蹤、存取控制）
3. 防止社交工程攻擊（釣魚網站偽造 OAuth 頁面）

### 4.6 行動裝置支援

**設計原則：餐廳/供應商使用者需全平台行動存取能力**

三方使用者（餐廳、供應商）均需在行動裝置上完整操作系統，包括下單、收貨、對帳等核心業務流程。

#### 4.6.1 行動瀏覽器支援（P0 - MVP 必備）

**響應式 Web 設計**：
- 支援 iOS Safari（iOS 14+）與 Android Chrome（Android 10+）
- 觸控友善：按鈕最小 44×44px，表單適配手機鍵盤
- Line Login OAuth 在行動瀏覽器正常運作（redirect flow）
- 效能目標：首次載入 <3 秒（4G 網路）、互動延遲 <100ms

**PWA 功能**：
- 可加入主畫面（Add to Home Screen）
- 支援推播通知（需用戶授權）
- 離線提示：網路斷線時顯示友善提示，恢復後自動重連

**手機原生功能整合**：
- 相機：拍照上傳（驗收、商品照片）
- GPS：定位（送貨地址確認）
- 電話撥打：一鍵聯繫供應商/餐廳

#### 4.6.2 原生 App 支援（P1 - 重要功能）

**iOS App**：
- 支援 iOS 14+，可在 App Store 下載
- Line SDK 4.0+ 原生整合（非 WebView）
- Face ID / Touch ID 生物辨識登入

**Android App**：
- 支援 Android 10+，可在 Google Play 下載
- Line SDK 4.0+ 原生整合
- 指紋辨識登入

**原生 App 功能**：
- 推播通知：訂單狀態、驗收提醒、對帳通知
- 離線模式：可查看已快取的訂單/商品資訊
- 自動更新：支援強制更新機制（重大安全修補）
- Deep Link：支援從通知或外部連結直接開啟對應頁面

**技術選型建議**：
- React Native 或 Flutter 跨平台開發
- 與 Web 端共用 API 與認證機制
- 使用 Line SDK 4.0+ for Mobile

#### 4.6.3 平台端行動限制

平台端使用者（`platform_admin`、`platform_support`、`super_admin`）**不提供原生 App**：
- 僅支援桌面/筆電瀏覽器操作管理後台
- 行動瀏覽器可存取但不推薦（介面未優化）
- 安全考量：敏感管理操作應在受控環境執行

---

## 5. 密碼重設流程（中文）
1. 使用者點擊「忘記密碼」並通過 CAPTCHA  
2. 送出 email，附 1 小時有效的單次使用連結  
3. 進入連結後二次驗證（安全問題 / SMS OTP / 近期交易確認）  
4. 設定新密碼，強制登出所有 Session，發送完成通知  
5. 下一次登入強制 MFA

安全措施：每日最多 3 次重設嘗試；所有重設事件審計；連結為單次使用；通知含申請與完成兩封。

---

## 6. 帳戶驗證等級（中文）
- Level 1：Email 驗證完成；可瀏覽／收藏；限制 3 筆試用訂單。
- Level 2：電話驗證（5 分鐘）；可下正式單（限額）、基本分析、加入供應商網絡、付款僅 COD。
- Level 3：營業驗證（24–48 小時）；完整功能、無訂單限制、所有付款方式、API 存取、合約價。

驗證方式：Email 網域檢查、電話運營商檢驗、政府工商/稅籍查核、銀行微額驗證、社交信譽檢查；人工覆核含文件審核／視訊／實地驗證。

---

## 7. 安全需求（中文）

### 7.1 加密與 Token
- 密碼：bcrypt（成本 12）/ 未來可切換 Argon2id；傳輸 TLS 1.3；靜態 AES-256。  
- JWT：預設 HS256（可升級 RS256）；Access 15 分、Refresh 7 天（旋轉）；包含 `sub/tenant_id/org_id/org_type/role/permissions/token_version`。  
- Token 吊銷：Refresh 綁 `token_version`；黑名單/版本提升即失效。

### 7.2 安全標頭
`Strict-Transport-Security`、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`X-XSS-Protection`、`Content-Security-Policy: default-src 'self'`、`Referrer-Policy: strict-origin-when-cross-origin`。

### 7.3 審計
- 記錄：成功/失敗登入、密碼變更、MFA 事件、Session 建立/刷新/撤銷、super_user 啟用（含原因/時長）。  
- 保留：登入 90 天熱存 + 2 年冷存；super_user 7 年；失敗嘗試 30 天；Session 到期後保留 30 天。

### 7.4 合規
- GDPR/PDPA：明確同意、刪除權、資料可攜、隱私政策同意紀錄、Cookie 同意。  
- 標準：SOC2 Type II、ISO 27001、OWASP Top 10、PCI DSS（支付相關）。  

---

## 8. 整合需求（中文）

### 8.1 API Gateway
- 驗證/授權在 Gateway 執行，向下游傳遞 `x-user-id`、`x-tenant-id`、`x-role`、`x-permissions`。  
- 路由（示例）：`POST /auth/register`、`POST /auth/login`、`POST /auth/refresh`、`POST /auth/logout`、`POST /auth/verify-email`、`POST /auth/verify-phone`、`POST /auth/forgot-password`、`POST /auth/reset-password`、`PUT /auth/change-password`、`POST /auth/mfa/enable|disable|verify`、`GET /auth/session`、`DELETE /auth/sessions`、`GET /auth/oauth/{provider}/initiate`、`GET /auth/oauth/{provider}/callback`（provider: `line` / `google`）。

### 8.2 服務整合
- User Service：用戶/租戶/角色/權限管理，簽發/吊銷 Token，記錄審計。
- Notification Service：寄送 OTP/通知（Email/SMS）。
- 其他微服務：依 Gateway header 執行授權；所有查詢強制 `tenant_id` 條件。

---

## 9. 使用者管理（合併原 User Management 需求）

### 9.1 使用者清單
- 功能：即時搜尋（姓名/Email/電話）、角色/組織/狀態/時間篩選，批量啟用/停用/角色指派/密碼重設/匯出。
- 效能：清單 < 1 秒，搜尋 < 500ms，支援 10,000+ 使用者。
- 介面：表格呈現姓名、Email、組織、角色、狀態、最後登入，顯示總數/活躍數/停用數。

### 9.2 使用者詳情與編輯
- 資料結構：`profile`（email/phone/avatar/timezone/language）、`account`（status、lastLoginAt、passwordLastChanged、mfaEnabled、emailVerified）、`organizations`（orgId/type/name/roles/position/joinedAt）、`permissions`（effective/inherited/custom）。
- 編輯：基本資料、密碼重設（寄重設連結）、MFA 開關、帳號狀態、登入限制（IP 白名單/時間）、新增/移除組織關聯、部門/職位、主要組織、角色指派/自訂權限/有效期。

### 9.3 組織與部門
- 組織類型：platform/restaurant/supplier/partner，支援最多 5 層層級（總公司→區域→分店→部門→小組）。
- 關聯類型：full-time/part-time/consultant/temporary。
- 批量操作：組織合併/分拆、人員批量調動、權限批量繼承。

### 9.4 權限模型（RBAC+ABAC）
- 角色：含優先級，對應 permission list。  
- 權限：resource + action + conditions（時間/IP/資料範圍）。  
- 資料範圍：all/org/dept/self。  
- 預設角色：`platform_admin`、`platform_operator`、`platform_support`、`restaurant_admin/manager/operator`、`supplier_admin/manager/operator`、`super_admin`（可附加 `super_user` 標記）。

### 9.5 用戶故事（管理端）
- 平台管理員：查看全平台使用者、調整權限、管理組織歸屬。  
- 組織管理員：管理組織內使用者、邀請/停用、設定部門與角色。  
- 一般使用者：查看自身權限、提交權限申請。

- Welcome emails
- Verification codes
- Security alerts
- Password reset emails

#### Audit Service

- Authentication event logging
- Security incident tracking
- Compliance reporting

### 8.3 External Integrations

#### Government APIs

- Business registration verification (Taiwan)
- Tax ID validation
- Corporate registry lookup

#### Third-party Services

- SendGrid/AWS SES for emails
- Twilio for SMS
- Google Authenticator for TOTP
- MaxMind for geolocation

---

## 9. User Experience Requirements

### 9.1 Design Principles

#### Simplicity First

- Single-page registration when possible
- Auto-fill from business registry
- Progressive disclosure of optional fields
- Clear error messages with solutions

#### Mobile Optimization

- Responsive design for all screens
- Touch-friendly inputs (44px minimum)
- Biometric authentication support
- App-specific optimizations

### 9.2 Accessibility Requirements

- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation support
- High contrast mode
- Multi-language support (Traditional Chinese, English)

### 9.3 Performance Requirements

- Page load: < 2 seconds
- Form submission: < 1 second
- API response: < 500ms
- Error recovery: Immediate
- Auto-save: Every 30 seconds

---

## 10. Success Metrics & KPIs

### 10.1 Primary Metrics

#### Conversion Metrics

| Metric                        | Target | Alert Threshold |
| ----------------------------- | ------ | --------------- |
| Registration Start → Complete | > 85%  | < 70%           |
| Email Verification Rate       | > 95%  | < 85%           |
| Business Verification Rate    | > 80%  | < 60%           |
| First Login Success           | > 90%  | < 80%           |

#### Security Metrics

| Metric                    | Target | Alert Threshold |
| ------------------------- | ------ | --------------- |
| Failed Login Rate         | < 5%   | > 10%           |
| Account Takeover Attempts | 0      | Any detected    |
| MFA Adoption (Admins)     | 100%   | < 100%          |
| Password Reset Success    | > 90%  | < 80%           |

#### Performance Metrics

| Metric                        | Target | Alert Threshold |
| ----------------------------- | ------ | --------------- |
| Authentication Service Uptime | 99.99% | < 99.9%         |
| Average Login Time            | < 2s   | > 5s            |
| Token Refresh Success         | > 99%  | < 95%           |
| Session Consistency           | 100%   | < 99.9%         |

### 10.2 Secondary Metrics

#### User Behavior

- Average sessions per user per day
- Session duration distribution
- Device type breakdown
- Login method preferences
- Password reset frequency

#### Business Impact

- Time to first transaction after registration
- User retention after registration (D1, D7, D30)
- Support tickets related to authentication
- Registration source attribution
- Referral program effectiveness

---

## 11. Implementation Roadmap

### 11.1 Phase 1: Foundation (Week 1-2)

- [ ] Database schema updates for super_user flag
- [ ] Basic registration API endpoints
- [ ] Password hashing implementation
- [ ] JWT token generation and validation
- [ ] Email verification flow

### 11.2 Phase 2: Core Features (Week 3-4)

- [ ] Complete registration flows (restaurant & supplier)
- [ ] Login with rate limiting
- [ ] Password recovery flow
- [ ] Session management
- [ ] Basic audit logging

### 11.3 Phase 3: Security Enhancement (Week 5-6)

- [ ] MFA implementation (SMS, TOTP)
- [ ] Super user permission system
- [ ] Advanced threat detection
- [ ] Security headers and CSP
- [ ] Penetration testing

### 11.4 Phase 4: Business Verification (Week 7-8)

- [ ] Government API integration
- [ ] Document upload and storage
- [ ] Manual verification queue
- [ ] Verification status management
- [ ] Progressive access control

### 11.5 Phase 5: Polish & Optimization (Week 9-10)

- [ ] Performance optimization
- [ ] Mobile app integration
- [ ] Analytics implementation
- [ ] A/B testing setup
- [ ] Documentation and training

---

## 12. Risk Analysis & Mitigation

### 12.1 Technical Risks

| Risk                            | Probability | Impact   | Mitigation                                |
| ------------------------------- | ----------- | -------- | ----------------------------------------- |
| Authentication service downtime | Low         | Critical | Multi-region deployment, circuit breakers |
| Token theft/replay attacks      | Medium      | High     | Short-lived tokens, binding to IP/UA      |
| Password database breach        | Low         | Critical | Argon2id hashing, encryption at rest      |
| MFA bypass vulnerability        | Low         | High     | Regular security audits, bug bounty       |
| Session hijacking               | Medium      | High     | Secure cookies, session binding           |

### 12.2 Business Risks

| Risk                               | Probability | Impact   | Mitigation                                 |
| ---------------------------------- | ----------- | -------- | ------------------------------------------ |
| Low registration completion        | Medium      | High     | Simplify flow, provide assistance          |
| Fake business registrations        | High        | Medium   | Verification requirements, fraud detection |
| User abandonment due to complexity | Medium      | High     | Progressive disclosure, save progress      |
| Compliance violations              | Low         | Critical | Regular audits, automated checks           |

### 12.3 Operational Risks

| Risk                        | Probability | Impact   | Mitigation                                   |
| --------------------------- | ----------- | -------- | -------------------------------------------- |
| Verification backlog        | Medium      | Medium   | Automation, scaling team                     |
| Customer support overload   | High        | Medium   | Self-service options, clear documentation    |
| Third-party service failure | Medium      | High     | Multiple providers, fallback options         |
| Super user abuse            | Low         | Critical | Time limits, audit trails, approval workflow |

---

## 13. Testing Strategy

### 13.1 Test Scenarios

#### Functional Testing

- Happy path registration (all user types)
- Login with various MFA combinations
- Password recovery edge cases
- Session management across devices
- Permission verification for all roles
- Super user activation/deactivation

#### Security Testing

- SQL injection attempts
- XSS vulnerability scanning
- CSRF token validation
- Rate limiting effectiveness
- Token expiration handling
- Privilege escalation attempts

#### Performance Testing

- 10,000 concurrent login attempts
- Registration under load
- Token refresh storms
- Database connection pooling
- Cache effectiveness
- API gateway throughput

### 13.2 User Acceptance Criteria

All flows must pass the following criteria:

- Complete in specified time limits
- Work on all supported browsers/devices
- Provide clear feedback at each step
- Gracefully handle errors
- Maintain security standards
- Meet accessibility requirements

---

## 14. Dependencies

### 14.1 Technical Dependencies

- PostgreSQL database with SQLAlchemy ORM + Alembic
- Redis for session storage
- API Gateway for routing
- Notification service for emails/SMS
- Object storage for document uploads
- Government APIs for verification

### 14.2 Organizational Dependencies

- Legal review of terms of service
- Compliance team approval
- Security team penetration testing
- Operations team for manual verification
- Customer success for onboarding materials
- Marketing for communication templates

---

## 15. Open Questions & Decisions Needed

1. **Business Verification**: Should we require business verification before allowing real transactions, or allow limited transactions while pending?
   - **Recommendation**: Allow limited transactions (e.g., NT$50,000/month) while pending verification

2. **MFA Enforcement**: Should we enforce MFA for all users or make it optional for operators?
   - **Recommendation**: Mandatory for admins, optional but incentivized for others (e.g., 0.1% discount)

3. **Super User Approval**: Should super user activation require approval from multiple platform admins?
   - **Recommendation**: Yes, require 2 platform admins for activation lasting >1 hour

4. **Password Policy**: Should we enforce password rotation every 90 days?
   - **Recommendation**: No forced rotation, but prompt users with weak passwords

5. **Session Timeout**: What should be the idle timeout for different user roles?
   - **Recommendation**: 30 minutes for operators, 15 minutes for admins, 5 minutes for super users

---

## 16. Appendices

### Appendix A: API Request/Response Examples

#### Registration Request

```json
POST /api/auth/register
{
  "organizationType": "restaurant",
  "organizationName": "Happy Kitchen",
  "businessRegistration": "12345678",
  "email": "admin@happykitchen.com",
  "phone": "+886912345678",
  "password": "SecureP@ssw0rd123!",
  "acceptTerms": true,
  "marketingConsent": false
}
```

#### Login Response

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "2a0e8f3d-5c71-4b8a-9e4f-8b5c6d7e8f9g",
    "expiresIn": 900,
    "user": {
      "id": "usr_abc123",
      "email": "admin@happykitchen.com",
      "role": "restaurant_admin",
      "organizationId": "org_xyz789",
      "mfaEnabled": true,
      "verificationLevel": 3
    }
  }
}
```

### Appendix B: Database Schema Changes

```sql
-- Add super_user flag to users table
ALTER TABLE users
ADD COLUMN is_super_user BOOLEAN DEFAULT FALSE,
ADD COLUMN super_user_expires_at TIMESTAMP NULL,
ADD COLUMN super_user_activated_by VARCHAR(255) NULL,
ADD COLUMN super_user_reason TEXT NULL;

-- Add MFA settings
ALTER TABLE users
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_method VARCHAR(20) NULL,
ADD COLUMN mfa_secret TEXT NULL,
ADD COLUMN mfa_backup_codes TEXT[] NULL;

-- Add verification fields
ALTER TABLE organizations
ADD COLUMN verification_level INTEGER DEFAULT 1,
ADD COLUMN verified_at TIMESTAMP NULL,
ADD COLUMN verification_documents JSONB DEFAULT '[]';

-- Create password history table
CREATE TABLE password_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create login attempts table
CREATE TABLE login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_created (email, created_at),
  INDEX idx_ip_created (ip_address, created_at)
);
```

### Appendix C: Security Checklist

- [ ] All passwords hashed with Argon2id
- [ ] HTTPS enforced on all endpoints
- [ ] CSRF tokens implemented
- [ ] Rate limiting configured
- [ ] Session fixation prevention
- [ ] Secure cookie flags set
- [ ] Content Security Policy configured
- [ ] Input validation on all fields
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Audit logging enabled
- [ ] Encryption at rest configured
- [ ] Backup and recovery tested
- [ ] Incident response plan documented
- [ ] Security training completed

---

## Document History

| Version | Date       | Author       | Changes                   |
| ------- | ---------- | ------------ | ------------------------- |
| 1.0     | 2025-09-19 | Product Team | Initial comprehensive PRD |

---

## Approval

| Role                 | Name | Signature | Date |
| -------------------- | ---- | --------- | ---- |
| Product Manager      |      |           |      |
| Engineering Lead     |      |           |      |
| Security Lead        |      |           |      |
| Business Stakeholder |      |           |      |
