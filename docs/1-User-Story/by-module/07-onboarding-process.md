# 導入流程 User Stories

> 來源: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md)
> 最後更新: 2025-12-16
> 狀態: Active

## 概述
本模組涵蓋所有與餐廳/供應商導入流程、驗證等級、教學引導相關的 User Story。

---

## P0 - MVP 必備

### US-ONB-001: 餐廳快速註冊流程
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能在 5 分鐘內完成基本註冊，以便快速開始使用平台

**驗收標準**:
- [ ] 4 步驟簡化註冊流程
- [ ] 必填：Email、密碼、餐廳名稱、聯絡人、電話、統編
- [ ] Email OTP 和手機 OTP 驗證
- [ ] 註冊完成時間 <5 分鐘

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 2.1

---

### US-ONB-002: 供應商完整註冊流程
**角色**: supplier_admin（供應商管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商管理者，我希望能完成完整的商業註冊，以便正式在平台上架商品

**驗收標準**:
- [ ] 8 步驟完整註冊流程（含原有 5 步 + 新增 3 步）
- [ ] 必填：Email、密碼、公司名稱、聯絡人、電話、統編/身分證
- [ ] 支援營業執照上傳
- [ ] 產品目錄建立引導

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 2.2

---

### US-ONB-003: 信任等級驗證
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳管理者，我希望能逐步完成驗證提升信任等級，以便解鎖更多交易功能

**驗收標準**:
- [ ] 基礎等級：Email+手機驗證，單筆限額 NT$10,000
- [ ] 驗證等級：統編查驗，單筆限額 NT$100,000
- [ ] 認證等級：營業執照審核，無限額限制
- [ ] 驗證進度清楚顯示

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 4

---

### US-ONB-004: 供應商推薦選擇
**角色**: restaurant_admin（餐廳管理者）
**優先級**: P0
**狀態**: Active

**故事**: 作為餐廳管理者，我希望在註冊過程中能獲得供應商推薦，以便快速建立採購關係

**驗收標準**:
- [ ] 基於地理位置推薦（同縣市優先）
- [ ] 基於餐廳類型推薦相關品類供應商
- [ ] 顯示供應商評分和主打產品
- [ ] 可選擇 3-5 家推薦供應商

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 2.1 Step 3

---

## P1 - 重要功能

### US-ONB-005: 首單引導教學
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳操作員，我希望有首單引導幫助我快速上手，以便順利完成第一筆訂單

**驗收標準**:
- [ ] 根據餐廳類型提供預設商品清單
- [ ] 建議採購量和頻率
- [ ] 示範下單流程互動教學
- [ ] 訂單管理、驗收、付款功能介紹

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 2.1 Step 4

---

### US-ONB-006: 產品目錄快速導入
**角色**: supplier_admin（供應商管理者）
**優先級**: P1
**狀態**: Active

**故事**: 作為供應商管理者，我希望能快速導入產品目錄，以便縮短上架時間

**驗收標準**:
- [ ] Excel 範本下載
- [ ] 批量商品上傳
- [ ] 自動品類分類
- [ ] 商品圖片、規格、保存期限設定

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 2.2 Step 6

---

### US-ONB-007: 定價策略設定
**角色**: supplier_admin（供應商管理者）
**優先級**: P1
**狀態**: Active

**故事**: 作為供應商管理者，我希望能設定靈活的定價策略，以便針對不同客戶群提供優惠

**驗收標準**:
- [ ] 支援固定價格、階梯定價、季節性定價
- [ ] VIP 客戶折扣設定
- [ ] 新客戶優惠設定
- [ ] 大宗採購價設定

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 2.2 Step 7

---

### US-ONB-008: 互動式導覽
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P1
**狀態**: Active

**故事**: 作為餐廳操作員，我希望有互動式導覽指引我使用各功能，以便快速熟悉系統

**驗收標準**:
- [ ] 儀表板概覽導覽
- [ ] 下單流程導覽
- [ ] 驗收功能導覽
- [ ] 帳務管理導覽

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 5

---

## P2 - 進階功能

### US-ONB-009: 客戶邀請引導
**角色**: supplier_admin（供應商管理者）
**優先級**: P2
**狀態**: Active

**故事**: 作為供應商管理者，我希望能批量邀請現有客戶加入平台，以便快速建立數位化合作關係

**驗收標準**:
- [ ] 客戶清單上傳
- [ ] 批量邀請發送
- [ ] 邀請狀態追蹤
- [ ] 基於地理位置推薦潛在餐廳客戶

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 2.2 Step 8

---

### US-ONB-010: 情境式提示
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P2
**狀態**: Active

**故事**: 作為餐廳操作員，我希望系統能在我需要時提供智能提示，以便順利完成操作

**驗收標準**:
- [ ] 停留超過 30 秒未操作時觸發提示
- [ ] 滑鼠懸停但未點擊重要按鈕時觸發
- [ ] 錯誤操作後的引導修正
- [ ] 新功能上線時主動介紹

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 5

---

### US-ONB-011: 影片教學資源
**角色**: restaurant_operator（餐廳操作員）
**優先級**: P2
**狀態**: Active

**故事**: 作為餐廳操作員，我希望能觀看教學影片學習操作，以便在有空時自主學習

**驗收標準**:
- [ ] 基礎操作影片（1-2 分鐘）
- [ ] 進階功能影片（3-5 分鐘）
- [ ] 影片觀看進度追蹤
- [ ] 問題排除指南

**來源**: [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) Section 5

---

## 功能需求對照表

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 快速註冊 | ✅ | ✅ | ❌ | US-ONB-001, US-ONB-002 |
| 信任等級 | ✅ | ✅ | ✅ | US-ONB-003 |
| 供應商推薦 | ✅ | ❌ | 👁️ | US-ONB-004 |
| 首單引導 | ✅ | ❌ | ❌ | US-ONB-005 |
| 產品目錄導入 | ❌ | ✅ | 👁️ | US-ONB-006 |
| 定價策略 | ❌ | ✅ | 👁️ | US-ONB-007 |
| 互動式導覽 | ✅ | ✅ | ✅ | US-ONB-008 |
| 客戶邀請 | ❌ | ✅ | 👁️ | US-ONB-009 |
| 情境式提示 | ✅ | ✅ | ✅ | US-ONB-010 |
| 影片教學 | ✅ | ✅ | ✅ | US-ONB-011 |

> 圖例: ✅ 完整功能 | 👁️ 僅檢視 | ❌ 不適用

---

## 信任等級系統

| 等級 | 驗證要求 | 單筆限額 | 每日限額 | 功能權限 |
|------|---------|---------|---------|----------|
| Basic | Email + 手機 | NT$10,000 | NT$50,000 | 小額交易 |
| Verified | 統編查驗 | NT$100,000 | NT$500,000 | 標準交易 |
| Certified | 營業執照審核 | 無限制 | 無限制 | 完整功能、供應鏈金融 |

---

## 相關文件
- [PRD-Onboarding-Process.md](../../2-PRD/PRD-Onboarding-Process.md) - 導入流程完整 PRD
- [01-auth-user-management.md](./01-auth-user-management.md) - 用戶管理
- [08-referral-system.md](./08-referral-system.md) - 推薦系統
