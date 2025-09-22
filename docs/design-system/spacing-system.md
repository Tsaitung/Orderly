# 間距系統規範

## 設計原則

基於 **4px 基準單位** 的間距系統，確保所有元素的間距和尺寸協調一致。

### 核心間距值

- **8px** (space-2) - 最小間距，用於細節元素
- **16px** (space-4) - 內容區塊間距
- **24px** (space-6) - **標準頁面間距（預設）**
- **32px** (space-8) - 寬鬆間距，用於大區塊

## 頁面層級間距

### 1. 頁面級間距 (Page Level)

```css
.page-section {
  @apply space-y-6; /* 24px - 主要區塊間距 */
}
```

**使用場景**：頁面內主要區塊之間的間距

### 2. 內容區塊間距 (Content Level)

```css
.content-section {
  @apply space-y-4; /* 16px - 內容區塊間距 */
}
```

**使用場景**：區塊內的子元素間距

### 3. 項目間距 (Item Level)

```css
.item-spacing {
  @apply space-y-2; /* 8px - 項目間距 */
}
```

**使用場景**：列表項目、表單欄位等小元素間距

## 內邊距系統

### 容器內邊距

```css
.container-padding {
  @apply p-6; /* 24px - 頁面容器標準內邊距 */
}

.card-padding {
  @apply p-4; /* 16px - 卡片標準內邊距 */
}

.compact-padding {
  @apply p-2; /* 8px - 緊湊內邊距 */
}
```

### 內邊距使用指南

- **頁面容器**：24px (`p-6`)
- **卡片組件**：16px (`p-4`)
- **按鈕內部**：8px (`p-2`)
- **輸入框內部**：12px (`px-3 py-3`)

## 響應式間距

### 基本原則

移動端使用較小間距，桌面端使用標準間距。

```css
/* 響應式容器內邊距 */
.responsive-container {
  @apply p-3; /* 12px 移動端 */
  @apply md:p-4; /* 16px 平板 */
  @apply lg:p-6; /* 24px 桌面 */
}

/* 響應式區塊間距 */
.responsive-section {
  @apply space-y-4; /* 16px 移動端 */
  @apply md:space-y-6; /* 24px 桌面 */
}
```

## 網格間距

### 數據卡片網格

```css
.dashboard-grid {
  @apply grid gap-4; /* 16px 基礎間距 */
  @apply grid-cols-1; /* 移動端 1列 */
  @apply md:grid-cols-2; /* 平板 2列 */
  @apply lg:grid-cols-3; /* 桌面 3列 */
  @apply xl:grid-cols-4; /* 大桌面 4列 */
}
```

### 主要內容網格

```css
.content-grid {
  @apply grid gap-6; /* 24px 較大間距 */
  @apply grid-cols-1; /* 移動端 1列 */
  @apply xl:grid-cols-3; /* 大桌面 3列 */
}
```

## 特殊間距場景

### 導航間距

```css
/* 側邊欄導航項目 */
.nav-item {
  @apply px-3 py-2; /* 水平 12px，垂直 8px */
  @apply space-y-1; /* 導航項目間 4px */
}

/* 頂部導航 */
.header-nav {
  @apply px-4 py-3; /* 16px × 12px */
  @apply space-x-6; /* 項目間 24px */
}
```

### 表單間距

```css
/* 表單欄位間距 */
.form-field {
  @apply space-y-2; /* 標籤與輸入框間 8px */
  @apply mb-4; /* 欄位間 16px */
}

/* 表單按鈕群組 */
.form-actions {
  @apply space-x-3; /* 按鈕間 12px */
  @apply mt-6; /* 與表單間 24px */
}
```

### 卡片間距

```css
/* 卡片內部結構 */
.card-header {
  @apply p-4 pb-2; /* 上左右 16px，下 8px */
}

.card-content {
  @apply p-4 pt-2; /* 下左右 16px，上 8px */
}

.card-footer {
  @apply p-4 pt-2; /* 下左右 16px，上 8px */
}
```

## 響應式間距系統 (2024.09 重大更新)

### 新增響應式間距工具類

