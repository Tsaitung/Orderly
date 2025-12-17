# User Story 索引

> 最後更新: 2025-12-16
> 狀態: Active
> 總計: 88 User Stories

本資料夾整合所有 User Story，按功能模組和角色分類索引。

---

## 目錄結構

```
1-User-Story/
├── INDEX.md                              # 本文件
├── by-module/                            # 按功能模組分類
│   ├── 01-auth-user-management.md       # 身份驗證與用戶管理 (18 stories)
│   ├── 02-order-management.md           # 訂單管理 (7 stories)
│   ├── 03-product-sku-management.md     # 商品與 SKU 管理 (10 stories)
│   ├── 04-acceptance-receiving.md       # 驗收點收 (7 stories)
│   ├── 05-billing-settlement.md         # 對帳與結算 (8 stories)
│   ├── 06-customer-hierarchy.md         # 客戶層級管理 (10 stories)
│   ├── 07-onboarding-process.md         # 導入流程 (11 stories)
│   ├── 08-referral-system.md            # 推薦系統 (12 stories)
│   └── 09-erp-integration.md            # ERP 整合 (5 stories)
├── by-role/                              # 按角色分類（索引連結）
│   ├── restaurant-roles.md              # 餐廳端角色
│   ├── supplier-roles.md                # 供應商端角色
│   └── platform-roles.md                # 平台端角色
└── playbooks/                            # 操作手冊
    ├── supplier-onboarding-playbook.md  # 供應商導入手冊
    └── super-admin-guide.md             # 超管操作指南
```

---

## 按功能模組導覽

| 模組 | User Story 數 | P0 | P1 | P2 | 說明 |
|------|:------------:|:--:|:--:|:--:|------|
| [01-身份驗證](./by-module/01-auth-user-management.md) | 18 | 8 | 6 | 4 | 註冊、登入、**Line OAuth**、MFA、行動裝置、平台獨立 |
| [02-訂單管理](./by-module/02-order-management.md) | 7 | 4 | 3 | 0 | 訂單建立、追蹤、協商 |
| [03-商品管理](./by-module/03-product-sku-management.md) | 10 | 6 | 3 | 1 | 商品目錄、SKU、過敏原 |
| [04-驗收點收](./by-module/04-acceptance-receiving.md) | 7 | 4 | 1 | 2 | 掃碼點收、異常標記 |
| [05-對帳結算](./by-module/05-billing-settlement.md) | 8 | 4 | 3 | 1 | 對帳單、發票、付款 |
| [06-客戶層級](./by-module/06-customer-hierarchy.md) | 10 | 5 | 3 | 2 | 4層組織架構管理 |
| [07-導入流程](./by-module/07-onboarding-process.md) | 11 | 4 | 4 | 3 | 註冊引導、教學 |
| [08-推薦系統](./by-module/08-referral-system.md) | 12 | 3 | 4 | 5 | 雙向推薦、獎勵 |
| [09-ERP整合](./by-module/09-erp-integration.md) | 5 | 3 | 2 | 0 | API、數據同步 |
| **總計** | **88** | **41** | **29** | **18** | |

---

## 按角色導覽

