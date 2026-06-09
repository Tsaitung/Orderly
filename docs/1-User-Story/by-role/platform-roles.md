# 平台端角色 User Story 索引

> 最後更新: 2026-06-09
> 狀態: Active

本文件彙整所有與平台端角色相關的 User Story 連結索引。

---

## platform_admin（平台管理員）

平台設定、租戶審核、跨租戶稽核。

### 身份驗證與用戶管理
- [US-AUTH-009: 使用者清單管理](../by-module/01-auth-user-management.md#us-auth-009-使用者清單管理)
- [US-AUTH-012: Super User 跨組織存取](../by-module/01-auth-user-management.md#us-auth-012-super-user-跨組織存取)
- [US-AUTH-013: 進階安全設定](../by-module/01-auth-user-management.md#us-auth-013-進階安全設定)

### 商品與 SKU 管理
- [US-PRD-009: 維護標準化分類樹](../by-module/02-product-sku-management.md#us-prd-009-維護標準化分類樹)
- [US-PRD-010: 分析品類趨勢](../by-module/02-product-sku-management.md#us-prd-010-分析品類趨勢)

### 驗收點收
- [US-ACC-007: GPS 定位驗證](../by-module/04-acceptance-receiving.md#us-acc-007-gps-定位驗證)

### 客戶層級
- [US-HIER-006: 資料遷移管理](../by-module/06-customer-hierarchy.md#us-hier-006-資料遷移管理)
- [US-HIER-010: 實體間移動](../by-module/06-customer-hierarchy.md#us-hier-010-實體間移動)

### ERP 整合
- [US-ERP-001: 標準化 API 整合](../by-module/09-erp-integration.md#us-erp-001-標準化-api-整合)
- [US-ERP-004: 整合狀態監控](../by-module/09-erp-integration.md#us-erp-004-整合狀態監控)
- [US-ERP-005: API 版本管理](../by-module/09-erp-integration.md#us-erp-005-api-版本管理)

### 推薦系統
- [US-REF-009: 推薦漏斗分析](../by-module/08-referral-system.md#us-ref-009-推薦漏斗分析)
- [US-REF-012: ROI 分析報表](../by-module/08-referral-system.md#us-ref-012-roi-分析報表)

---

## platform_support（平台支援）

客服支援、營運支援。

### 身份驗證
- [US-AUTH-003: 標準登入流程](../by-module/01-auth-user-management.md#us-auth-003-標準登入流程)
- [US-AUTH-006: MFA 雙因素驗證](../by-module/01-auth-user-management.md#us-auth-006-mfa-雙因素驗證)

### 訂單與驗收
- [US-ORD-002: 即時追蹤訂單狀態](../by-module/03-order-management.md#us-ord-002-即時追蹤訂單狀態)
- [US-ACC-003: 查看餐廳驗收紀錄](../by-module/04-acceptance-receiving.md#us-acc-003-查看餐廳驗收紀錄)

### 對帳與結算
- [US-BIL-004: 追蹤異議處理進度](../by-module/05-billing-settlement.md#us-bil-004-追蹤異議處理進度)

---

## super_admin（系統超管）

全系統控制、緊急存取。

### 身份驗證與權限
- [US-AUTH-012: Super User 跨組織存取（緊急 break-glass）](../by-module/01-auth-user-management.md#us-auth-012-super-user-跨組織存取)
- [US-AUTH-013: 進階安全設定](../by-module/01-auth-user-management.md#us-auth-013-進階安全設定)
- [US-AUTH-023: 超管帳號模擬登入（Impersonation / Act-as）](../by-module/01-auth-user-management.md#us-auth-023-超管帳號模擬登入impersonation--act-as)
- [US-AUTH-024: 超管角色切換預覽（Role Switch / View-as）](../by-module/01-auth-user-management.md#us-auth-024-超管角色切換預覽role-switch--view-as-role)

### 系統管理
- [US-HIER-006: 資料遷移管理](../by-module/06-customer-hierarchy.md#us-hier-006-資料遷移管理)
- [US-HIER-010: 實體間移動](../by-module/06-customer-hierarchy.md#us-hier-010-實體間移動)

---

## 權限說明

| 角色 | MFA 要求 | 存取範圍 | 說明 |
|------|---------|---------|------|
| platform_admin | 強制 (TOTP) | 跨租戶 | 平台設定、租戶審核 |
| platform_support | 強制 | 受限跨租戶 | 客服、營運支援 |
| super_admin | 強制 (TOTP + Biometric) | 全系統 | 緊急存取（`super_user` break-glass）、系統控制、帳號模擬登入（act-as，化身目標角色，US-AUTH-023）|

---

## 相關文件
- [按模組查看 User Story](../by-module/)
- [餐廳端角色索引](./restaurant-roles.md)
- [供應商端角色索引](./supplier-roles.md)
- [Super Admin 指南](../playbooks/super-admin-guide.md)