```css
/* Dashboard 內容間距 - 響應式適配 */
.dashboard-content-spacing {
  @apply space-y-4 md:space-y-5 lg:space-y-6; /* 16px → 20px → 24px */
}

/* Dashboard 區塊間距 */
.dashboard-section-spacing {
  @apply space-y-3 md:space-y-4; /* 12px → 16px */
}

/* 頁面級響應式間距 */
.page-spacing {
  @apply space-y-3 sm:space-y-4 lg:space-y-5; /* 12px → 16px → 20px */
}

/* 卡片內容間距 */
.card-spacing {
  @apply space-y-2 sm:space-y-3 lg:space-y-4; /* 8px → 12px → 16px */
}

/* 緊湊間距 */
.compact-spacing {
  @apply space-y-2 sm:space-y-3; /* 8px → 12px */
}
```

### 間距堆疊問題修復 (2024.09.18)

#### 問題診斷

- **原因**: DashboardLayout + DashboardProvider + Page 三層間距累積
- **具體**: 24px + 24px + 24px = 72px 過度間距
- **影響**: 信息密度過低，用戶體驗差

#### 修復方案

1. **移除重複間距**: DashboardLayout 僅保留 padding，移除 spacing
2. **統一響應式間距**: 使用新的響應式間距工具類
3. **層級化間距**: 不同層級使用不同間距策略

#### 修復效果

- ✅ 間距減少 **50%** (72px → 32-40px)
- ✅ 信息密度提升，單屏顯示更多內容
- ✅ 移動端自動適配更緊湊間距
- ✅ 視覺更緊湊專業

## 向後兼容

### 舊有間距類別更新

```css
/* 更新後的間距定義 */
.spacing-tight {
  @apply space-y-4; /* 從 8px 更新為 16px */
}

.spacing-normal {
  @apply space-y-6; /* 標準 24px（不變）*/
}

.spacing-loose {
  @apply space-y-8; /* 寬鬆 32px（不變）*/
}
```

**重要變更**：`spacing-tight` 從過緊的 8px 調整為合理的 16px

## 使用範例

### 新版標準頁面結構 (2024.09)

```typescript
export default function ModulePage() {
  return (
    <div className="dashboard-content-spacing">    {/* 響應式頁面間距 */}
      <div className="compact-spacing">            {/* 緊湊標題區塊 */}
        <h1>頁面標題</h1>
        <p>描述文字</p>
      </div>

      <MetricOverview />                           {/* 核心指標 */}
      <QuickActions />                             {/* 快速操作 */}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5 lg:gap-6">
        <div className="xl:col-span-2 dashboard-section-spacing">
          <MainContent />
          <DetailChart />
        </div>

        <div className="xl:col-span-1 dashboard-section-spacing">
          <SidebarWidget />
          <AdditionalInfo />
        </div>
      </div>
    </div>
  )
}
```

### 舊版頁面結構 (已淘汰)

```typescript
// ❌ 避免 - 會造成間距堆疊問題
export default function OldModulePage() {
  return (
    <div className="space-y-6">              {/* 24px 固定間距 */}
      <div className="space-y-4">            {/* 16px 固定間距 */}
        {/* 在DashboardLayout中會累積成72px */}
      </div>
    </div>
  )
}
```

### 卡片組件範例

```typescript
function DataCard() {
  return (
    <Card className="card-padding space-y-4">    {/* 卡片內邊距與內容間距 */}
      <div className="space-y-2">               {/* 標題區塊 */}
        <h3>卡片標題</h3>
        <p>卡片描述</p>
      </div>

      <div className="space-y-3">               {/* 數據區塊 */}
        <DataItem />
        <DataItem />
      </div>

      <div className="pt-2 space-x-3">          {/* 操作按鈕區 */}
        <Button size="sm">查看</Button>
        <Button size="sm" variant="outline">編輯</Button>
      </div>
    </Card>
  )
}
```

## 設計檢查清單

### ✅ 必須遵循

1. 使用 4px 基準單位的倍數間距
2. 頁面級間距使用 24px (`space-y-6`)
3. 內容區塊間距使用 16px (`space-y-4`)
4. 卡片內邊距使用 16px (`p-4`)
5. 響應式間距適配不同螢幕尺寸

### ❌ 避免事項

1. 不要使用任意間距值（如 `space-y-5`）
2. 不要破壞間距層級結構
3. 不要在移動端使用過大間距
4. 不要忽略響應式間距需求
5. 不要混用不同的間距系統

遵循這套間距系統，確保所有介面元素的視覺節奏統一協調。
