# 商品與 SKU 管理 User Stories

> 來源: [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4, [PRD-SKU-Sharing-System.md](../../2-PRD/PRD-SKU-Sharing-System.md)
> 最後更新: 2025-12-18
> 狀態: Active
> 總計: 20 User Stories (P0: 14, P1: 4, P2: 2)

## 概述
本模組涵蓋所有與商品目錄、SKU 管理、分類、過敏原、庫存相關的 User Story。

**說明**：本模組為訂單建立的前置條件（訂單品項必須來自商品/SKU）。

### 三大核心擴充情境

本模組在基礎功能之外，新增以下三大核心使用情境：

1. **多供應商同一 SKU 名稱整合** (US-PRD-011~013)：解決不同供應商對相同 SKU 命名不一致的問題
2. **SKU 圖片統一與維護機制** (US-PRD-014~016)：確保商品圖片品質一致性和審核流程
3. **品牌與子品牌欄位設計** (US-PRD-017~020)：支援有品牌商品與無品牌商品並存的分類管理

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

### US-PRD-011: 避免重複建立已存在的 SKU
**角色**: supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商操作員，我希望在新增商品時系統能自動比對我輸入的商品名稱與平台既有商品名稱，提示可能的相同 SKU，以便避免因命名差異重複建立已存在的商品

**驗收標準**:
- [ ] **名稱比對提示**：當操作員輸入商品名稱時，系統即時顯示可能相同的商品清單供選擇
- [ ] **避免重複建立**：選擇已有 SKU 時，系統將該供應商與現有 SKU 關聯（登錄為別名）
- [ ] **新增新商品流程**：確認為全新品項時，可繼續新增，系統自動記錄此名稱為 SKU 別名
- [ ] 比對演算法支援模糊搜尋和同義詞匹配
- [ ] 比對響應時間 <300ms

**來源**: PRD-SKU-Management-Enhanced (SKU 別名整合情境)

---

### US-PRD-012: 管理 SKU 名稱別名與整合
**角色**: data_steward（平台資料管理員）
**優先級**: P0
**狀態**: Active

**故事**: 作為平台資料管理員，我希望能查看並管理相同 SKU 的不同供應商命名（別名），對名稱意義相同但表述不同的商品進行合併或標記，以便平台資料保持一致

**驗收標準**:
- [ ] **別名查看**：可在後台看到某一 SKU 關聯的所有別名列表，包括對應供應商
- [ ] **合併別名**：可將判定為相同商品的多個名稱合併為同一 SKU 的別名
- [ ] **名稱修正提案**：可對不一致命名提出修正，通知相關供應商並保留原別名備查
- [ ] 合併後搜尋任一別名都指向同一商品資料
- [ ] 操作日誌完整記錄所有合併和修正操作

**來源**: PRD-SKU-Management-Enhanced (SKU 別名整合情境)

---

### US-PRD-013: 設定商品命名規則與自動匹配參數
**角色**: platform_admin（平台管理員）
**優先級**: P0
**狀態**: Active

**故事**: 作為平台管理員，我希望能制定整體的商品命名規範與自動匹配的邏輯參數，以便系統在多供應商名稱比對時有統一依據

**驗收標準**:
- [ ] **命名規範設定**：可設定名稱字數限制、禁用字符、是否允許品牌名稱等規則
- [ ] **同義詞庫管理**：可維護商品名稱同義詞/縮寫庫，供系統自動比對參考
- [ ] **匹配演算法參數**：可調整名稱自動比對的相似度門檻
- [ ] 規則變更即時生效於所有供應商的新增商品流程
- [ ] 不符規則的名稱提示錯誤並建議修改

**來源**: PRD-SKU-Management-Enhanced (SKU 別名整合情境)

---

### US-PRD-014: 上傳商品圖片並等待審核
**角色**: supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商操作員，我希望能為我提供的商品 SKU 上傳圖片，但圖片在平台審核通過前不會立即對外顯示，以便平台能確保所有上架圖片符合品質與規範

**驗收標準**:
- [ ] **圖片上傳**：上傳後圖片狀態為「待審核」，提示「圖片已上傳，待平台審核後公開顯示」
- [ ] **審核前不可見**：待審核圖片不在前台顯示，使用原有圖片或預設佔位圖
- [ ] **狀態通知**：審核批准或拒絕後系統通知供應商，後台可見狀態更新
- [ ] 支援多圖片上傳，單張圖片大小限制 5MB
- [ ] 支援 JPG、PNG、WebP 格式

**來源**: PRD-SKU-Management-Enhanced (SKU 圖片管理情境)

---

### US-PRD-015: 審核並維護 SKU 主圖片
**角色**: data_steward（平台資料管理員）
**優先級**: P0
**狀態**: Active

**故事**: 作為平台資料管理員，我希望能審核所有供應商為某 SKU 上傳的圖片，選擇最佳的作為主圖片顯示，確保每個 SKU 對外只有一張高品質且符合規範的主圖片

**驗收標準**:
- [ ] **圖片審核流程**：可查看待審核圖片清單，執行批准或拒絕操作，拒絕需填寫原因
- [ ] **唯一主圖片機制**：每個 SKU 前台展示有且僅有一張主圖片，可設定或更改
- [ ] **品質與規範檢查**：審核時檢驗圖片是否符合解析度、背景、無水印等規範
- [ ] 品牌官方圖片或品質較佳圖片優先選為主圖片
- [ ] 其他已核可圖片作為備用圖片庫

**來源**: PRD-SKU-Management-Enhanced (SKU 圖片管理情境)

---

### US-PRD-016: 圖片優先權與預設圖片管理
**角色**: platform_admin（平台管理員）
**優先級**: P0
**狀態**: Active

**故事**: 作為平台管理員，我希望能制定 SKU 圖片的優先使用順序規則，以及在 SKU 尚無可用圖片時設定預設圖片，以維持平台商品展示的一致性和完整性

**驗收標準**:
- [ ] **圖片優先權規則**：可設定圖片選用順序（如：官方圖 > 主圖 > 預設圖）
- [ ] **預設圖片配置**：可為不同品類設定預設佔位圖片
- [ ] **規則動態應用**：設定更新後前台顯示即時反映
- [ ] 無圖片 SKU 正確顯示對應類別的預設圖，無空白或破圖
- [ ] 支援批量設定和更新預設圖片

**來源**: PRD-SKU-Management-Enhanced (SKU 圖片管理情境)

---

### US-PRD-017: 為有品牌商品選擇品牌/子品牌
**角色**: supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商操作員，當我新增一個有品牌的商品（例如 Zespri 奇異果）時，我希望能在商品資料中選擇該商品的品牌以及子品牌（如適用），以便平台記錄該 SKU 所屬品牌

**驗收標準**:
- [ ] **品牌選擇清單**：商品表單中存在「品牌」下拉清單，可搜尋匹配現有品牌
- [ ] **新品牌請求**：若無該品牌，可提交新品牌請求待審核
- [ ] **子品牌欄位**：選擇品牌後顯示對應的子品牌/系列選擇清單
- [ ] **資料儲存**：提交後 SKU 記錄正確的 Brand_ID 和 SubBrand_ID
- [ ] 前台商品詳情頁正確顯示品牌名稱

**來源**: PRD-SKU-Management-Enhanced (品牌欄位設計情境)

---

### US-PRD-018: 新增無品牌 SKU 的標註
**角色**: supplier_operator（供應商操作員）
**優先級**: P0
**狀態**: Active

**故事**: 作為供應商操作員，當我新增一個沒有品牌的商品（例如散裝蔬菜），我希望能明確標註該 SKU 為「無品牌」，且系統允許品牌欄位留空

**驗收標準**:
- [ ] **品牌欄位選項**：品牌下拉清單提供「(無品牌)」選項
- [ ] **必填規則**：選擇「無品牌」或可無品牌分類時，不要求填寫品牌名稱
- [ ] **資料標記**：提交後品牌欄位記錄為空值或特殊標記（brand_id = NULL）
- [ ] 前台商品列表和詳情頁對無品牌 SKU 不顯示品牌資訊
- [ ] 特定分類（如蔬菜、散裝）自動默認為無品牌可選

**來源**: PRD-SKU-Management-Enhanced (品牌欄位設計情境)

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

### US-PRD-019: 維護品牌/子品牌清單與分類
**角色**: data_steward（平台資料管理員）
**優先級**: P1
**狀態**: Active

**故事**: 作為平台資料管理員，我希望能管理平台的品牌與子品牌資料庫，包括新增品牌、審核供應商提交的品牌請求，以及對錯誤或重複的品牌條目進行修正合併

**驗收標準**:
- [ ] **品牌新增請求審核**：可在後台審核供應商提交的新品牌請求，批准或拒絕
- [ ] **品牌資料維護**：可執行編輯或合併操作，將重複條目合併為單一正規品牌
- [ ] **子品牌管理**：可為某品牌新增、修改或刪除子品牌
- [ ] 合併後相關 SKU 的品牌欄位自動統一更新
- [ ] 刪除或更名子品牌時，已使用該子品牌的 SKU 資料保持一致

**來源**: PRD-SKU-Management-Enhanced (品牌欄位設計情境)

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

### US-PRD-020: 品牌欄位設定與分類應用
**角色**: platform_admin（平台管理員）
**優先級**: P2
**狀態**: Active

**故事**: 作為平台管理員，我希望能對品牌/子品牌欄位的使用制定規則（例如哪些商品分類必須有品牌、哪些可以無品牌），並在前台提供按品牌分類或篩選的功能

**驗收標準**:
- [ ] **欄位規則設定**：可設定各商品分類是否強制要求品牌（如電子產品必填，農產品選填）
- [ ] **前台品牌篩選**：商品列表頁提供按照品牌或子品牌過濾的功能
- [ ] **分類顯示**：品牌和子品牌作為獨立欄位顯示，無品牌商品隱藏該欄位
- [ ] 規則設定後供應商新增 SKU 時自動套用必填/選填邏輯
- [ ] 品牌名稱可點擊查看該品牌下其他商品

**來源**: PRD-SKU-Management-Enhanced (品牌欄位設計情境)

---

## 功能需求對照表

### 基礎功能

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

### SKU 別名整合功能

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| SKU 重複比對提示 | ❌ | ✅ | 👁️ | US-PRD-011 |
| SKU 別名管理 | ❌ | 👁️ | ✅ | US-PRD-012 |
| 命名規則設定 | ❌ | ❌ | ✅ | US-PRD-013 |

### SKU 圖片管理功能

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 圖片上傳 | ❌ | ✅ | ✅ | US-PRD-014 |
| 圖片審核與主圖設定 | ❌ | 👁️ | ✅ | US-PRD-015 |
| 預設圖片管理 | ❌ | ❌ | ✅ | US-PRD-016 |

### 品牌管理功能

| 功能 | 餐廳端 | 供應端 | 平台端 | User Story |
|------|:------:|:------:|:------:|------------|
| 品牌/子品牌選擇 | 👁️ | ✅ | ✅ | US-PRD-017 |
| 無品牌標註 | 👁️ | ✅ | ✅ | US-PRD-018 |
| 品牌清單維護 | ❌ | ❌ | ✅ | US-PRD-019 |
| 品牌篩選規則 | ✅ | ❌ | ✅ | US-PRD-020 |

**圖例說明**：✅ 完整功能 | 👁️ 僅檢視 | ❌ 無權限

---

## 角色定義

本模組涉及以下角色：

| 角色代碼 | 角色名稱 | 職責說明 |
|---------|---------|---------|
| restaurant_operator | 餐廳操作員/採購/主廚 | 商品搜尋、檢視、採購決策 |
| restaurant_manager | 餐廳經理 | 多供應商比較、採購審批 |
| restaurant_admin | 餐廳管理者/老闆 | 成本追蹤、稅務報表 |
| supplier_operator | 供應商操作員 | SKU 新增、圖片上傳、庫存更新 |
| supplier_manager | 供應商經理/業務/品控 | 定價策略、認證管理 |
| supplier_admin | 供應商管理者 | 批量上傳、整體商品策略 |
| platform_admin | 平台管理員 | 命名規則、圖片優先權、品牌規則設定 |
| **data_steward** | **平台資料管理員** | **SKU 別名管理、圖片審核、品牌清單維護** |

> **新增角色**：`data_steward`（平台資料管理員）專責 SKU 資料品質管理，包括別名整合、圖片審核、品牌維護等。

---

## 技術設計參考

### SKU 別名資料模型

```sql
-- 商品名稱別名表
CREATE TABLE sku_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
  alias_name VARCHAR(200) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(sku_id, alias_name),
  INDEX idx_alias_name (alias_name)
);
```

### 圖片管理資料模型

```sql
-- SKU 圖片表
CREATE TABLE sku_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  image_url VARCHAR(500) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  is_primary BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  rejected_reason TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_sku_status (sku_id, status),
  INDEX idx_pending (status) WHERE status = 'pending'
);

-- 類別預設圖片表
CREATE TABLE category_default_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),

  UNIQUE(category_id)
);
```

### 品牌/子品牌資料模型

```sql
-- 品牌表
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_en VARCHAR(100),
  logo_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT false,
  status ENUM('active', 'pending', 'inactive') DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  INDEX idx_brand_name (name),
  INDEX idx_brand_status (status)
);

-- 子品牌表
CREATE TABLE sub_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(brand_id, name)
);

-- SKU 表擴展欄位
ALTER TABLE skus ADD COLUMN IF NOT EXISTS (
  brand_id UUID REFERENCES brands(id),
  sub_brand_id UUID REFERENCES sub_brands(id)
);
```

### API 端點參考

```
# SKU 別名管理
GET    /api/v1/products/{skuId}/aliases        # 取得 SKU 別名列表
POST   /api/v1/products/{skuId}/aliases        # 新增別名
PUT    /api/v1/products/aliases/merge          # 合併別名
DELETE /api/v1/products/{skuId}/aliases/{id}   # 刪除別名

# 圖片管理
GET    /api/v1/products/{skuId}/images         # 取得 SKU 圖片列表
POST   /api/v1/products/{skuId}/images         # 上傳圖片
PUT    /api/v1/products/{skuId}/images/{id}    # 審核圖片 (approve/reject)
PUT    /api/v1/products/{skuId}/images/{id}/primary  # 設為主圖片
GET    /api/v1/categories/{id}/default-image   # 取得類別預設圖
PUT    /api/v1/categories/{id}/default-image   # 設定類別預設圖

# 品牌管理
GET    /api/v1/brands                          # 取得品牌列表
POST   /api/v1/brands                          # 新增品牌（或請求審核）
PUT    /api/v1/brands/{id}                     # 更新品牌
POST   /api/v1/brands/{id}/approve             # 審核品牌
GET    /api/v1/brands/{id}/sub-brands          # 取得子品牌列表
POST   /api/v1/brands/{id}/sub-brands          # 新增子品牌
PUT    /api/v1/brands/merge                    # 合併品牌
```

---

## 相關文件
- [PRD-Complete.md](../../2-PRD/PRD-Complete.md) Section 4 - 商品目錄與 SKU 管理系統
- [PRD-SKU-Sharing-System.md](../../2-PRD/PRD-SKU-Sharing-System.md) - SKU 共享與獨占機制
- [Database-Schema-Core.md](../../Database-Schema-Core.md) - 資料庫核心架構
- [API-Endpoints-Essential.md](../../API-Endpoints-Essential.md) - API 端點規格
- [03-order-management.md](./03-order-management.md) - 訂單管理（依賴商品/SKU）
