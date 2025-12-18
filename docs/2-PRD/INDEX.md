# 2. PRD（產品需求文件）

> 最後更新: 2025-12-18
> 狀態: Active

本資料夾收斂所有產品需求文件（PRD）。建議先從 `PRD-Complete.md` 進入，再視需求深入各模組 PRD。

---

## 核心文件

| 文件 | 說明 |
|------|------|
| [PRD-Complete.md](./PRD-Complete.md) | **主入口**：完整產品需求（訂單、商品、驗收、對帳、ERP） |
| [PROJECT-OVERVIEW.md](./PROJECT-OVERVIEW.md) | 願景、里程碑摘要、商業模式 |

---

## 模組 PRD（依 User Story 順序）

| 編號 | 模組 | PRD 文件 | 對應 User Story |
|:----:|------|----------|-----------------|
| 01 | **身份驗證** | [PRD-Auth-Module.md](./PRD-Auth-Module.md) | US-AUTH-001~021 |
| 02 | **商品/SKU** | [PRD-SKU-Sharing-System.md](./PRD-SKU-Sharing-System.md) | US-PRD-001~020 |
| 02 | 商品/SKU | [PRD-SKU-Management-Enhanced.md](./PRD-SKU-Management-Enhanced.md) | (補充文件) |
| 03 | **訂單管理** | [PRD-Complete.md](./PRD-Complete.md) Section 2 | US-ORD-001~007 |
| 04 | **驗收點收** | [PRD-Complete.md](./PRD-Complete.md) Section 3 | US-ACC-001~007 |
| 05 | **對帳結算** | [PRD-Billing-Master.md](./PRD-Billing-Master.md) | US-BIL-001~008 |
| 06 | **客戶層級** | [PRD-Customer-Hierarchy.md](./PRD-Customer-Hierarchy.md) | US-HIER-001~010 |
| 06 | 客戶層級 | [PRD-Customer-Hierarchy-Dashboard-Redesign.md](./PRD-Customer-Hierarchy-Dashboard-Redesign.md) | (Dashboard 重設計) |
| 07 | **導入流程** | [PRD-Onboarding-Process.md](./PRD-Onboarding-Process.md) | US-ONB-001~011 |
| 08 | **推薦系統** | [PRD-Referral-System.md](./PRD-Referral-System.md) | US-REF-001~012 |
| 09 | **ERP 整合** | [PRD-Complete.md](./PRD-Complete.md) Section 5 | US-ERP-001~005 |

---

## 補充文件

| 文件 | 說明 |
|------|------|
| [Orderly_Contracts_Config_PRD_Reconciliation.md](./Orderly_Contracts_Config_PRD_Reconciliation.md) | 合約/設定對帳整合 |

---

## User Story 對照

完整 User Story 索引請參考：[../1-User-Story/INDEX.md](../1-User-Story/INDEX.md)

| 模組代碼 | User Story 數 | 說明 |
|---------|:------------:|------|
| AUTH | 21 | 註冊、登入、Line OAuth、MFA、行動裝置、平台獨立 |
| PRD | 20 | 商品目錄、SKU、別名整合、圖片審核、品牌管理 |
| ORD | 7 | 訂單建立、追蹤、協商 |
| ACC | 7 | 掃碼點收、異常標記 |
| BIL | 8 | 對帳單、發票、付款 |
| HIER | 10 | 4層組織架構管理 |
| ONB | 11 | 註冊引導、教學 |
| REF | 12 | 雙向推薦、獎勵 |
| ERP | 5 | API、數據同步 |
| **總計** | **101** | |
