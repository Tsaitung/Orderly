# 新模組開發指南

## 快速開始

### 1. 創建新模組目錄

```bash
# 在 app/(dashboard) 下創建新模組
mkdir -p app/\(dashboard\)/warehouse
cd app/\(dashboard\)/warehouse
```

### 2. 創建佈局文件

```typescript
// app/(dashboard)/warehouse/layout.tsx
import { DashboardLayout } from '@/components/layouts/core'

interface WarehouseLayoutProps {
  children: React.ReactNode
}

export default function WarehouseLayout({ children }: WarehouseLayoutProps) {
  const navigationItems = [
    {
      title: '庫存總覽',
      href: '/warehouse',
      icon: Package,
      description: '查看整體庫存狀況'
    },
    {
      title: '入庫管理',
      href: '/warehouse/inbound',
      icon: ArrowUpCircle
    },
    {
      title: '出庫管理',
      href: '/warehouse/outbound',
      icon: ArrowDownCircle
    }
  ]

  return (
    <DashboardLayout
      role="warehouse"
      navigationItems={navigationItems}
      title="倉庫管理系統"
    >
      {children}
    </DashboardLayout>
  )
}
```

### 3. 創建主頁面

```typescript
// app/(dashboard)/warehouse/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '倉庫總覽 - Orderly',
  description: '查看庫存狀況和倉庫運營指標'
}

export default function WarehouseDashboardPage() {
  return (
    <div className="page-section">
      {/* 頁面標題 */}
      <div className="content-section">
        <h1 className="text-3xl font-bold text-gray-900">
          倉庫總覽
        </h1>
        <p className="text-gray-600">
          查看庫存狀況、入出庫記錄和關鍵運營指標
        </p>
      </div>

      {/* 關鍵指標 */}
      <div className="dashboard-grid">
        <MetricCard
          title="總庫存"
          value="12,543"
          unit="件"
          trend="up"
          change="+5.2%"
          icon={Package}
        />
        <MetricCard
          title="今日入庫"
          value="234"
          unit="件"
          trend="neutral"
          icon={ArrowUpCircle}
        />
        <MetricCard
          title="今日出庫"
          value="189"
          unit="件"
          trend="down"
          change="-2.1%"
          icon={ArrowDownCircle}
        />
        <MetricCard
          title="庫存周轉率"
          value="8.5"
          unit="次/月"
          trend="up"
          change="+1.2%"
          icon={RefreshCw}
        />
      </div>

      {/* 主要內容區域 */}
      <div className="content-grid">
        <div className="xl:col-span-2">
          <InventoryTable />
        </div>
        <div className="xl:col-span-1">
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
```

## 組件使用規範

### 1. 基礎組件

#### MetricCard (數據卡片)

```typescript
import { MetricCard } from '@/components/ui/metric-card'

<MetricCard
  title="標題"
  value="數值"
  unit="單位"
  trend="up" | "down" | "neutral"
  change="+5.2%"
  icon={Icon}
  colorScheme="primary" | "success" | "warning" | "danger"
/>
```

#### DataTable (數據表格)

```typescript
import { DataTable } from '@/components/ui/data-table'

<DataTable
  columns={columns}
  data={data}
  searchable
  filterable
  pagination
  className="card-padding"
/>
```

#### QuickActions (快速操作)

```typescript
import { QuickActions } from '@/components/ui/quick-actions'

const actions = [
  {
    title: '新增庫存',
    icon: Plus,
    href: '/warehouse/add',
    variant: 'primary'
  },
  {
    title: '導出報表',
    icon: Download,
    onClick: handleExport,
    variant: 'outline'
  }
]

<QuickActions actions={actions} />
```

### 2. 佈局組件

#### SectionContainer (區塊容器)

```typescript
<SectionContainer
  title="區塊標題"
  subtitle="區塊描述"
  action={<Button>操作按鈕</Button>}
>
  {/* 內容 */}
</SectionContainer>
```

#### ContentGrid (內容網格)

```typescript
<ContentGrid
  columns={{ default: 1, md: 2, lg: 3, xl: 4 }}
  gap="md"
>
  {children}
</ContentGrid>
```

## 樣式規範

### 1. 間距類別

```css
/* 頁面級間距 */
.page-section       /* space-y-6 (24px) */
.content-section    /* space-y-4 (16px) */
.item-spacing       /* space-y-2 (8px) */

/* 內邊距 */
.container-padding  /* p-6 (24px) */
.card-padding      /* p-4 (16px) */
.compact-padding   /* p-2 (8px) */

/* 網格 */
.dashboard-grid    /* 響應式 1-2-3-4 列 */
.content-grid      /* 響應式 1-1-1-3 列 */
```

