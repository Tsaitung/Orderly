# 訂單管理 User Stories

> 來源: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2
> 最後更新: 2025-12-16
> 狀態: Active

## 概述
本模組涵蓋所有與訂單建立、確認、追蹤、協商相關的 User Story。

---

## P0 - MVP 必備

### US-ORD-001: 快速建立訂單草稿
**角色**: restaurant_operator（餐廳採購人員）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳採購人員，我希望能快速建立訂單草稿並與團隊協作，以便提高採購效率

**驗收標準**:
- [ ] 餐廳可在 3 分鐘內完成 20 項商品的訂單建立
- [ ] 支援商品搜尋、批量添加、草稿保存
- [ ] 支援多人協作編輯同一訂單

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2.1

---

### US-ORD-002: 即時追蹤訂單狀態
**角色**: restaurant_manager（餐廳經理）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳經理，我希望能即時追蹤訂單狀態，以便掌握配送進度

**驗收標準**:
- [ ] 支援 8 個狀態節點追蹤：草稿→待確認→已確認→配送中→已送達→驗收中→已完成→已結算
- [ ] 狀態變更通知延遲不超過 30 秒
- [ ] 支援 WebSocket 即時推送

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2.1

---

### US-ORD-003: 一鍵確認或修改訂單
**角色**: supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商，我希望能一鍵確認或修改訂單，以便快速響應客戶需求

**驗收標準**:
- [ ] 供應商可在 5 分鐘內處理 10 張訂單的確認/修改
- [ ] 支援修改數量/價格，系統自動通知餐廳確認
- [ ] 支援批量確認操作

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2.1

---

### US-ORD-004: 訂單變更線上溝通
**角色**: supplier_operator（供應商客服）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商客服，我希望能與餐廳線上溝通訂單變更，以便減少誤解

**驗收標準**:
- [ ] 支援文字、圖片、語音訊息
- [ ] 協商留言支援即時推送（WebSocket）
- [ ] 全程留存記錄供追溯

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2.1

---

## P1 - 重要功能

### US-ORD-005: 批次訂單操作
**角色**: restaurant_manager（餐廳經理）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳經理，我希望能批量處理訂單，以便提高作業效率

**驗收標準**:
- [ ] 支援批量確認、取消、匯出 CSV/PDF
- [ ] 批次操作單次可處理 100 張訂單

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2.2

---

### US-ORD-006: 智能重複下單
**角色**: restaurant_operator（餐廳採購人員）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳採購人員，我希望能基於歷史訂單一鍵重複下單，以便節省時間

**驗收標準**:
- [ ] 基於歷史訂單智能推薦
- [ ] 智能推薦準確率 >85%
- [ ] 支援離線模式，網路恢復時自動同步

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2.2

---

### US-ORD-007: 訂單範本管理
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能設定訂單範本，以便自動觸發週期性訂單

**驗收標準**:
- [ ] 支援週期性訂單範本
- [ ] 自動觸發功能正常運作

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 2.2

---

## 功能需求對照表

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 新建訂單/草稿 | ✅ | ❌ | ❌ | US-ORD-001 |
| 接單/修改/拒單 | ❌ | ✅ | 👁️ | US-ORD-003 |
| 狀態追蹤 | ✅ | ✅ | ✅ | US-ORD-002 |
| 協商留言 | ✅ | ✅ | 👁️ | US-ORD-004 |
| 批次操作 | ✅ | ✅ | ✅ | US-ORD-005 |
| 智能重複下單 | ✅ | ❌ | ❌ | US-ORD-006 |
| 訂單範本管理 | ✅ | ✅ | ✅ | US-ORD-007 |

---

## 相關文件
- [PRD-Complete.md](../../2-PRD/PRD-Complete.md) - 完整產品需求
- [03-product-sku-management.md](./03-product-sku-management.md) - 商品管理
- [04-acceptance-receiving.md](./04-acceptance-receiving.md) - 驗收流程
