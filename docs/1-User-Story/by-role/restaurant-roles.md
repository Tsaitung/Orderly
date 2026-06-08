# 餐廳端角色 User Story 索引

> 最後更新: 2025-12-16
> 狀態: Active

本文件彙整所有與餐廳端角色相關的 User Story 連結索引。

---

## restaurant_admin（餐廳管理者）

組織完全控制、財務管理、用戶管理。

### 身份驗證與用戶管理
- [US-AUTH-001: 餐廳快速註冊](../by-module/01-auth-user-management.md#us-auth-001-餐廳快速註冊)
- [US-AUTH-005: 帳戶驗證等級](../by-module/01-auth-user-management.md#us-auth-005-帳戶驗證等級)
- [US-AUTH-009: 組織用戶管理](../by-module/01-auth-user-management.md#us-auth-009-組織用戶管理)
- [US-AUTH-014: 組織層級管理](../by-module/01-auth-user-management.md#us-auth-014-組織層級管理)

### 商品與採購
- [US-PRD-003: 比較多供應商商品](../by-module/02-product-sku-management.md#us-prd-003-比較多供應商商品)
- [US-PRD-004: 追蹤稅務狀態](../by-module/02-product-sku-management.md#us-prd-004-追蹤稅務狀態)

### 對帳與結算
- [US-BIL-006: 付款記錄追蹤](../by-module/05-billing-settlement.md#us-bil-006-付款記錄追蹤)
- [US-BIL-007: 財務報表生成](../by-module/05-billing-settlement.md#us-bil-007-財務報表生成)

### 客戶層級
- [US-HIER-001: 設定公司層級結構](../by-module/06-customer-hierarchy.md#us-hier-001-設定公司層級結構)
- [US-HIER-007: 層級權限管理](../by-module/06-customer-hierarchy.md#us-hier-007-層級權限管理)
- [US-HIER-008: 層級報表](../by-module/06-customer-hierarchy.md#us-hier-008-層級報表)
- [US-HIER-009: 拖拉式層級建立](../by-module/06-customer-hierarchy.md#us-hier-009-拖拉式層級建立)

### 導入與推薦
- [US-ONB-001: 餐廳快速註冊流程](../by-module/07-onboarding-process.md#us-onb-001-餐廳快速註冊流程)
- [US-ONB-003: 信任等級驗證](../by-module/07-onboarding-process.md#us-onb-003-信任等級驗證)
- [US-ONB-004: 供應商推薦選擇](../by-module/07-onboarding-process.md#us-onb-004-供應商推薦選擇)
- [US-REF-001: 餐廳邀請供應商](../by-module/08-referral-system.md#us-ref-001-餐廳邀請供應商)
- [US-REF-004: 推薦獎勵計算](../by-module/08-referral-system.md#us-ref-004-推薦獎勵計算)
- [US-REF-005: 平台點數系統](../by-module/08-referral-system.md#us-ref-005-平台點數系統)
- [US-REF-007: 推薦儀表板](../by-module/08-referral-system.md#us-ref-007-推薦儀表板)
- [US-REF-010: 多渠道分享](../by-module/08-referral-system.md#us-ref-010-多渠道分享)

---

## restaurant_manager（餐廳經理）

營運管理、庫存管理、報表檢視。

### 訂單管理
- [US-ORD-002: 即時追蹤訂單狀態](../by-module/03-order-management.md#us-ord-002-即時追蹤訂單狀態)
- [US-ORD-005: 批次訂單操作](../by-module/03-order-management.md#us-ord-005-批次訂單操作)
- [US-ORD-007: 訂單範本管理](../by-module/03-order-management.md#us-ord-007-訂單範本管理)

### 商品與採購
- [US-PRD-003: 比較多供應商商品](../by-module/02-product-sku-management.md#us-prd-003-比較多供應商商品)

### 驗收點收
- [US-ACC-005: 差異協商處理](../by-module/04-acceptance-receiving.md#us-acc-005-差異協商處理)

### 對帳與結算
- [US-BIL-002: 線上提出對帳異議](../by-module/05-billing-settlement.md#us-bil-002-線上提出對帳異議)

### 客戶層級
- [US-HIER-002: 多地點訂單管理](../by-module/06-customer-hierarchy.md#us-hier-002-多地點訂單管理)
- [US-HIER-003: 部門獨立下單](../by-module/06-customer-hierarchy.md#us-hier-003-部門獨立下單)

---

## restaurant_operator（餐廳操作員）

下單、收貨、基礎操作。

### 身份驗證
- [US-AUTH-003: 標準登入流程](../by-module/01-auth-user-management.md#us-auth-003-標準登入流程)
- [US-AUTH-004: 密碼重設（已停用，2026-06-08）](../by-module/01-auth-user-management.md#us-auth-004-密碼重設)
- [US-AUTH-022: 社群帳號恢復（取代密碼重設）](../by-module/01-auth-user-management.md#us-auth-022-社群帳號恢復取代密碼重設)
- [US-AUTH-007: 第三方 OAuth 登入](../by-module/01-auth-user-management.md#us-auth-007-第三方-oauth-登入)
- [US-AUTH-010: 查看個人權限](../by-module/01-auth-user-management.md#us-auth-010-查看個人權限)
- [US-AUTH-013: 行動裝置生物辨識](../by-module/01-auth-user-management.md#us-auth-013-行動裝置生物辨識)

### 訂單管理
- [US-ORD-001: 快速建立訂單草稿](../by-module/03-order-management.md#us-ord-001-快速建立訂單草稿)
- [US-ORD-006: 智能重複下單](../by-module/03-order-management.md#us-ord-006-智能重複下單)

### 商品搜尋
- [US-PRD-001: 多條件商品搜尋](../by-module/02-product-sku-management.md#us-prd-001-多條件商品搜尋)
- [US-PRD-002: 查看營養成分和過敏原](../by-module/02-product-sku-management.md#us-prd-002-查看營養成分和過敏原)

### 驗收點收
- [US-ACC-001: 手機掃碼快速點收](../by-module/04-acceptance-receiving.md#us-acc-001-手機掃碼快速點收)
- [US-ACC-002: 拍照記錄貨品異常](../by-module/04-acceptance-receiving.md#us-acc-002-拍照記錄貨品異常)
- [US-ACC-006: AI 智能品質評估](../by-module/04-acceptance-receiving.md#us-acc-006-ai-智能品質評估)

### 導入與教學
- [US-ONB-005: 首單引導教學](../by-module/07-onboarding-process.md#us-onb-005-首單引導教學)
- [US-ONB-008: 互動式導覽](../by-module/07-onboarding-process.md#us-onb-008-互動式導覽)
- [US-ONB-010: 情境式提示](../by-module/07-onboarding-process.md#us-onb-010-情境式提示)
- [US-ONB-011: 影片教學資源](../by-module/07-onboarding-process.md#us-onb-011-影片教學資源)

### 推薦系統
- [US-REF-003: 接受邀請並建立關係](../by-module/08-referral-system.md#us-ref-003-接受邀請並建立關係)

---

## 相關文件
- [按模組查看 User Story](../by-module/)
- [供應商端角色索引](./supplier-roles.md)
- [平台端角色索引](./platform-roles.md)
