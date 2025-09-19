# 佈局系統規範

## 核心架構

### 統一佈局結構

所有管理介面必須遵循以下統一結構：

```
┌─────────────────────────────────────────────┐
│ DemoModeBanner (if applicable)              │
├─────────────┬───────────────────────────────┤
│             │ DashboardHeader               │
│ Sidebar     ├───────────────────────────────┤
│ (240px)     │                               │
│             │ Main Content Area             │
│             │ (padding: 24px)               │
│             │                               │
└─────────────┴───────────────────────────────┘
```

## 尺寸規範

### 側邊欄
- **寬度**: 240px (固定)
- **背景**: 白色 (`bg-white`)
- **邊框**: 右側 1px (`border-r border-gray-200`)
- **最小高度**: 100vh

### 主內容區域
- **左邊距**: 240px (大螢幕) / 0px (移動端)
- **內邊距**: 24px (`p-6`)
- **最大寬度**: 無限制 (flow with container)

### 響應式斷點
- **sm**: 640px - 移動端，側邊欄隱藏
- **md**: 768px - 平板，側邊欄隱藏
- **lg**: 1024px - 桌面，顯示側邊欄
- **xl**: 1280px - 大桌面

## 間距系統

### 標準間距
基於 4px 基準單位的間距系統：

```css
/* 頁面級間距 */
.page-section { @apply space-y-6; }        /* 24px - 頁面區塊間距 */
.content-section { @apply space-y-4; }     /* 16px - 內容區塊間距 */
.item-spacing { @apply space-y-2; }        /* 8px - 項目間距 */

/* 內邊距規範 */
.container-padding { @apply p-6; }         /* 24px - 容器內邊距 */
.card-padding { @apply p-4; }              /* 16px - 卡片內邊距 */
.compact-padding { @apply p-2; }           /* 8px - 緊湊內邊距 */
```

### 網格系統
統一的響應式網格：

```css
/* 數據卡片網格 */
.dashboard-grid {
  @apply grid gap-4;                        /* 基礎：16px 間距 */
  @apply grid-cols-1;                       /* 移動端：1列 */
  @apply md:grid-cols-2;                    /* 平板：2列 */
  @apply lg:grid-cols-3;                    /* 桌面：3列 */
  @apply xl:grid-cols-4;                    /* 大桌面：4列 */
}

/* 主要內容網格 */
.content-grid {
  @apply grid gap-6;                        /* 基礎：24px 間距 */
  @apply grid-cols-1;                       /* 移動端：1列 */
  @apply xl:grid-cols-3;                    /* 大桌面：3列 */
}
```

## 使用範例

### 基本佈局使用

```tsx
import { DashboardLayout } from '@/components/layouts/core'

export default function MyModulePage() {
  return (
    <DashboardLayout
      role="restaurant"                 // 或 "supplier", "platform"
      title="我的模組"
      subtitle="功能描述"
      spacing="normal"                  // "tight" | "normal" | "loose"
    >
      {/* 頁面標題區 */}
      <div className="page-section">
        <h1 className="text-3xl font-bold text-gray-900">頁面標題</h1>
        <p className="text-gray-600">頁面描述</p>
      </div>

      {/* 數據概覽 */}
      <div className="dashboard-grid">
        <MetricCard title="指標一" value="123" />
        <MetricCard title="指標二" value="456" />
        <MetricCard title="指標三" value="789" />
      </div>

      {/* 主要內容 */}
      <div className="content-grid">
        <div className="xl:col-span-2">
          {/* 主要內容 */}
        </div>
        <div className="xl:col-span-1">
          {/* 側邊內容 */}
        </div>
      </div>
    </DashboardLayout>
  )
}
```

### 側邊欄配置

```tsx
const navigationConfig = {
  role: 'restaurant',
  items: [
    {
      title: '儀表板概覽',
      href: '/restaurant',
      icon: Home,
      active: true
    },
    {
      title: '訂單管理',
      href: '/restaurant/orders',
      icon: ShoppingCart,
      badge: 12
    }
  ],
  userInfo: {
    name: '張小明',
    email: 'zhang@example.com',
    avatar: '/avatars/default.png'
  }
}
```

## 必須遵循的規範

### ✅ 必須執行
- 使用 `DashboardLayout` 作為頁面容器
- 遵循標準間距系統 (24px/16px/8px)
- 確保觸控目標 ≥44px
- 支援響應式設計 (mobile-first)
- 使用設計令牌，避免硬編碼顏色

### ❌ 禁止事項
- 自定義側邊欄寬度
- 硬編碼間距值
- 破壞響應式斷點
- 使用非標準的色彩
- 忽略無障礙要求

## 主題系統

### 角色主題配置
每個角色有獨特的主色調，但使用方式統一：

```tsx
const themeConfig = {
  restaurant: {
    primary: '#A47864',      // Mocha Mousse
    accent: '#8B6F4D',       // 深色變體
    background: '#FDF8F6'    // 淺色背景
  },
  supplier: {
    primary: '#2563EB',      // Blue 600
    accent: '#1D4ED8',       // Blue 700
    background: '#EFF6FF'    // Blue 50
  },
  platform: {
    primary: '#6366F1',      // Indigo 500
    accent: '#4F46E5',       // Indigo 600
    background: '#EEF2FF'    // Indigo 50
  }
}
```

### 主題應用原則
- **主色調**: 僅用於激活狀態、重要按鈕、關鍵資訊
- **背景色**: 大面積使用中性灰白色
- **語義色**: 成功(綠)、警告(黃)、錯誤(紅)保持一致

## 性能考量

### 佈局優化
- 使用 CSS Grid 取代 Flexbox 複雜佈局
- 側邊欄使用固定定位避免重排
- 響應式圖片和懶加載

### 代碼分割
- 按角色分割佈局組件
- 動態載入非關鍵組件
- 共享組件提取到公共包

這套佈局系統確保了所有管理介面的視覺一致性、用戶體驗一致性，並為未來的功能擴展提供了堅實的基礎。