### 2. 顏色應用

```typescript
// 主題色彩
const themeColors = {
  primary: 'text-primary-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  neutral: 'text-gray-600',
}

// 背景色彩
const backgroundColors = {
  primary: 'bg-primary-50',
  success: 'bg-green-50',
  warning: 'bg-yellow-50',
  danger: 'bg-red-50',
  neutral: 'bg-gray-50',
}
```

### 3. 響應式設計

```css
/* 移動端優先 */
.responsive-text {
  @apply text-sm;
  @apply md:text-base;
  @apply lg:text-lg;
}

.responsive-padding {
  @apply p-3;
  @apply md:p-4;
  @apply lg:p-6;
}

.responsive-grid {
  @apply grid grid-cols-1;
  @apply md:grid-cols-2;
  @apply lg:grid-cols-3;
  @apply xl:grid-cols-4;
}
```

## 主題配置

### 1. 新角色主題

```typescript
// lib/theme/roles.ts
export const roleThemes = {
  warehouse: {
    primary: '#7C3AED', // Purple 600
    accent: '#6D28D9', // Purple 700
    background: '#F5F3FF', // Purple 50
    foreground: '#1F2937', // Gray 800
  },
}
```

### 2. 註冊新主題

```typescript
// components/layouts/core/DashboardProvider.tsx
const ROLE_THEMES = {
  restaurant: restaurantTheme,
  supplier: supplierTheme,
  platform: platformTheme,
  warehouse: warehouseTheme, // 新增
}
```

## 路由配置

### 1. 頁面結構

```
app/(dashboard)/warehouse/
├── layout.tsx              # 模組佈局
├── page.tsx               # 主頁面
├── inbound/
│   ├── page.tsx          # 入庫管理
│   └── [id]/
│       └── page.tsx      # 入庫詳情
├── outbound/
│   ├── page.tsx          # 出庫管理
│   └── [id]/
│       └── page.tsx      # 出庫詳情
└── settings/
    └── page.tsx          # 倉庫設定
```

### 2. 導航配置

```typescript
// 在 layout.tsx 中配置導航
const navigationItems = [
  {
    title: '總覽',
    href: '/warehouse',
    icon: Home,
    active: pathname === '/warehouse',
  },
  {
    title: '入庫管理',
    href: '/warehouse/inbound',
    icon: ArrowUpCircle,
    badge: inboundCount,
  },
  {
    title: '出庫管理',
    href: '/warehouse/outbound',
    icon: ArrowDownCircle,
    badge: outboundCount,
  },
  {
    title: '設定',
    href: '/warehouse/settings',
    icon: Settings,
  },
]
```

## 測試規範

### 1. 視覺回歸測試

```typescript
// tests/visual/warehouse.test.ts
describe('Warehouse Module Visual Tests', () => {
  test('dashboard layout consistency', async () => {
    await page.goto('/warehouse')
    await expect(page).toHaveScreenshot('warehouse-dashboard.png')
  })

  test('responsive breakpoints', async () => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page).toHaveScreenshot('warehouse-tablet.png')
  })
})
```

### 2. 無障礙測試

```typescript
// tests/a11y/warehouse.test.ts
describe('Warehouse Module Accessibility', () => {
  test('keyboard navigation', async () => {
    await page.goto('/warehouse')
    await page.keyboard.press('Tab')
    // 驗證焦點順序和可訪問性
  })

  test('screen reader compatibility', async () => {
    // 驗證 ARIA 標籤和語義化結構
  })
})
```

## 部署檢查清單

### 開發階段

- [ ] 使用 `DashboardLayout` 組件
- [ ] 遵循間距規範 (24px/16px/8px)
- [ ] 確保響應式設計
- [ ] 觸控目標 ≥44px
- [ ] 使用設計令牌，避免硬編碼

### 代碼審查

- [ ] 組件命名符合規範
- [ ] TypeScript 類型定義完整
- [ ] ESLint 檢查通過
- [ ] 無障礙測試通過

### 部署前

- [ ] 視覺回歸測試通過
- [ ] 性能測試符合標準
- [ ] 跨瀏覽器兼容性驗證
- [ ] 文檔更新完成

遵循這個指南，你的新模組將自動獲得與現有系統一致的外觀和體驗，同時保持高度的可維護性和擴展性。
