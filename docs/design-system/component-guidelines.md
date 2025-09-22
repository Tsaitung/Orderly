# 組件使用指南

## 核心佈局組件

### DashboardLayout

統一的儀表板佈局組件，所有管理介面必須使用。

#### 基本用法

```typescript
import { DashboardLayout, NavigationItem, UserInfo } from '@/components/layouts/core'

const navigation: NavigationItem[] = [
  {
    title: '總覽',
    href: '/module',
    icon: Home,
    description: '查看模組概況'
  }
]

const userInfo: UserInfo = {
  name: '使用者名稱',
  email: 'user@example.com',
  role: '角色名稱',
  id: 'user-001'
}

export default function ModuleLayout({ children }) {
  return (
    <DashboardLayout
      role="restaurant"        // 必需：角色類型
      navigationItems={navigation}  // 必需：導航配置
      userInfo={userInfo}      // 可選：用戶資訊
      title="模組標題"         // 可選：頁面標題
      subtitle="模組描述"      // 可選：頁面描述
      spacing="normal"         // 可選：間距設定
      showDemoMode={true}      // 可選：顯示 Demo 模式
    >
      {children}
    </DashboardLayout>
  )
}
```

#### Props 說明

- `role`: 'restaurant' | 'supplier' | 'platform' | 'admin'
- `navigationItems`: NavigationItem[] - 側邊欄導航配置
- `userInfo`: UserInfo - 用戶資訊，顯示在側邊欄底部
- `title`: string - 頁面標題，顯示在頂部導航
- `spacing`: 'tight' | 'normal' | 'loose' - 間距配置
- `showDemoMode`: boolean - 是否顯示 Demo 模式橫幅

### NavigationItem 配置

```typescript
interface NavigationItem {
  title: string // 導航項目標題
  href: string // 路由路徑
  icon: LucideIcon // Lucide 圖標組件
  description?: string // 可選：描述文字（無障礙）
  badge?: number | string // 可選：徽章數字
  active?: boolean // 可選：是否為活躍狀態
  children?: NavigationItem[] // 可選：子導航
}
```

### UserInfo 配置

```typescript
interface UserInfo {
  name: string // 用戶姓名
  email: string // 電子郵件
  avatar?: string // 可選：頭像 URL
  role: string // 角色描述
  id: string // 用戶 ID
}
```

## 頁面內容結構規範

### 標準頁面結構

```typescript
export default function ModulePage() {
  return (
    <div className="space-y-6">
      {/* 頁面標題區塊 */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            頁面標題
          </h1>
          <p className="text-gray-600 mt-2">
            頁面描述
          </p>
        </div>
      </div>

      {/* 數據概覽 */}
      <ModuleOverview />

      {/* 快速操作 */}
      <QuickActions />

      {/* 主要內容網格 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {/* 主要內容 */}
        </div>
        <div className="xl:col-span-1">
          {/* 側邊內容 */}
        </div>
      </div>
    </div>
  )
}
```

## 主題系統

### 支援的角色主題

```typescript
type UserRole = 'restaurant' | 'supplier' | 'platform' | 'admin'

// 自動應用對應的主色調：
// restaurant: #A47864 (Mocha Mousse)
// supplier: #2563EB (Blue 600)
// platform: #6366F1 (Indigo 500)
// admin: #DC2626 (Red 600)
```

### 使用主題 Hook

```typescript
import { useDashboardTheme } from '@/components/layouts/core'

function MyComponent() {
  const { role, theme, getThemeClasses } = useDashboardTheme()

  return (
    <div className={getThemeClasses('primary')}>
      當前角色：{role}
    </div>
  )
}
```

## 間距系統

### CSS 工具類

```css
/* 頁面級間距 */
.page-section     /* space-y-6 (24px) */
.content-section  /* space-y-4 (16px) */
.item-spacing     /* space-y-2 (8px) */

/* 內邊距 */
.container-padding /* p-6 (24px) */
.card-padding     /* p-4 (16px) */
.compact-padding  /* p-2 (8px) */

/* 網格系統 */
.dashboard-grid   /* 響應式 1-2-3-4 列 */
.content-grid     /* 響應式 1-1-1-3 列 */
```

### 間距使用原則

1. **頁面級別**：使用 `space-y-6` (24px)
2. **區塊級別**：使用 `space-y-4` (16px)
3. **項目級別**：使用 `space-y-2` (8px)
4. **卡片內邊距**：使用 `p-4` (16px)
5. **容器內邊距**：使用 `p-6` (24px)

## 響應式設計

### 斷點系統

```css
sm: 640px   /* 大型手機 */
md: 768px   /* 平板 */
lg: 1024px  /* 小桌面 */
xl: 1280px  /* 大桌面 */
```

### 網格響應式

```css
/* 數據卡片 */
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4

/* 內容區域 */
grid-cols-1 xl:grid-cols-3
```

## 無障礙設計

### 必需遵循的標準

1. **觸控目標**：最小 44×44px
2. **色彩對比**：4.5:1 (WCAG AA)
3. **鍵盤導航**：所有功能可用鍵盤操作
4. **螢幕閱讀器**：正確的 ARIA 標籤

### 無障礙跳轉連結

```typescript
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary-500 text-white px-4 py-2 rounded-md"
>
  跳到主要內容
</a>
```

## 必需遵循的規範

### ✅ 強制要求

1. 所有管理介面必須使用 `DashboardLayout`
2. 遵循標準間距系統 (24px/16px/8px)
3. 使用響應式網格系統
4. 確保無障礙標準
5. 支援鍵盤導航

### ❌ 禁止事項

1. 不得自訂側邊欄寬度 (必須 240px)
2. 不得硬編碼間距值
3. 不得破壞響應式設計
4. 不得忽略無障礙要求
5. 不得使用自訂佈局組件

這些規範確保所有模組的一致性和可維護性。
