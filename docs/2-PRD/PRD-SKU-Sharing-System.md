# PRD: SKU 共享與獨占機制

## 📊 執行摘要

### 業務目標

建立 SKU 共享與獨占機制，平衡產品標準化需求與供應商差異化優勢，為餐廳提供更豐富的採購選擇，同時保護供應商的商業競爭力。

### 成功指標

- **SKU 共享率**：目標 >40% SKU 為共享型
- **供應商參與度**：>70% 供應商使用共享 SKU
- **餐廳採購效率**：選擇增加 30%，成本降低 5-10%
- **平台業務增長**：GMV 增長 20%，活躍度提升 15%

## 🎯 問題陳述

### 現有痛點

1. **供應商重複建立相同產品**：有機菠菜、雞蛋等標準品重複創建
2. **餐廳選擇受限**：相同產品需要搜尋多次才能比較不同供應商
3. **產品資訊不一致**：同樣商品在不同供應商有不同描述和規格
4. **競爭不透明**：供應商無法了解市場競爭情況

### 業務機會

- 建立行業標準化產品庫
- 提升餐廳採購體驗和效率
- 創造供應商良性競爭環境
- 增強平台網絡效應

## 👥 用戶角色與需求

### 供應商角色

#### 🔹 標準產品供應商

- **需求**：快速上架常見商品，專注於價格和服務競爭
- **痛點**：重複建立產品資料，無法看到競爭對手情況
- **目標**：降低管理成本，提升競爭力

#### 🔹 特色產品供應商

- **需求**：保護獨家產品和配方，維持差異化優勢
- **痛點**：擔心商業機密洩露，客戶被競爭對手搶走
- **目標**：保持產品獨特性，建立品牌價值

### 餐廳角色

#### 🔹 連鎖餐廳採購經理

- **需求**：快速比較同類產品，獲得最佳採購條件
- **痛點**：需要聯繫多家供應商詢價，效率低下
- **目標**：降低採購成本，提升採購效率

#### 🔹 精品餐廳主廚

- **需求**：尋找特色食材，追求產品品質和獨特性
- **痛點**：難以發現新的特色產品供應商
- **目標**：找到高品質特色食材，創造料理差異化

### 平台角色

#### 🔹 平台運營方

- **需求**：提升平台價值，增加用戶黏性和交易量
- **痛點**：重複產品數據管理成本高，用戶體驗分散
- **目標**：建立標準化產品庫，成為行業基礎設施

## 🔧 解決方案設計

### 核心概念

#### 🔗 共享型 SKU（Public/Shared SKU）

```typescript
interface SharedSKU {
  type: 'public'
  standardInfo: {
    name: string // 標準化商品名稱
    category: string // 統一分類
    specification: object // 標準規格描述
    unit: string // 計量單位
    description: string // 基礎描述
  }
  suppliers: SupplierSKU[] // 多個供應商參與
  visibility: 'public' // 所有供應商可見
  editPermission: 'platform_admin' // 平台統一管理
}
```

**特點**：

- ✅ 多供應商共同販售
- ✅ 標準化產品資訊
- ✅ 透明化價格競爭
- ✅ 餐廳可比價選擇

#### 🔒 獨占型 SKU（Private/Exclusive SKU）

```typescript
interface PrivateSKU {
  type: 'private'
  customInfo: {
    name: string // 自訂商品名稱
    category: string // 自選分類
    specification: object // 完全自訂規格
    description: string // 自訂描述
    secretAttributes: object // 保密屬性
  }
  owner: string // 唯一擁有者
  visibility: 'owner_only' // 僅擁有者可見
  editPermission: 'owner' // 擁有者完全控制
}
```

**特點**：

- ✅ 供應商專屬產品
- ✅ 完全自訂控制
- ✅ 商業機密保護
- ✅ 差異化競爭優勢

### 視覺設計規範

#### 顏色編碼系統

