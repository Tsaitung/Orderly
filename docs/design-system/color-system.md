# 顏色系統規範

## 品牌色彩體系

### 主色調定義

```typescript
const ROLE_THEMES = {
  restaurant: {
    primary: '#A47864', // Mocha Mousse - 餐廳主色
    accent: '#8B6F4D', // 深色變體
    background: '#FDF8F6', // 淺色背景
    foreground: '#1F2937', // 深色文字
  },
  supplier: {
    primary: '#2563EB', // Blue 600 - 供應商主色
    accent: '#1D4ED8', // Blue 700
    background: '#EFF6FF', // Blue 50
    foreground: '#1F2937', // 深色文字
  },
  platform: {
    primary: '#6366F1', // Indigo 500 - 平台主色
    accent: '#4F46E5', // Indigo 600
    background: '#EEF2FF', // Indigo 50
    foreground: '#1F2937', // 深色文字
  },
  admin: {
    primary: '#DC2626', // Red 600 - 管理員主色
    accent: '#B91C1C', // Red 700
    background: '#FEF2F2', // Red 50
    foreground: '#1F2937', // 深色文字
  },
}
```

## 顏色應用層級

### 1. 主色調應用原則

**限制使用場景**：主色調僅用於強調和重要元素

```css
/* 正確使用 - 激活狀態 */
.sidebar-active {
  @apply bg-primary-50 text-primary-700;
}

/* 正確使用 - CTA 按鈕 */
.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700;
}

/* 正確使用 - 重要連結 */
.link-primary {
  @apply text-primary-600 hover:text-primary-700;
}
```

### 2. 中性色系統

**大面積使用**：背景、邊框、次要文字

```css
/* 背景色階 */
.bg-surface-1 {
  @apply bg-white;
} /* 卡片背景 */
.bg-surface-2 {
  @apply bg-gray-50;
} /* 頁面背景 */
.bg-surface-3 {
  @apply bg-gray-100;
} /* 次要背景 */

/* 邊框色階 */
.border-subtle {
  @apply border-gray-200;
} /* 主要邊框 */
.border-muted {
  @apply border-gray-300;
} /* 強調邊框 */

/* 文字色階 */
.text-primary {
  @apply text-gray-900;
} /* 主要文字 */
.text-secondary {
  @apply text-gray-600;
} /* 次要文字 */
.text-muted {
  @apply text-gray-500;
} /* 輔助文字 */
.text-subtle {
  @apply text-gray-400;
} /* 提示文字 */
```

### 3. 語義色彩系統

**狀態和回饋**：成功、警告、錯誤、資訊

```css
/* 成功色彩 */
.text-success {
  @apply text-green-600;
}
.bg-success {
  @apply bg-green-50;
}
.border-success {
  @apply border-green-200;
}

/* 警告色彩 */
.text-warning {
  @apply text-yellow-600;
}
.bg-warning {
  @apply bg-yellow-50;
}
.border-warning {
  @apply border-yellow-200;
}

/* 錯誤色彩 */
.text-danger {
  @apply text-red-600;
}
.bg-danger {
  @apply bg-red-50;
}
.border-danger {
  @apply border-red-200;
}

/* 資訊色彩 */
.text-info {
  @apply text-blue-600;
}
.bg-info {
  @apply bg-blue-50;
}
.border-info {
  @apply border-blue-200;
}
```

## 主題動態切換

### CSS 變數系統

```css
:root {
  /* 基礎色彩變數 */
  --color-primary: #a47864;
  --color-accent: #8b6f4d;
  --color-background: #fdf8f6;
  --color-foreground: #1f2937;

  /* 語義色彩變數 */
  --color-success: #059669;
  --color-warning: #d97706;
  --color-danger: #dc2626;
  --color-info: #2563eb;
}

/* 餐廳主題 */
.theme-restaurant {
  --color-primary: #a47864;
  --color-accent: #8b6f4d;
  --color-background: #fdf8f6;
}

/* 供應商主題 */
.theme-supplier {
  --color-primary: #2563eb;
  --color-accent: #1d4ed8;
  --color-background: #eff6ff;
}
```

### 主題切換 Hook

```typescript
import { useDashboardTheme } from '@/components/layouts/core'

function ThemedComponent() {
  const { role, getThemeClasses } = useDashboardTheme()

  return (
    <div className={getThemeClasses('primary')}>
      角色：{role}
    </div>
  )
}
```

## 無障礙色彩標準

### 對比度要求

符合 WCAG 2.1 AA 標準的 **4.5:1** 對比度

```css
/* 正確 - 足夠對比度 */
.text-on-light {
  @apply text-gray-900;
} /* 對比度：15.83:1 */
.text-on-primary {
  @apply text-white;
} /* 對比度：5.12:1 */

/* 錯誤 - 對比度不足 */
.text-low-contrast {
  @apply text-gray-400;
} /* 對比度：3.1:1 ❌ */
```

### 色彩無關的狀態指示

不能僅依靠顏色傳達資訊

```typescript
// 正確 - 使用圖標 + 顏色
<Badge variant="success">
  <CheckCircle className="h-3 w-3 mr-1" />
  已完成
</Badge>

// 錯誤 - 僅使用顏色
<Badge variant="success">已完成</Badge>
```

## 組件中的顏色應用

### 按鈕顏色變體

```typescript
// 主要按鈕 - 使用主色調
<Button variant="solid" colorScheme="primary">
  主要操作
</Button>

// 次要按鈕 - 使用中性色
<Button variant="outline">
  次要操作
</Button>

// 危險操作 - 使用語義色
<Button variant="solid" colorScheme="red">
  刪除
</Button>
```

### 狀態徽章顏色

```typescript
// 使用語義色彩
<Badge variant="solid" colorScheme="green">已付款</Badge>
<Badge variant="solid" colorScheme="yellow">待付款</Badge>
<Badge variant="solid" colorScheme="red">逾期</Badge>
<Badge variant="outline" colorScheme="gray">草稿</Badge>
```

### 卡片和背景

```typescript
// 預設使用白色背景
<Card className="bg-white border-gray-200">
  標準卡片
</Card>

// 特殊狀態使用淺色主題背景
<Card className="bg-primary-50 border-primary-200">
  重要卡片
</Card>
```

## 顏色使用檢查清單

### ✅ 正確使用

1. **主色調**：僅用於激活狀態、CTA 按鈕、重要連結
2. **中性色**：大面積背景、邊框、普通文字
3. **語義色**：狀態指示、回饋訊息、警告提示
4. **對比度**：確保文字與背景對比度 ≥ 4.5:1
5. **一致性**：相同功能使用相同顏色

### ❌ 避免事項

1. **過度使用主色**：不要在所有元素都使用品牌色
2. **硬編碼顏色**：避免直接使用 hex 色碼
3. **忽略無障礙**：不檢查對比度或僅依賴顏色
4. **不一致應用**：同類功能使用不同顏色
5. **破壞主題系統**：繞過主題變數直接設定顏色

## 暗色模式準備

### 預留暗色主題變數

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1f2937;
    --color-foreground: #f9fafb;
    --color-surface-1: #374151;
    --color-surface-2: #4b5563;
    --color-border: #6b7280;
  }
}
```

### 使用相對顏色

```css
/* 推薦 - 使用語義化變數 */
.card {
  background-color: var(--color-surface-1);
  border-color: var(--color-border);
  color: var(--color-foreground);
}

/* 避免 - 硬編碼顏色 */
.card {
  background-color: #ffffff;
  border-color: #e5e7eb;
  color: #111827;
}
```

遵循這套顏色系統，確保介面顏色的一致性、可用性和美觀性。
