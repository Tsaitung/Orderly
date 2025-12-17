# Design System — Codebase Implementation

本文件聚焦於「如何在現有程式碼中落地 Design System」：`DashboardLayout`、導航配置、標準間距/網格、以及新增模組的最小樣板。

## 1) DashboardLayout（必用）

```ts
import { DashboardLayout, NavigationItem, UserInfo } from '@/components/layouts/core'

const navigation: NavigationItem[] = [
  { title: '總覽', href: '/module', icon: Home, description: '查看模組概況' },
]

const userInfo: UserInfo = {
  name: '使用者名稱',
  email: 'user@example.com',
  role: '角色名稱',
  id: 'user-001',
}

export default function ModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      role="restaurant"
      navigationItems={navigation}
      userInfo={userInfo}
      title="模組標題"
      subtitle="模組描述"
      spacing="normal"
      showDemoMode
    >
      {children}
    </DashboardLayout>
  )
}
```

### NavigationItem / UserInfo 參考

```ts
interface NavigationItem {
  title: string
  href: string
  icon: LucideIcon
  description?: string
  badge?: number | string
  active?: boolean
  children?: NavigationItem[]
}

interface UserInfo {
  name: string
  email: string
  avatar?: string
  role: string
  id: string
}
```

## 2) 標準頁面結構（建議）

```tsx
export default function ModulePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">頁面標題</h1>
          <p className="text-gray-600 mt-2">頁面描述</p>
        </div>
      </div>

      <ModuleOverview />
      <QuickActions />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">{/* 主要內容 */}</div>
        <div className="xl:col-span-1">{/* 側邊內容 */}</div>
      </div>
    </div>
  )
}
```

## 3) 佈局與尺寸約束（實作版）

- Sidebar 寬度固定 `240px`；大螢幕顯示，移動端隱藏。
- 主內容 padding 預設 `24px`（Tailwind: `p-6`）。

## 4) 間距與網格（Tailwind 工具類）

```css
.page-section { @apply space-y-6; }     /* 24px */
.content-section { @apply space-y-4; }  /* 16px */
.item-spacing { @apply space-y-2; }     /* 8px */

.container-padding { @apply p-6; }      /* 24px */
.card-padding { @apply p-4; }           /* 16px */
.compact-padding { @apply p-2; }        /* 8px */

.dashboard-grid {
  @apply grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4;
}
.content-grid {
  @apply grid gap-6 grid-cols-1 xl:grid-cols-3;
}
```

## 5) 角色主題（ROLE_THEMES 參考）

```ts
const ROLE_THEMES = {
  restaurant: { primary: '#A47864', accent: '#8B6F4D', background: '#FDF8F6', foreground: '#1F2937' },
  supplier: { primary: '#2563EB', accent: '#1D4ED8', background: '#EFF6FF', foreground: '#1F2937' },
  platform: { primary: '#6366F1', accent: '#4F46E5', background: '#EEF2FF', foreground: '#1F2937' },
  admin: { primary: '#DC2626', accent: '#B91C1C', background: '#FEF2F2', foreground: '#1F2937' },
}
```

## 6) 新模組最小樣板（App Router）

```bash
mkdir -p app/\\(dashboard\\)/warehouse
```

`app/(dashboard)/warehouse/layout.tsx`

```tsx
import { DashboardLayout } from '@/components/layouts/core'

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  const navigationItems = [
    { title: '庫存總覽', href: '/warehouse', icon: Package, description: '查看整體庫存狀況' },
    { title: '入庫管理', href: '/warehouse/inbound', icon: ArrowUpCircle },
    { title: '出庫管理', href: '/warehouse/outbound', icon: ArrowDownCircle },
  ]

  return (
    <DashboardLayout role="warehouse" navigationItems={navigationItems} title="倉庫管理系統">
      {children}
    </DashboardLayout>
  )
}
```

`app/(dashboard)/warehouse/page.tsx`

```tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '倉庫總覽 - Orderly',
  description: '查看庫存狀況和倉庫運營指標',
}

export default function WarehouseDashboardPage() {
  return (
    <div className="page-section">
      <div className="content-section">
        <h1 className="text-3xl font-bold text-gray-900">倉庫總覽</h1>
        <p className="text-gray-600">查看庫存狀況、入出庫記錄和關鍵運營指標</p>
      </div>

      <div className="dashboard-grid">{/* MetricCard... */}</div>

      <div className="content-grid">
        <div className="xl:col-span-2">{/* Table */}</div>
        <div className="xl:col-span-1">{/* Actions */}</div>
      </div>
    </div>
  )
}
```