### 餐廳端角色
- [restaurant_admin](./by-role/restaurant-roles.md#restaurant_admin餐廳管理者) - 組織控制、財務管理
- [restaurant_manager](./by-role/restaurant-roles.md#restaurant_manager餐廳經理) - 營運管理、報表
- [restaurant_operator](./by-role/restaurant-roles.md#restaurant_operator餐廳操作員) - 下單、收貨

### 供應商端角色
- [supplier_admin](./by-role/supplier-roles.md#supplier_admin供應商管理者) - 商品、價目管理
- [supplier_manager](./by-role/supplier-roles.md#supplier_manager供應商經理) - 訂單、客戶管理
- [supplier_operator](./by-role/supplier-roles.md#supplier_operator供應商操作員) - 收單、出貨

### 平台端角色
- [platform_admin](./by-role/platform-roles.md#platform_admin平台管理員) - 平台設定、審核
- [platform_support](./by-role/platform-roles.md#platform_support平台支援) - 客服、營運
- [super_admin](./by-role/platform-roles.md#super_admin系統超管) - 全系統控制

---

## 按優先級統計

### P0 - MVP 必備 (41 stories)

| 模組 | 代表性 User Story |
|------|-----------------|
| AUTH | US-AUTH-001 餐廳快速註冊、US-AUTH-003 標準登入、**US-AUTH-016 平台獨立登入**、**US-AUTH-017 行動瀏覽器** |
| ORD | US-ORD-001 快速建立訂單、US-ORD-002 即時追蹤狀態 |
| PRD | US-PRD-001 多條件搜尋、US-PRD-005 批量上傳 SKU |
| ACC | US-ACC-001 掃碼點收、US-ACC-002 拍照記錄異常 |
| BIL | US-BIL-001 自動對帳單、US-BIL-003 一鍵產生對帳 |
| HIER | US-HIER-001 層級設定、US-HIER-004 客戶架構查看 |
| ONB | US-ONB-001 快速註冊、US-ONB-004 供應商推薦 |
| REF | US-REF-001 邀請供應商、US-REF-002 邀請餐廳 |
| ERP | US-ERP-001 API 整合、US-ERP-002 無縫數據流 |

### P1 - 重要功能 (29 stories)

批次操作、智能推薦、MFA、報表分析、**原生 App（iOS/Android）**等進階功能。

### P2 - 進階功能 (18 stories)

AI 品質評估、多幣別、Super User、漏斗分析等增值功能。

---

## 來源 PRD 對照表

| PRD 文件 | User Story 數 | 對應模組 |
|---------|:------------:|---------|
| [PRD-Complete.md](../2-PRD/PRD-Complete.md) | 37 | ORD, PRD, ACC, BIL, ERP |
| [PRD-Auth-Module.md](../2-PRD/PRD-Auth-Module.md) | 18 | AUTH（含平台獨立登入、行動裝置支援）|
| [PRD-Customer-Hierarchy.md](../2-PRD/PRD-Customer-Hierarchy.md) | 10 | HIER |
| [PRD-Onboarding-Process.md](../2-PRD/PRD-Onboarding-Process.md) | 11 | ONB |
| [PRD-Referral-System.md](../2-PRD/PRD-Referral-System.md) | 12 | REF |

---

## User Story 命名規則

### 編號格式
```
US-{MODULE}-{NNN}

MODULE: AUTH, ORD, PRD, ACC, BIL, HIER, ONB, REF, ERP
NNN: 001-999 流水號
```

### 標準格式
```markdown
### US-XXX-NNN: 標題
**角色**: {role}
**優先級**: P0/P1/P2
**狀態**: Active/Deprecated

**故事**: 作為 [角色]，我希望 [功能]，以便 [價值]

**驗收標準**:
- [ ] 標準 1
- [ ] 標準 2

**來源**: [PRD-xxx.md](path) Section x.x
```

---

## 角色定義（單一事實來源）

| 角色代碼 | 角色名稱 | MFA 要求 | 說明 |
|---------|---------|----------|------|
| restaurant_admin | 餐廳管理者 | 建議 | 財務、用戶管理 |
| restaurant_manager | 餐廳經理 | 建議 | 營運、庫存、報表 |
| restaurant_operator | 餐廳操作員 | 可選 | 下單、收貨 |
| supplier_admin | 供應商管理者 | 強制 | 商品、價目管理 |
| supplier_manager | 供應商經理 | 建議 | 訂單、客戶管理 |
| supplier_operator | 供應商操作員 | 可選 | 收單、出貨 |
| platform_admin | 平台管理員 | 強制 | 平台設定、審核 |
| platform_support | 平台支援 | 強制 | 客服、營運 |
| super_admin | 系統超管 | 強制(TOTP) | 全系統控制 |

---

## 操作手冊

- [供應商導入手冊](./playbooks/supplier-onboarding-playbook.md) - 供應商入駐完整流程
- [Super Admin 指南](./playbooks/super-admin-guide.md) - 超管操作與安全規範

---

## 相關文件

- [PRD 索引](../2-PRD/) - 產品需求文檔
- [設計系統](../0-Design/) - UI/UX 規範
- [API 文檔](../API-Endpoints-Essential.md) - 端點規格
- [資料庫架構](../Database-Schema-Core.md) - 資料模型
