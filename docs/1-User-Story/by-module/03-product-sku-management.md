# 商品與 SKU 管理 User Stories

> 來源: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4, [PRD-SKU-Sharing-System.md](../../2-PRD/PRD-SKU-Sharing-System.md)
> 最後更新: 2025-12-16
> 狀態: Active

## 概述
本模組涵蓋所有與商品目錄、SKU 管理、分類、過敏原、庫存相關的 User Story。

---

## P0 - MVP 必備

### US-PRD-001: 多條件商品搜尋
**角色**: restaurant_operator（餐廳採購）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳採購，我希望能按照產地、品牌、過敏原等條件快速搜尋商品，以便符合菜單需求

**驗收標準**:
- [ ] 支援多維度篩選：分類、品牌、產地、稅務狀態
- [ ] 支援過敏原篩選：allergenTypes、allergenSeverity
- [ ] 搜尋響應時間 <200ms
- [ ] 支援模糊搜尋

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

### US-PRD-002: 查看營養成分和過敏原
**角色**: restaurant_operator（餐廳主廚）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳主廚，我希望能檢視食材的營養成分和過敏原資訊，以便設計健康菜單

**驗收標準**:
- [ ] 支援 14 類過敏原和 4 級風險標示
- [ ] 營養成分標準格式顯示
- [ ] 過敏原追蹤可開關功能

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

### US-PRD-003: 比較多供應商商品
**角色**: restaurant_manager（餐廳經理）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳經理，我希望能比較不同供應商的同一商品，以便選擇最佳採購方案

**驗收標準**:
- [ ] 同一商品可對應多個供應商
- [ ] 價格、品質、履約率比較功能
- [ ] 支援收藏常用供應商

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

### US-PRD-004: 追蹤稅務狀態
**角色**: restaurant_admin（餐廳老闆）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳老闆，我希望系統能追蹤稅務狀態（應稅/免稅），以便正確計算成本

**驗收標準**:
- [ ] 每個商品標示應稅/免稅狀態
- [ ] 訂單自動計算稅金
- [ ] 支援稅務報表匯出

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

### US-PRD-005: 批量上傳 SKU 變體
**角色**: supplier_admin（供應商管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商，我希望能批量上傳商品 SKU 變體（不同包裝、規格），以便提高上架效率

**驗收標準**:
- [ ] 支援 Excel 批量匯入
- [ ] 單次可處理 1000 個商品
- [ ] 錯誤處理完善，明確指出問題
- [ ] 批量匯入完成時間 <30 秒

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

### US-PRD-006: 設定差異化定價
**角色**: supplier_manager（供應商業務）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商業務，我希望能設定差異化定價（依餐廳等級、採購量），以便優化利潤

**驗收標準**:
- [ ] 支援客戶分級定價
- [ ] 支援採購量階梯定價
- [ ] 價格表版本控制

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

## P1 - 重要功能

### US-PRD-007: 管理產品認證和品質等級
**角色**: supplier_manager（供應商品控）
**優先級**: P1
**狀態**: Active

**故事**: 作為供應商品控，我希望能管理產品認證和品質等級，以便建立品牌信任

**驗收標準**:
- [ ] 支援上傳認證文件
- [ ] 認證到期提醒
- [ ] 品質等級標示

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

### US-PRD-008: 即時更新庫存狀態
**角色**: supplier_operator（供應商倉管）
**優先級**: P1
**狀態**: Active

**故事**: 作為供應商倉管，我希望能即時更新庫存狀態，以便避免缺貨糾紛

**驗收標準**:
- [ ] 庫存變動同步延遲 <1 秒
- [ ] 支援庫存預警設定
- [ ] 自動替代品推薦

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

### US-PRD-009: 維護標準化分類樹
**角色**: platform_admin（平台管理員）
**優先級**: P1
**狀態**: Active

**故事**: 作為平台管理員，我希望能維護標準化分類樹，以便所有商品都有正確歸類

**驗收標準**:
- [ ] 支援無限層級分類
- [ ] 支援拖拉調整功能
- [ ] 100 層分類樹載入時間 <100ms

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

## P2 - 進階功能

### US-PRD-010: 分析品類趨勢
**角色**: platform_admin（平台數據分析師）
**優先級**: P2
**狀態**: Active

**故事**: 作為平台數據分析師，我希望能分析品類趨勢和供應商績效，以便優化平台營運

**驗收標準**:
- [ ] 品類銷售趨勢圖表
- [ ] 供應商績效排名
- [ ] 數據可匯出

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4.2

---

## 功能需求對照表

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 商品搜尋 | ✅ | ✅ | ✅ | US-PRD-001 |
| 過敏原追蹤 | ✅ | ✅ | ✅ | US-PRD-002 |
| 多供應商比價 | ✅ | ❌ | ✅ | US-PRD-003 |
| 稅務狀態追蹤 | ✅ | ✅ | ✅ | US-PRD-004 |
| SKU 批量上傳 | ❌ | ✅ | ✅ | US-PRD-005 |
| 差異化定價 | ❌ | ✅ | 👁️ | US-PRD-006 |
| 認證管理 | ❌ | ✅ | ✅ | US-PRD-007 |
| 庫存同步 | ✅ | ✅ | ✅ | US-PRD-008 |
| 分類樹管理 | 👁️ | 👁️ | ✅ | US-PRD-009 |

---

## 相關文件
- [PRD-Complete.md](../../2-PRD/PRD-Complete.md) - 完整產品需求
- [PRD-SKU-Sharing-System.md](../../2-PRD/PRD-SKU-Sharing-System.md) - SKU 共享系統
- [PRD-SKU-Management-Enhanced.md](../../2-PRD/PRD-SKU-Management-Enhanced.md) - SKU 管理增強
- [02-order-management.md](./02-order-management.md) - 訂單管理
