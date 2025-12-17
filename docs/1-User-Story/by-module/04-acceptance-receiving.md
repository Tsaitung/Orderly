# 驗收點收 User Stories

> 來源: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3
> 最後更新: 2025-12-16
> 狀態: Active

## 概述
本模組涵蓋所有與貨品驗收、點收、異常標記、差異協商相關的 User Story。

---

## P0 - MVP 必備

### US-ACC-001: 手機掃碼快速點收
**角色**: restaurant_operator（餐廳驗收人員）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳驗收人員，我希望能用手機掃描條碼快速點收，以便提高驗收效率

**驗收標準**:
- [ ] 支援 iOS/Android 原生掃碼功能
- [ ] 按配送批次顯示待驗收清單
- [ ] 支援條碼掃描、語音輸入數量
- [ ] 支援批量驗收，單次可處理 50 個品項

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3.1

---

### US-ACC-002: 拍照記錄貨品異常
**角色**: restaurant_operator（餐廳採購）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳採購，我希望能拍照記錄貨品異常，以便作為協商依據

**驗收標準**:
- [ ] 支援批量拍照、自動壓縮
- [ ] 拍照自動加入時間戳和 GPS 座標
- [ ] OCR 識別準確率 ≥90%
- [ ] 支援 5 類異常標記：數量不符、品質問題、包裝破損、過期、其他

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3.1

---

### US-ACC-003: 查看餐廳驗收紀錄
**角色**: supplier_manager（供應商經理）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商，我希望能查看餐廳的驗收紀錄，以便了解履約情況

**驗收標準**:
- [ ] 多維度搜尋：時間、商品、供應商、異常類型
- [ ] 驗收數據即時同步至供應商端
- [ ] 支援匯出驗收報表

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3.1

---

### US-ACC-004: 追蹤驗收 KPI
**角色**: supplier_manager（供應商品管）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商品管，我希望能追蹤驗收 KPI，以便持續改善服務品質

**驗收標準**:
- [ ] 履約率、準時率、品質分數等關鍵指標
- [ ] 提供趨勢分析圖表
- [ ] 異常處理流程在 24 小時內完成

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3.1

---

## P1 - 重要功能

### US-ACC-005: 差異協商處理
**角色**: restaurant_manager（餐廳經理）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳經理，我希望能線上協商驗收差異，以便快速解決問題

**驗收標準**:
- [ ] 支援退貨、補貨、折扣、延期付款等處理方式
- [ ] 協商記錄完整保存
- [ ] 處理結果自動同步至對帳系統

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3.2

---

## P2 - 進階功能

### US-ACC-006: AI 智能品質評估
**角色**: restaurant_operator（餐廳驗收人員）
**優先級**: P2
**狀態**: Active

**故事**: 作為餐廳驗收人員，我希望系統能 AI 識別商品品質，以便加速驗收判斷

**驗收標準**:
- [ ] AI 圖片識別商品品質，自動評分
- [ ] AI 品質評估準確率 ≥85%

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3.2

---

### US-ACC-007: GPS 定位驗證
**角色**: platform_admin（平台管理員）
**優先級**: P2
**狀態**: Active

**故事**: 作為平台管理員，我希望能驗證驗收地點，以便確保數據真實性

**驗收標準**:
- [ ] 驗收時自動記錄 GPS 座標
- [ ] 支援地點異常告警

**來源**: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 3.2

---

## 功能需求對照表

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 待驗收清單 | ✅ | ❌ | ❌ | US-ACC-001 |
| 拍照上傳 | ✅ | ❌ | ❌ | US-ACC-002 |
| 驗收紀錄檢索 | ✅ | ✅ | ✅ | US-ACC-003 |
| 異常標記 | ✅ | ✅ | ✅ | US-ACC-002 |
| 差異協商 | ✅ | ✅ | ✅ | US-ACC-005 |
| 驗收 KPI 報表 | ❌ | ✅ | ✅ | US-ACC-004 |
| 智能品質評估 | ✅ | ✅ | ✅ | US-ACC-006 |
| GPS 定位驗證 | ✅ | ✅ | ✅ | US-ACC-007 |

---

## 相關文件
- [PRD-Complete.md](../../2-PRD/PRD-Complete.md) - 完整產品需求
- [02-order-management.md](./02-order-management.md) - 訂單管理
- [05-billing-settlement.md](./05-billing-settlement.md) - 對帳結算