```css
/* 共享型 SKU - 藍色系（開放、透明） */
.sku-shared {
  --primary: #1890ff;
  --bg: #e6f7ff;
  --border: #91d5ff;
  --text: #0050b3;
}

/* 獨占型 SKU - 橙色系（獨特、專屬） */
.sku-private {
  --primary: #fa8c16;
  --bg: #fff7e6;
  --border: #ffd591;
  --text: #ad4e00;
}
```

#### 圖標系統

```tsx
// 共享型圖標
<Users className="w-4 h-4" />     // 多人協作
<Globe className="w-4 h-4" />     // 公開透明
<Link className="w-4 h-4" />      // 互聯共享

// 獨占型圖標
<Lock className="w-4 h-4" />      // 私有保護
<Star className="w-4 h-4" />      // 獨特性
<Shield className="w-4 h-4" />    // 安全防護
```

#### 標籤設計

```tsx
// 共享型標籤
<Badge className="bg-blue-50 text-blue-700 border-blue-200">
  <Users className="w-3 h-3 mr-1" />
  共享商品 · {supplierCount}家供應商
</Badge>

// 獨占型標籤
<Badge className="bg-orange-50 text-orange-700 border-orange-200">
  <Lock className="w-3 h-3 mr-1" />
  獨家商品
</Badge>
```

## 💾 技術架構設計

### 資料庫 Schema

#### 核心表結構

```sql
-- SKU 主表（擴展現有）
ALTER TABLE skus ADD COLUMN IF NOT EXISTS (
  type ENUM('public', 'private') NOT NULL DEFAULT 'private',
  creator_type ENUM('platform', 'supplier') NOT NULL DEFAULT 'supplier',
  creator_id UUID,
  standard_info JSONB DEFAULT NULL,  -- 共享型的標準化資訊
  approval_status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'approved',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1
);

-- 供應商 SKU 參與表（新增）
CREATE TABLE supplier_sku_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES skus(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,

  -- 供應商可自訂的參數
  custom_name VARCHAR(200),                    -- 自訂商品名稱
  selling_price DECIMAL(12,2) NOT NULL,       -- 銷售價格
  cost_price DECIMAL(12,2),                   -- 成本價格（加密存儲）
  currency VARCHAR(3) DEFAULT 'TWD',
  min_order_quantity INTEGER DEFAULT 1,
  max_order_quantity INTEGER,
  lead_time_days INTEGER DEFAULT 1,
  inventory_quantity INTEGER DEFAULT 0,
  delivery_zones JSONB DEFAULT '[]',          -- 配送區域

  -- 自訂屬性
  custom_attributes JSONB DEFAULT '{}',        -- 包裝、產地等
  supplier_notes TEXT,                         -- 供應商備註

  -- 狀態管理
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(sku_id, supplier_id)
);

-- SKU 審核記錄表（新增）
CREATE TABLE sku_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES skus(id),
  action_type ENUM('create', 'update', 'convert_to_public', 'approve', 'reject') NOT NULL,
  requested_by UUID REFERENCES users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  change_details JSONB NOT NULL,
  review_comments TEXT,

  INDEX idx_status (status),
  INDEX idx_sku (sku_id),
  INDEX idx_requested_by (requested_by)
);

-- SKU 訪問控制表（新增）
CREATE TABLE sku_access_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID REFERENCES skus(id),
  entity_type ENUM('supplier', 'restaurant', 'user_group') NOT NULL,
  entity_id UUID NOT NULL,
  permission_level ENUM('view', 'participate', 'edit') NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  UNIQUE(sku_id, entity_type, entity_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_sku_permission (sku_id, permission_level)
);

-- 索引優化
CREATE INDEX idx_skus_type_status ON skus(type, approval_status) WHERE type = 'public';
CREATE INDEX idx_skus_creator ON skus(creator_type, creator_id);
CREATE INDEX idx_supplier_participations_active ON supplier_sku_participations(is_active, updated_at);
```

#### 資料遷移策略

