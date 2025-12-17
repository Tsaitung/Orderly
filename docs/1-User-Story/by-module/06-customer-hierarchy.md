# 客戶層級管理 User Stories

> 來源: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md)
> 最後更新: 2025-12-16
> 狀態: Active

## 概述
本模組涵蓋所有與客戶組織架構、4 層層級系統（集團/公司/地點/業務單位）、權限管理相關的 User Story。

---

## P0 - MVP 必備

### US-HIER-001: 設定公司層級結構
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能設定公司的層級結構，以便準確呈現企業組織架構

**驗收標準**:
- [ ] 可建立公司資料並驗證統編
- [ ] 可新增多個地點於公司下
- [ ] 可建立業務單位於各地點
- [ ] 可選擇性建立集團層級

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 4.1 Story 1

---

### US-HIER-002: 多地點訂單管理
**角色**: restaurant_manager（餐廳經理）
**優先級**: P0
**狀態**: Active

**故事**: 作為連鎖餐廳經理，我希望能跨多個地點管理訂單，以便追蹤各地點的消費和成本

**驗收標準**:
- [ ] 可查看所有地點的合併訂單
- [ ] 可依特定地點篩選訂單
- [ ] 可比較不同地點的績效
- [ ] 可設定各地點專屬配送偏好

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 4.1 Story 2

---

### US-HIER-003: 部門獨立下單
**角色**: restaurant_manager（地點經理）
**優先級**: P0
**狀態**: Active

**故事**: 作為地點經理，我希望不同部門能獨立下單，以便追蹤部門成本和消費

**驗收標準**:
- [ ] 各業務單位可建立獨立訂單
- [ ] 訂單自動標記業務單位識別碼
- [ ] 可設定各業務單位下單權限
- [ ] 部門主管可查看該單位訂單歷史

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 4.1 Story 3

---

### US-HIER-004: 查看客戶組織結構
**角色**: supplier_manager（供應商經理）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商，我希望能看到客戶的組織架構，以便正確管理配送和帳務

**驗收標準**:
- [ ] 可查看客戶完整層級結構
- [ ] 可查看各地點配送地址
- [ ] 可識別帳務負責單位（公司層級）
- [ ] 可依任何層級追蹤訂單

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 4.2 Story 4

---

### US-HIER-005: 公司層級合併帳單
**角色**: supplier_admin（供應商財務）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商財務，我希望能在公司層級產生發票，以便正確對法人實體計費

**驗收標準**:
- [ ] 發票產生於公司層級（非地點/單位）
- [ ] 包含所有地點和業務單位的訂單
- [ ] 顯示依地點和業務單位的明細
- [ ] 支援不同公司不同帳期

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 4.2 Story 5

---

## P1 - 重要功能

### US-HIER-006: 資料遷移管理
**角色**: platform_admin（平台管理員）
**優先級**: P1
**狀態**: Active

**故事**: 作為平台管理員，我希望能將現有客戶遷移到新的層級架構，以便維護資料連續性

**驗收標準**:
- [ ] 單一實體客戶自動遷移
- [ ] 複雜組織提供遷移精靈
- [ ] 資料驗證和完整性檢查
- [ ] 問題發生時可回滾

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 4.3 Story 6

---

### US-HIER-007: 層級權限管理
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能依層級設定權限，以便控制員工存取範圍

**驗收標準**:
- [ ] 集團管理員可存取所有公司
- [ ] 公司管理員僅存取所屬公司
- [ ] 地點經理僅存取所屬地點
- [ ] 業務單位主管僅存取所屬單位

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 5.3

---

### US-HIER-008: 層級報表
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能產生各層級報表，以便分析營運狀況

**驗收標準**:
- [ ] 支援從集團到業務單位的下鑽分析
- [ ] 各層級比較分析
- [ ] 成本中心報表（依業務單位）
- [ ] 可匯出報表

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 5.4

---

## P2 - 進階功能

### US-HIER-009: 拖拉式層級建立
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P2
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能用視覺化介面建立和調整組織結構，以便更直觀管理

**驗收標準**:
- [ ] 拖拉式介面建立結構
- [ ] 關係視覺化驗證
- [ ] 支援 CSV/Excel 批量匯入
- [ ] 提供常見架構範本

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 8.2

---

### US-HIER-010: 實體間移動
**角色**: platform_admin（平台管理員）
**優先級**: P2
**狀態**: Active

**故事**: 作為平台管理員，我希望能在層級間移動實體，以便支援組織重組

**驗收標準**:
- [ ] 可移動地點至不同公司
- [ ] 可移動業務單位至不同地點
- [ ] 移動時驗證相關限制
- [ ] 保留歷史資料關聯

**來源**: [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) Section 5.1

---

## 功能需求對照表

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 層級架構設定 | ✅ | 👁️ | ✅ | US-HIER-001 |
| 多地點管理 | ✅ | 👁️ | 👁️ | US-HIER-002 |
| 部門獨立下單 | ✅ | 👁️ | 👁️ | US-HIER-003 |
| 客戶架構查看 | 👁️ | ✅ | ✅ | US-HIER-004 |
| 合併帳單 | 👁️ | ✅ | ✅ | US-HIER-005 |
| 資料遷移 | ❌ | ❌ | ✅ | US-HIER-006 |
| 層級權限 | ✅ | ✅ | ✅ | US-HIER-007 |
| 層級報表 | ✅ | ✅ | ✅ | US-HIER-008 |
| 視覺化建立 | ✅ | ❌ | ✅ | US-HIER-009 |
| 實體間移動 | ❌ | ❌ | ✅ | US-HIER-010 |

> 圖例: ✅ 完整功能 | 👁️ 僅檢視 | ❌ 不適用

---

## 4 層層級架構說明

```
Level 1: 集團 (Group) - 選用
├── Level 2: 公司 (Company) - 法人實體/帳務單位
│   ├── Level 3: 地點 (Location) - 配送地址
│   │   ├── Level 4: 業務單位 (Business Unit) - 下單/成本中心
│   │   └── Level 4: 業務單位 (Business Unit)
│   └── Level 3: 地點 (Location)
│       └── Level 4: 業務單位 (Business Unit)
└── Level 2: 公司 (Company)
    └── ...
```

---

## 相關文件
- [PRD-Customer-Hierarchy.md](../../2-PRD/PRD-Customer-Hierarchy.md) - 客戶層級完整 PRD
- [01-auth-user-management.md](./01-auth-user-management.md) - 用戶管理
- [05-billing-settlement.md](./05-billing-settlement.md) - 對帳結算