```sql
-- 步驟 1：分析現有 SKU 適合的類型
WITH sku_analysis AS (
  SELECT
    s.id,
    s.name,
    COUNT(DISTINCT sp.supplier_id) as supplier_count,
    CASE
      WHEN COUNT(DISTINCT sp.supplier_id) > 1 THEN 'public'
      ELSE 'private'
    END as suggested_type
  FROM skus s
  LEFT JOIN supplier_products sp ON s.id = sp.sku_id  -- 假設現有關聯表
  GROUP BY s.id, s.name
)

-- 步驟 2：更新 SKU 類型
UPDATE skus
SET type = sa.suggested_type,
    approval_status = CASE
      WHEN sa.suggested_type = 'public' THEN 'pending'
      ELSE 'approved'
    END
FROM sku_analysis sa
WHERE skus.id = sa.id;

-- 步驟 3：遷移現有供應商關係到新表
INSERT INTO supplier_sku_participations (
  sku_id, supplier_id, selling_price, inventory_quantity,
  min_order_quantity, is_active, joined_at
)
SELECT
  sku_id, supplier_id, price, stock_quantity,
  min_qty, is_active, created_at
FROM supplier_products  -- 現有的關聯表
WHERE is_active = true;
```

### API 設計

#### RESTful API 端點

```typescript
// SKU 管理 API
interface SKUManagementAPI {
  // 基礎 CRUD
  'GET    /api/v1/skus': GetSKUsRequest
  'GET    /api/v1/skus/:id': GetSKUDetailRequest
  'POST   /api/v1/skus': CreateSKURequest
  'PATCH  /api/v1/skus/:id': UpdateSKURequest
  'DELETE /api/v1/skus/:id': DeleteSKURequest

  // 搜尋和篩選
  'GET    /api/v1/skus/search': SearchSKUsRequest
  'GET    /api/v1/skus/suggestions': GetSKUSuggestionsRequest

  // 供應商參與
  'POST   /api/v1/skus/:id/join': JoinSKURequest
  'PATCH  /api/v1/skus/:id/participation': UpdateParticipationRequest
  'DELETE /api/v1/skus/:id/leave': LeaveSKURequest

  // 審核相關
  'POST   /api/v1/skus/:id/submit-review': SubmitForReviewRequest
  'POST   /api/v1/skus/:id/approve': ApproveSKURequest
  'POST   /api/v1/skus/:id/reject': RejectSKURequest

  // 類型轉換
  'POST   /api/v1/skus/:id/convert-to-public': ConvertToPublicRequest
}

// 請求/響應類型定義
interface CreateSKURequest {
  name: string
  type: 'public' | 'private'
  category_id: string
  specification: object
  base_unit: string
  description?: string
  initial_participation?: {
    selling_price: number
    min_order_quantity?: number
    custom_attributes?: object
  }
}

interface SearchSKUsRequest {
  query?: string
  type?: 'public' | 'private' | 'all'
  category_id?: string
  supplier_id?: string // 篩選特定供應商
  has_multiple_suppliers?: boolean // 僅多供應商的共享 SKU
  price_range?: [number, number]
  sort_by?: 'name' | 'price' | 'supplier_count' | 'created_at'
  page?: number
  page_size?: number
}

interface SKUDetailResponse {
  sku: {
    id: string
    name: string
    type: 'public' | 'private'
    category: CategoryInfo
    specification: object
    description: string
    approval_status: string
    creator: UserInfo
    created_at: string
  }
  participations: Array<{
    supplier: SupplierInfo
    selling_price: number
    min_order_quantity: number
    lead_time_days: number
    inventory_status: string
    custom_attributes: object
    is_active: boolean
  }>
  permissions: {
    can_edit: boolean
    can_participate: boolean
    can_view_costs: boolean
  }
}
```

#### 權限控制中間件

```typescript
class SKUAccessControl {
  // 檢查 SKU 查看權限
  async canViewSKU(userId: string, skuId: string): Promise<boolean> {
    const sku = await this.skuService.findById(skuId)
    const user = await this.userService.findById(userId)

    // 共享型 SKU：所有人可見
    if (sku.type === 'public') {
      return true
    }

    // 獨占型 SKU：僅創建者和授權用戶可見
    if (sku.type === 'private') {
      // 創建者可見
      if (sku.creator_id === user.supplier_id) {
        return true
      }

      // 檢查明確授權
      return await this.hasExplicitPermission(skuId, userId, 'view')
    }

    return false
  }

  // 檢查 SKU 參與權限（加入販售）
  async canParticipateSKU(userId: string, skuId: string): Promise<boolean> {
    const sku = await this.skuService.findById(skuId)
    const user = await this.userService.findById(userId)

    // 只有供應商可以參與販售
    if (user.role !== 'supplier') {
      return false
    }

    // 共享型 SKU：所有供應商可參與
    if (sku.type === 'public' && sku.approval_status === 'approved') {
      return true
    }

    // 獨占型 SKU：不允許其他供應商參與
    if (sku.type === 'private') {
      return sku.creator_id === user.supplier_id
    }

    return false
  }

  // 檢查 SKU 編輯權限
  async canEditSKU(userId: string, skuId: string): Promise<boolean> {
    const sku = await this.skuService.findById(skuId)
    const user = await this.userService.findById(userId)

    // 平台管理員有完全權限
    if (user.role === 'platform_admin') {
      return true
    }

    // 共享型 SKU：只有平台可編輯基礎資訊
    if (sku.type === 'public') {
      return false // 供應商只能編輯自己的參與參數
    }

    // 獨占型 SKU：創建者可編輯
    if (sku.type === 'private') {
      return sku.creator_id === user.supplier_id
    }

    return false
  }
}
```

## 🎨 前端實施方案

### SKU 卡片組件更新

#### 視覺區隔實施

```tsx
// components/skus/SKUCard.tsx
interface SKUCardProps {
  sku: SKU
  showSupplierInfo?: boolean
  onViewDetails: (skuId: string) => void
  onCompareSuppliers: (skuId: string) => void
}

const SKUCard: React.FC<SKUCardProps> = ({
  sku,
  showSupplierInfo = true,
  onViewDetails,
  onCompareSuppliers,
}) => {
  const isShared = sku.type === 'public'
  const supplierCount = sku.participations?.length || 0

  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      {/* Header: Type Badge and Status */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedSKUs.includes(sku.id)}
            onChange={() => handleSelectSKU(sku.id)}
            className="rounded border-gray-300"
          />

          {/* SKU 類型標籤 */}
          {isShared ? (
            <Badge className="border-blue-200 bg-blue-50 text-xs text-blue-700">
              <Users className="mr-1 h-3 w-3" />
              共享商品 · {supplierCount}家供應商
            </Badge>
          ) : (
            <Badge className="border-orange-200 bg-orange-50 text-xs text-orange-700">
              <Lock className="mr-1 h-3 w-3" />
              獨家商品
            </Badge>
          )}

          {/* 審核狀態 */}
          {sku.approval_status === 'pending' && (
            <Badge variant="outline" className="text-xs text-yellow-600">
              審核中
            </Badge>
          )}
        </div>
      </div>

      {/* Product Title */}
      <div className="mb-3">
        <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-tight text-gray-900">
          {sku.name}
        </h3>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-1">
          <Badge className="bg-gray-100 text-xs text-gray-700">
            {sku.category?.name || '未分類'}
          </Badge>

          {/* 庫存狀態 */}
          <Badge className={cn('text-xs', getStockStatusStyle(sku.inventory_status))}>
            {getStockStatusLabel(sku.inventory_status)}
          </Badge>
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-medium">
            {sku.sku_code}
          </span>
          <span className="ml-2 truncate text-gray-600">{sku.base_unit}</span>
        </div>

        {/* 規格資訊 */}
        <div className="line-clamp-2 text-gray-500">{formatSpecification(sku.specification)}</div>
      </div>

      {/* Price and Supplier Info */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        {isShared && supplierCount > 0 ? (
          // 共享 SKU - 顯示價格區間
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                NT$ {getMinPrice(sku.participations)} - {getMaxPrice(sku.participations)}
              </div>
              <div className="text-xs text-gray-500">{supplierCount} 家供應商報價</div>
            </div>
          </div>
        ) : (
          // 獨占 SKU - 顯示單一價格
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              NT$ {sku.participations?.[0]?.selling_price || '--'} / {sku.base_unit}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 flex-1 text-xs"
            onClick={() => onViewDetails(sku.id)}
          >
            <Eye className="mr-1 h-3 w-3" />
            查看詳情
          </Button>

          {isShared && supplierCount > 1 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => onCompareSuppliers(sku.id)}
            >
              <BarChart3 className="mr-1 h-3 w-3" />
              比較供應商
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" disabled>
              <UserCheck className="mr-1 h-3 w-3" />
              單一供應商
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// 輔助函數
const getMinPrice = (participations: Participation[]) =>
  Math.min(...participations.map(p => p.selling_price))

const getMaxPrice = (participations: Participation[]) =>
  Math.max(...participations.map(p => p.selling_price))

const formatSpecification = (spec: object) => {
  return Object.entries(spec)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' • ')
}

const getStockStatusStyle = (status: string) => {
  switch (status) {
    case 'in_stock':
      return 'bg-green-100 text-green-700'
    case 'low_stock':
      return 'bg-yellow-100 text-yellow-700'
    case 'out_of_stock':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getStockStatusLabel = (status: string) => {
  switch (status) {
    case 'in_stock':
      return '庫存充足'
    case 'low_stock':
      return '庫存偏低'
    case 'out_of_stock':
      return '缺貨'
    default:
      return '未知'
  }
}
```

### 供應商比較模態框

```tsx
// components/skus/SupplierComparisonModal.tsx
interface SupplierComparisonModalProps {
  sku: SharedSKU
  isOpen: boolean
  onClose: () => void
  onSelectSupplier: (supplierId: string) => void
}

const SupplierComparisonModal: React.FC<SupplierComparisonModalProps> = ({
  sku,
  isOpen,
  onClose,
  onSelectSupplier,
}) => {
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'delivery'>('price')

  const sortedParticipations = [...sku.participations].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.selling_price - b.selling_price
      case 'rating':
        return b.supplier.rating - a.supplier.rating
      case 'delivery':
        return a.lead_time_days - b.lead_time_days
      default:
        return 0
    }
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            供應商比較 - {sku.name}
          </DialogTitle>
          <DialogDescription>
            比較 {sku.participations.length} 家供應商的報價和服務條件
          </DialogDescription>
        </DialogHeader>

        {/* 排序控制 */}
        <div className="flex items-center gap-4 border-b py-4">
          <span className="text-sm font-medium">排序方式：</span>
          <div className="flex gap-2">
            {[
              { key: 'price', label: '價格', icon: DollarSign },
              { key: 'rating', label: '評分', icon: Star },
              { key: 'delivery', label: '交期', icon: Truck },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={sortBy === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(key as any)}
                className="flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* 供應商比較表格 */}
        <div className="grid gap-4">
          {sortedParticipations.map((participation, index) => (
            <Card key={participation.supplier.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-1 items-center gap-4">
                  {/* 排名標籤 */}
                  {index === 0 && sortBy === 'price' && (
                    <Badge className="bg-green-100 text-green-700">最低價</Badge>
                  )}

                  {/* 供應商資訊 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{participation.supplier.name}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-yellow-400" />
                        <span className="text-sm text-gray-600">
                          {participation.supplier.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      最小訂購量：{participation.min_order_quantity} {sku.base_unit}
                      {' • '}
                      交期：{participation.lead_time_days} 天
                    </div>
                  </div>

                  {/* 價格 */}
                  <div className="text-right">
                    <div className="text-lg font-semibold">NT$ {participation.selling_price}</div>
                    <div className="text-sm text-gray-500">/ {sku.base_unit}</div>
                  </div>

                  {/* 選擇按鈕 */}
                  <Button
                    onClick={() => onSelectSupplier(participation.supplier.id)}
                    className="ml-4"
                  >
                    選擇此供應商
                  </Button>
                </div>
              </div>

              {/* 詳細資訊 */}
              {participation.custom_attributes && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="text-sm text-gray-600">
                    {Object.entries(participation.custom_attributes).map(([key, value]) => (
                      <span key={key} className="mr-4">
                        {key}: {value as string}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### SKU 創建流程優化

```tsx
// components/skus/CreateSKUModal.tsx
const CreateSKUModal: React.FC<CreateSKUModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'search' | 'type' | 'details'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestedSKUs, setSuggestedSKUs] = useState<SKU[]>([])
  const [selectedType, setSelectedType] = useState<'public' | 'private'>('private')

  // 智能搜尋現有 SKU
  const searchExistingSKUs = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestedSKUs([])
        return
      }

      try {
        const response = await fetch(`/api/v1/skus/suggestions?q=${encodeURIComponent(query)}`)
        const { data } = await response.json()
        setSuggestedSKUs(data.filter((sku: SKU) => sku.type === 'public'))
      } catch (error) {
        console.error('搜尋失敗:', error)
      }
    }, 300),
    []
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>創建新 SKU</DialogTitle>
          <DialogDescription>
            {step === 'search' && '搜尋是否已有相似的共享商品'}
            {step === 'type' && '選擇 SKU 類型'}
            {step === 'details' && '填寫商品詳細資訊'}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">商品名稱</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  searchExistingSKUs(e.target.value)
                }}
                placeholder="例如：有機菠菜、雞蛋、牛肉..."
                className="mt-1"
              />
            </div>

            {/* 建議的共享 SKU */}
            {suggestedSKUs.length > 0 && (
              <div>
                <h4 className="mb-2 font-medium">發現相似的共享商品：</h4>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {suggestedSKUs.map(sku => (
                    <Card key={sku.id} className="cursor-pointer p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{sku.name}</div>
                          <div className="text-sm text-gray-500">
                            {sku.participations?.length || 0} 家供應商已在販售
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleJoinExistingSKU(sku.id)}>
                          加入販售
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={() => setStep('type')}>創建新商品</Button>
            </div>
          </div>
        )}

        {step === 'type' && (
          <div className="space-y-4">
            <div>
              <Label>選擇 SKU 類型</Label>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Card
                  className={cn(
                    'cursor-pointer p-4 transition-colors',
                    selectedType === 'public' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  )}
                  onClick={() => setSelectedType('public')}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">共享型 SKU</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    允許其他供應商也販售此商品，適合標準化產品
                  </div>
                  <div className="mt-2 text-xs text-blue-600">
                    ✓ 增加曝光機會
                    <br />
                    ✓ 良性價格競爭
                    <br />✓ 產品標準化
                  </div>
                </Card>

                <Card
                  className={cn(
                    'cursor-pointer p-4 transition-colors',
                    selectedType === 'private'
                      ? 'border-orange-500 bg-orange-50'
                      : 'hover:bg-gray-50'
                  )}
                  onClick={() => setSelectedType('private')}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">獨占型 SKU</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    專屬於您的特色商品，其他供應商無法看到
                  </div>
                  <div className="mt-2 text-xs text-orange-600">
                    ✓ 保護商業機密
                    <br />
                    ✓ 維持競爭優勢
                    <br />✓ 完全自主控制
                  </div>
                </Card>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('search')}>
                上一步
              </Button>
              <Button onClick={() => setStep('details')}>下一步</Button>
            </div>
          </div>
        )}

        {step === 'details' && (
          <CreateSKUForm
            type={selectedType}
            onSubmit={handleCreateSKU}
            onCancel={() => setStep('type')}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
```

## 📊 實施策略與時程

### 第一階段：基礎架構（2週）

**目標**：建立完整的資料模型和 API 基礎

**技術任務**：

- [x] 設計資料庫 Schema
- [ ] 實施資料庫遷移腳本
- [ ] 建立基礎 API 端點
- [ ] 實施權限控制中間件
- [ ] 編寫單元測試

**成功標準**：

- API 響應時間 < 100ms
- 權限控制測試覆蓋率 > 95%
- 資料遷移成功率 100%

### 第二階段：前端介面（2週）

**目標**：更新 SKU 管理介面，支援新的類型系統

**技術任務**：

- [ ] 更新 SKU 卡片組件
- [ ] 實施供應商比較功能
- [ ] 創建 SKU 流程優化
- [ ] 搜尋和篩選介面更新
- [ ] 響應式設計測試

**成功標準**：

- 新介面可用性測試分數 > 80
- 移動端適配完成度 100%
- 操作流程時間縮短 30%

### 第三階段：進階功能（1週）

**目標**：完善審核流程和智能推薦

**技術任務**：

- [ ] 實施審核工作流程
- [ ] 智能 SKU 推薦算法
- [ ] 批量操作功能
- [ ] 數據分析儀表板
- [ ] 性能優化

**成功標準**：

- 審核處理時間 < 24小時
- 推薦準確率 > 85%
- 頁面載入時間 < 2秒

### 第四階段：測試與部署（1週）

**目標**：全面測試並平滑上線

**技術任務**：

- [ ] 整合測試
- [ ] 性能壓力測試
- [ ] 安全滲透測試
- [ ] 用戶驗收測試
- [ ] 生產環境部署

**成功標準**：

- 零停機部署
- 系統穩定性 > 99.9%
- 用戶滿意度 > 85%

## 📈 成功指標與監控

### 業務指標

- **SKU 共享率**：40% 的 SKU 轉為共享型
- **供應商參與度**：70% 供應商使用共享 SKU
- **平均供應商數**：每個共享 SKU 平均 3+ 供應商
- **餐廳採購效率**：比價使用率 > 60%

### 技術指標

- **API 性能**：P95 響應時間 < 200ms
- **系統可用性**：99.9% uptime
- **錯誤率**：< 0.1%
- **資料一致性**：99.99%

### 用戶體驗指標

- **搜尋成功率**：> 85%
- **轉換率提升**：15% 的採購轉換率提升
- **用戶滿意度**：NPS > 50
- **功能使用率**：比較功能使用率 > 40%

## 🔒 安全與合規

### 資料保護

- 供應商成本價格加密存儲
- 獨占 SKU 完全隔離
- 敏感商業資訊存取日誌
- 符合 GDPR/個資法要求

### 訂問控制

- 基於角色的權限控制（RBAC）
- API 請求速率限制
- 敏感操作審核日誌
- 多層次驗證機制

## 📋 風險評估與緩解

| 風險項目           | 影響程度 | 發生機率 | 緩解措施                   |
| ------------------ | -------- | -------- | -------------------------- |
| 供應商抗拒共享機制 | 高       | 中       | 提供明確價值主張和獎勵機制 |
| 資料遷移失敗       | 高       | 低       | 完整備份和分階段遷移       |
| 性能下降           | 中       | 中       | 資料庫優化和快取策略       |
| 用戶體驗混亂       | 中       | 中       | 漸進式更新和使用者培訓     |
| 競爭資訊洩露       | 中       | 低       | 嚴格權限控制和資料脫敏     |

## 📚 相關文檔

- [現有 SKU 管理系統文檔](./PRD-Complete.md)
- [API 規格文檔](../0-Design/API-Endpoints-Essential.md)
- [資料庫設計文檔](../0-Design/Database-Schema-Core.md)
- [使用者介面設計系統](../0-Design/design-system/INDEX.md)

---

**文檔版本**：1.0  
**最後更新**：2025-01-21  
**負責人**：產品團隊  
**審核狀態**：待審核  
**相關文檔**：PRD-Onboarding-Process.md, PRD-Referral-System.md
