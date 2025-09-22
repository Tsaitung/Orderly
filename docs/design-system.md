# 井然 Orderly Design System

> **版本**: v2.0  
> **更新日期**: 2025-09-18  
> **負責人**: 設計團隊  
> **狀態**: 設計確認

---

## 🎨 設計概覽

井然 Orderly 設計系統專為自動化對帳平台打造，著重於清晰的資訊呈現、高效的操作流程，以及對複雜財務數據的直觀理解。設計採用「對帳優先」的方法，強調減少認知負荷，讓使用者能快速完成從 8 小時縮短至 30 分鐘的對帳流程。

### 設計原則

1. **清晰優於美觀**：財務數據必須準確無誤地呈現
2. **效率優於完整**：聚焦核心對帳工作流程
3. **一致性優於個性**：建立用戶信任和操作習慣
4. **可及性優於炫技**：WCAG 2.1 AA 合規，支援各種使用情境

---

## 🎯 品牌識別

### 標誌與品牌

```
井然 Orderly
━━━━━━━━━━━
專業 · 自動化 · 可信賴
```

**品牌個性：**

- **專業可信**：財務系統的可靠性
- **智能高效**：自動化帶來的效率提升
- **簡潔明了**：複雜流程的簡化體驗

### 色彩系統

#### 主色彩

```css
:root {
  /* 主色 - Mocha Mousse (現有) */
  --primary-50: #faf9f7;
  --primary-100: #f0ede7;
  --primary-200: #e3ddd3;
  --primary-300: #d1c7b8;
  --primary-400: #b8a894;
  --primary-500: #a47864; /* 主色 */
  --primary-600: #8f6b56;
  --primary-700: #7a5a4a;
  --primary-800: #654b40;
  --primary-900: #533e35;
}
```

#### 對帳狀態色彩

```css
:root {
  /* 對帳狀態專用色彩 */
  --reconciliation-pending: #f59e0b; /* 待審查 - 琥珀色 */
  --reconciliation-processing: #3b82f6; /* 處理中 - 藍色 */
  --reconciliation-approved: #10b981; /* 已完成 - 綠色 */
  --reconciliation-disputed: #ef4444; /* 需注意 - 紅色 */
  --reconciliation-draft: #6b7280; /* 草稿 - 灰色 */

  /* ERP 整合狀態 */
  --erp-connected: #10b981; /* 已連接 */
  --erp-syncing: #f59e0b; /* 同步中 */
  --erp-error: #ef4444; /* 錯誤 */
  --erp-offline: #6b7280; /* 離線 */

  /* 語意色彩 */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* 中性色彩 */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
}
```

#### 色彩使用指引

| 用途         | 色彩        | 使用場景                    |
| ------------ | ----------- | --------------------------- |
| **主要操作** | Primary-500 | CTA按鈕、重要連結、選中狀態 |
| **對帳完成** | Success     | 自動匹配成功、審核通過      |
| **需要注意** | Warning     | 待審查項目、部分匹配        |
| **錯誤爭議** | Error       | 對帳差異、系統錯誤          |
| **資訊提示** | Info        | 一般通知、說明文字          |

### 字體系統

#### 字體族

```css
:root {
  /* 中文字體 */
  --font-family-zh: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif;

  /* 英文字體 */
  --font-family-en: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  /* 數字字體 (等寬) */
  --font-family-mono: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', monospace;

  /* 組合字體 */
  --font-family-base: var(--font-family-en), var(--font-family-zh);
}
```

#### 字體層級

```css
/* 標題層級 */
.text-h1 {
  font-size: 2rem; /* 32px */
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.025em;
}

.text-h2 {
  font-size: 1.5rem; /* 24px */
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.025em;
}

.text-h3 {
  font-size: 1.25rem; /* 20px */
  font-weight: 600;
  line-height: 1.4;
}

.text-h4 {
  font-size: 1.125rem; /* 18px */
  font-weight: 600;
  line-height: 1.4;
}

/* 內文層級 */
.text-body-lg {
  font-size: 1.125rem; /* 18px */
  font-weight: 400;
  line-height: 1.6;
}

.text-body {
  font-size: 1rem; /* 16px */
  font-weight: 400;
  line-height: 1.6;
}

.text-body-sm {
  font-size: 0.875rem; /* 14px */
  font-weight: 400;
  line-height: 1.5;
}

.text-caption {
  font-size: 0.75rem; /* 12px */
  font-weight: 400;
  line-height: 1.4;
  color: var(--gray-600);
}

/* 財務數字專用 */
.text-financial {
  font-family: var(--font-family-mono);
  font-weight: 600;
  letter-spacing: 0.025em;
  font-variant-numeric: tabular-nums;
}

/* 狀態標籤 */
.text-status {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

---

## 🧩 元件庫

### 按鈕 (Button)

#### 主要按鈕

```tsx
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

// 使用範例
<Button variant="primary" size="md">
  確認對帳
</Button>

<Button variant="outline" size="sm" loading>
  處理中...
</Button>
```

#### 按鈕樣式

```css
/* 主要按鈕 */
.btn-primary {
  background-color: var(--primary-500);
  color: white;
  border: 1px solid var(--primary-500);
  border-radius: 4px;
}

.btn-primary:hover {
  background-color: var(--primary-600);
  border-color: var(--primary-600);
}

.btn-primary:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

/* 尺寸變化 */
.btn-xs {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}
.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
.btn-md {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}
.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
}
.btn-xl {
  padding: 1rem 2rem;
  font-size: 1.25rem;
}
```

### 對帳卡片 (ReconciliationCard)

```tsx
interface ReconciliationCardProps {
  reconciliation: {
    id: string;
    period: string;
    totalAmount: number;
    status: 'pending' | 'processing' | 'approved' | 'disputed';
    discrepancies: number;
    autoMatchRate: number;
    supplier: string;
  };
  onViewDetails: () => void;
  onResolveDispute?: () => void;
}

// 樣式
.reconciliation-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.reconciliation-card:hover {
  border-color: var(--primary-300);
  box-shadow: 0 4px 12px rgba(164, 120, 100, 0.15);
}

.reconciliation-status {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-pending {
  background-color: rgba(245, 158, 11, 0.1);
  color: var(--reconciliation-pending);
}

.status-approved {
  background-color: rgba(16, 185, 129, 0.1);
  color: var(--reconciliation-approved);
}
```

### ERP 同步指示器 (ERPSyncIndicator)

```tsx
interface ERPSyncIndicatorProps {
  status: 'connected' | 'syncing' | 'error' | 'offline';
  lastSync?: Date;
  nextSync?: Date;
  details?: string;
}

// 動畫效果
.erp-sync-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
}

.sync-status-syncing {
  background-color: rgba(59, 130, 246, 0.1);
  color: var(--erp-syncing);
}

.sync-pulse {
  width: 8px;
  height: 8px;
  background-color: currentColor;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### 表單元件

#### 輸入框 (Input)

```tsx
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

// 樣式
.input-container {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-700);
}

.input-field {
  padding: 0.75rem;
  border: 1px solid var(--gray-300);
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(164, 120, 100, 0.1);
}

.input-error {
  border-color: var(--error);
}

.input-helper-text {
  font-size: 0.75rem;
  color: var(--gray-600);
}

.input-error-text {
  font-size: 0.75rem;
  color: var(--error);
}
```

#### 選擇器 (Select)

```tsx
interface SelectProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  multiple?: boolean
  searchable?: boolean
}
```

### 資料表格 (DataTable)

```tsx
interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    title: string;
    render?: (value: any, record: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
  }>;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  loading?: boolean;
  onRowClick?: (record: T) => void;
}

// 樣式
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table th {
  background-color: var(--gray-50);
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--gray-700);
  border-bottom: 1px solid var(--gray-200);
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--gray-100);
  font-size: 0.875rem;
}

.data-table tr:hover {
  background-color: var(--gray-50);
}

/* 財務數字欄位 */
.table-cell-financial {
  font-family: var(--font-family-mono);
  font-weight: 600;
  text-align: right;
}

/* 狀態欄位 */
.table-cell-status {
  text-align: center;
}
```

---

## 📱 響應式設計

### 斷點定義

```css
:root {
  --breakpoint-xs: 320px; /* 小型手機 */
  --breakpoint-sm: 640px; /* 大型手機 */
  --breakpoint-md: 768px; /* 平板 */
  --breakpoint-lg: 1024px; /* 小型桌機 */
  --breakpoint-xl: 1280px; /* 大型桌機 */
  --breakpoint-2xl: 1536px; /* 超大桌機 */
}

/* 響應式工具類 */
@media (min-width: 640px) {
  .sm\:hidden {
    display: none;
  }
  .sm\:flex {
    display: flex;
  }
  .sm\:grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .md\:hidden {
    display: none;
  }
  .md\:block {
    display: block;
  }
  .md\:grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### 行動端優化

#### 觸控目標大小

```css
/* 所有可觸控元素最小 44×44px */
.touch-target {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 按鈕內邊距調整 */
@media (max-width: 640px) {
  .btn-mobile {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }
}
```

#### 手勢控制

```css
/* 滑動操作視覺回饋 */
.swipe-action {
  transform: translateX(0);
  transition: transform 0.3s ease;
}

.swipe-action.swiping-right {
  transform: translateX(60px);
  background: linear-gradient(90deg, var(--success) 0%, transparent 100%);
}

.swipe-action.swiping-left {
  transform: translateX(-60px);
  background: linear-gradient(270deg, var(--error) 0%, transparent 100%);
}
```

---

## 🎭 互動設計

### 微互動動畫

#### 對帳匹配動畫

```css
.auto-match-progress {
  position: relative;
  overflow: hidden;
}

.auto-match-progress::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.3) 50%, transparent 100%);
  animation: reconciliation-scan 2s ease-in-out;
}

@keyframes reconciliation-scan {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
```

#### 信心分數視覺化

```css
.confidence-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confidence-bar {
  width: 60px;
  height: 8px;
  background-color: var(--gray-200);
  border-radius: 4px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 4px;
  transition:
    width 0.8s ease,
    background-color 0.3s ease;
}

.confidence-high {
  background: linear-gradient(90deg, var(--success) 0%, #22c55e 100%);
}

.confidence-medium {
  background: linear-gradient(90deg, var(--warning) 0%, #fbbf24 100%);
}

.confidence-low {
  background: linear-gradient(90deg, var(--error) 0%, #f87171 100%);
}
```

### 載入狀態

#### 骨架載入

```css
.skeleton {
  background: linear-gradient(90deg, var(--gray-200) 25%, var(--gray-100) 50%, var(--gray-200) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-text {
  height: 1rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.skeleton-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
```

#### 進度指示器

```css
.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-circle {
  fill: transparent;
  stroke: var(--gray-200);
  stroke-width: 4;
  stroke-dasharray: 251.2; /* 2 * π * 40 */
  stroke-dashoffset: 251.2;
  transition: stroke-dashoffset 0.5s ease;
}

.progress-ring-circle.progress-75 {
  stroke: var(--primary-500);
  stroke-dashoffset: 62.8; /* 25% of 251.2 */
}
```

---

## 🎨 資料視覺化

### 儀表板 KPI 卡片

```tsx
interface KPICardProps {
  title: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  color: 'success' | 'warning' | 'error' | 'info' | 'primary';
  loading?: boolean;
}

// 樣式
.kpi-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
}

.kpi-value {
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--font-family-mono);
  color: var(--gray-900);
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.trend-up { color: var(--success); }
.trend-down { color: var(--error); }
.trend-stable { color: var(--gray-500); }
```

### 對帳趨勢圖表

```tsx
// 使用 Recharts 的範例配置
const reconciliationTrendConfig = {
  colors: {
    processingTime: '#3b82f6',
    errorRate: '#ef4444',
    savings: '#10b981',
  },

  chart: {
    margin: { top: 20, right: 30, left: 20, bottom: 5 },
    grid: {
      strokeDasharray: '3 3',
      stroke: '#e5e7eb',
    },
  },

  tooltip: {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
}
```

### 差異分析圖表

```css
.discrepancy-chart {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid var(--gray-200);
}

.chart-legend {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
```

---

## ♿ 無障礙設計

### WCAG 2.1 AA 合規

#### 色彩對比

```css
/* 確保所有文字與背景的對比度至少 4.5:1 */
.text-high-contrast {
  color: var(--gray-900);
  background-color: white;
  /* 對比度: 16.75:1 */
}

.text-medium-contrast {
  color: var(--gray-700);
  background-color: var(--gray-50);
  /* 對比度: 4.68:1 */
}

/* 高對比模式 */
@media (prefers-contrast: high) {
  :root {
    --primary-500: #2563eb;
    --gray-600: #000000;
    --border-color: #000000;
  }

  .btn-outline {
    border-width: 2px;
  }
}
```

#### 焦點指示器

```css
.focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
  border-radius: 4px;
}

/* 鍵盤導航增強 */
.keyboard-navigation .btn:focus,
.keyboard-navigation .input:focus,
.keyboard-navigation [tabindex]:focus {
  outline: 3px solid var(--primary-500);
  outline-offset: 2px;
  background-color: rgba(164, 120, 100, 0.1);
}
```

#### 螢幕閱讀器支援

```tsx
// ARIA 標籤範例
<div
  role="region"
  aria-label="對帳摘要"
  aria-describedby="reconciliation-help"
>
  <span
    className="financial-number"
    aria-label="總金額：新台幣四萬五千三百八十元"
  >
    NT$ 45,380
  </span>
</div>

// 狀態變更通知
<div aria-live="polite" aria-atomic="true">
  對帳狀態已更新為「已完成」
</div>
```

### 鍵盤導航

```css
/* 跳過連結 */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--primary-500);
  color: white;
  padding: 8px;
  border-radius: 4px;
  text-decoration: none;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}

/* Tab 順序指示 */
[tabindex='0']:focus,
[tabindex='-1']:focus {
  position: relative;
}

[tabindex='0']:focus::after {
  content: attr(data-tab-order);
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--primary-500);
  color: white;
  font-size: 0.75rem;
  padding: 2px 4px;
  border-radius: 2px;
}
```

---

## 📚 新用戶引導體驗

### 角色特定引導

#### 餐廳用戶引導（5步驟）

```tsx
const restaurantOnboarding = [
  {
    step: 1,
    title: '歡迎使用井然 Orderly',
    description: '讓我們用 5 分鐘設定您的自動化對帳系統',
    target: '.welcome-banner',
  },
  {
    step: 2,
    title: '選擇您的角色',
    description: '請選擇：餐廳經理 或 會計人員',
    target: '.role-selector',
  },
  {
    step: 3,
    title: 'ERP 整合設定',
    description: '連接您的 ERP 系統，或選擇手動上傳',
    target: '.erp-setup',
  },
  {
    step: 4,
    title: '第一次對帳',
    description: '讓我們用範例數據練習對帳流程',
    target: '.reconciliation-demo',
  },
  {
    step: 5,
    title: '通知設定',
    description: '設定差異和完成通知偏好',
    target: '.notification-settings',
  },
]
```

#### 引導覆蓋層樣式

```css
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.onboarding-tooltip {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  max-width: 320px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  position: relative;
}

.onboarding-tooltip::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  border: 8px solid transparent;
  border-bottom-color: white;
}

.onboarding-progress {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.progress-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gray-300);
}

.progress-dot.active {
  background: var(--primary-500);
}

.progress-dot.completed {
  background: var(--success);
}
```

### 漸進式功能介紹

```tsx
const featureIntroduction = {
  week1: ['基本對帳工作流程', '訂單狀態追蹤'],
  week2: ['進階篩選和搜尋', '批量操作'],
  week3: ['爭議解決和溝通', '自訂通知'],
  week4: ['分析和報表功能', 'API 整合設定'],
}

// 情境式幫助提示
const contextualHelp = {
  reconciliation: {
    title: '對帳小貼士',
    tips: ['綠色項目表示自動匹配成功', '黃色項目需要您的確認', '紅色項目存在差異需要處理'],
  },

  erp_sync: {
    title: 'ERP 同步說明',
    tips: ['藍色表示正在同步中', '綠色表示同步成功', '如果顯示紅色，請檢查連線設定'],
  },
}
```

---

## 🌙 深色模式支援

```css
/* 深色模式色彩定義 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --bg-tertiary: #374151;

    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;

    --border-primary: #374151;
    --border-secondary: #4b5563;

    /* 主色調整 */
    --primary-500: #d1a684;
    --primary-600: #b8956f;
  }

  .reconciliation-card {
    background: var(--bg-secondary);
    border-color: var(--border-primary);
    color: var(--text-primary);
  }

  .data-table {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  .data-table th {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }
}

/* 手動深色模式切換 */
[data-theme='dark'] {
  /* 與 prefers-color-scheme: dark 相同的樣式 */
}
```

---

## 📐 間距與佈局系統

### 間距比例

```css
:root {
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-5: 1.25rem; /* 20px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-10: 2.5rem; /* 40px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
  --space-20: 5rem; /* 80px */
  --space-24: 6rem; /* 96px */
}

/* 間距工具類 */
.p-4 {
  padding: var(--space-4);
}
.px-6 {
  padding-left: var(--space-6);
  padding-right: var(--space-6);
}
.py-8 {
  padding-top: var(--space-8);
  padding-bottom: var(--space-8);
}
.m-4 {
  margin: var(--space-4);
}
.mx-auto {
  margin-left: auto;
  margin-right: auto;
}
.gap-4 {
  gap: var(--space-4);
}
```

### 網格系統

```css
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

.grid {
  display: grid;
  gap: 1rem;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, 1fr);
}
.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr);
}
.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr);
}
.grid-cols-4 {
  grid-template-columns: repeat(4, 1fr);
}

/* 響應式網格 */
@media (min-width: 640px) {
  .sm\:grid-cols-2 {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .md\:grid-cols-3 {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## 🚀 實作指南

### 元件開發優先級

#### 第1階段：基礎元件 (第1週)

- [ ] Button 元件及變體
- [ ] Input、Select 表單元件
- [ ] Layout、Container 佈局元件
- [ ] Typography 系統
- [ ] Color palette 設定

#### 第2階段：業務元件 (第2週)

- [ ] ReconciliationCard 對帳卡片
- [ ] ERPSyncIndicator 同步指示器
- [ ] DataTable 資料表格
- [ ] StatusBadge 狀態標籤
- [ ] KPICard 指標卡片

#### 第3階段：互動元件 (第3週)

- [ ] Modal、Dialog 彈窗
- [ ] Tooltip、Popover 提示
- [ ] Notification 通知系統
- [ ] Loading、Skeleton 載入狀態
- [ ] Progress 進度指示器

#### 第4階段：進階功能 (第4週)

- [ ] Chart 圖表元件
- [ ] DatePicker 日期選擇
- [ ] FileUpload 檔案上傳
- [ ] SearchCombobox 搜尋組合框
- [ ] DataGrid 進階資料網格

### 品質檢查清單

#### 設計一致性

- [ ] 色彩使用符合設計規範
- [ ] 字體大小和重量正確
- [ ] 間距符合 4px 網格系統
- [ ] 圓角使用 4px 標準
- [ ] 陰影效果適當且一致

#### 無障礙檢查

- [ ] 色彩對比度 ≥ 4.5:1
- [ ] 鍵盤導航功能完整
- [ ] ARIA 標籤正確設定
- [ ] 焦點指示器清晰可見
- [ ] 螢幕閱讀器測試通過

#### 響應式檢查

- [ ] 行動端觸控目標 ≥ 44px
- [ ] 平板佈局適配良好
- [ ] 桌面端資訊密度適中
- [ ] 不同解析度下正常顯示

#### 效能檢查

- [ ] 圖片使用 WebP 格式並優化
- [ ] CSS 無重複或無用樣式
- [ ] 動畫效能良好（60fps）
- [ ] 首次渲染時間 < 3秒

---

## 🎯 業務特定設計模式

### 對帳流程視覺語言

#### 置信度指示器設計

```css
/* 對帳 AI 置信度視覺系統 */
.confidence-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.confidence-high {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
}

.confidence-medium {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}

.confidence-low {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
}

/* 置信度數值動畫 */
.confidence-value {
  font-family: var(--font-family-mono);
  font-weight: 700;
  animation: countUp 1.5s ease-out;
}

@keyframes countUp {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

#### 財務數據顯示規範

```css
/* 金額顯示專用樣式 */
.financial-amount {
  font-family: var(--font-family-mono);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.025em;
}

.amount-positive {
  color: var(--success);
}

.amount-negative {
  color: var(--error);
}

.amount-neutral {
  color: var(--gray-900);
}

/* 貨幣符號樣式 */
.currency-symbol {
  font-size: 0.875em;
  font-weight: 500;
  opacity: 0.8;
  margin-right: 0.125rem;
}

/* 數字分組顯示 */
.amount-large {
  font-size: 1.5rem;
  line-height: 1.2;
}

.amount-medium {
  font-size: 1.125rem;
  line-height: 1.3;
}

.amount-small {
  font-size: 0.875rem;
  line-height: 1.4;
}
```

### ERP 整合狀態設計

#### 連接狀態指示器

```css
.erp-status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid;
  transition: all 0.2s ease;
}

.erp-connected {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
  color: var(--success);
}

.erp-syncing {
  background-color: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: var(--info);
}

.erp-error {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: var(--error);
}

.erp-offline {
  background-color: rgba(107, 114, 128, 0.1);
  border-color: rgba(107, 114, 128, 0.3);
  color: var(--gray-500);
}

/* 同步動畫 */
.sync-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 訂單狀態視覺系統

#### 狀態流程指示器

```css
.order-status-flow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: 0.5rem;
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  position: relative;
}

.status-step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 12px;
  right: -25px;
  width: 24px;
  height: 2px;
  background: var(--gray-300);
  z-index: 1;
}

.status-step.completed::after {
  background: var(--success);
}

.status-step.active::after {
  background: linear-gradient(90deg, var(--success) 0%, var(--gray-300) 100%);
}

.status-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--gray-300);
  color: var(--white);
  z-index: 2;
  position: relative;
}

.status-icon.completed {
  background: var(--success);
}

.status-icon.active {
  background: var(--primary-500);
  animation: pulse 2s infinite;
}

.status-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--gray-600);
  text-align: center;
}

.status-label.completed {
  color: var(--success);
}

.status-label.active {
  color: var(--primary-600);
}
```

---

## 📊 數據視覺化元件規範

### KPI 儀表板卡片

```css
.kpi-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: linear-gradient(135deg, white 0%, #f8fafc 100%);
  border: 1px solid var(--gray-200);
  border-radius: 0.75rem;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-500) 0%, var(--accent-500) 100%);
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.kpi-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.kpi-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-100);
  color: var(--primary-600);
}

.kpi-value {
  font-size: 2.25rem;
  font-weight: 700;
  font-family: var(--font-family-mono);
  color: var(--gray-900);
  line-height: 1;
  margin-bottom: 0.5rem;
}

.kpi-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.trend-positive {
  color: var(--success);
}

.trend-negative {
  color: var(--error);
}

.trend-neutral {
  color: var(--gray-500);
}
```

### 對帳進度環形圖

```css
.reconciliation-progress {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.progress-ring {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.progress-background {
  fill: none;
  stroke: var(--gray-200);
  stroke-width: 8;
}

.progress-bar {
  fill: none;
  stroke: var(--primary-500);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 314; /* 2 * π * 50 */
  stroke-dashoffset: 314;
  transition: stroke-dashoffset 1s ease-in-out;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-percentage {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: var(--font-family-mono);
  color: var(--gray-900);
  line-height: 1;
}

.progress-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## 🔄 狀態管理與過渡動畫

### 載入狀態設計

```css
/* 對帳處理載入動畫 */
.reconciliation-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: var(--gray-50);
  border-radius: 0.75rem;
  border: 2px dashed var(--gray-300);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--gray-200);
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

.loading-text {
  font-size: 1rem;
  font-weight: 500;
  color: var(--gray-700);
  margin-bottom: 0.5rem;
}

.loading-subtext {
  font-size: 0.875rem;
  color: var(--gray-500);
  text-align: center;
}

/* 進度條載入 */
.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--gray-200);
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-500) 0%, var(--accent-500) 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
```

### 微互動動畫

```css
/* 按鈕點擊波紋效果 */
.ripple-button {
  position: relative;
  overflow: hidden;
}

.ripple-button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition:
    width 0.6s,
    height 0.6s;
}

.ripple-button:active::before {
  width: 300px;
  height: 300px;
}

/* 卡片懸停效果 */
.interactive-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.interactive-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.1),
    0 20px 40px rgba(0, 0, 0, 0.06);
}

.interactive-card:active {
  transform: translateY(-2px) scale(1.01);
}

/* 數字滾動效果 */
.animated-counter {
  font-family: var(--font-family-mono);
  font-weight: 700;
  overflow: hidden;
}

.counter-digit {
  display: inline-block;
  transition: transform 0.3s ease;
}

.counter-digit.updating {
  animation: digitFlip 0.6s ease;
}

@keyframes digitFlip {
  0% {
    transform: rotateX(0deg);
  }
  50% {
    transform: rotateX(90deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}
```

---

## 📱 PWA 與離線設計規範

### 離線狀態指示器

```css
.offline-indicator {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gray-900);
  color: var(--white);
  padding: 0.75rem 1.5rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateX(-50%) translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.offline-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--error);
}

.online-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--success);
}
```

### 安裝提示設計

```css
.pwa-install-prompt {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
  color: var(--white);
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: translateY(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
}

.pwa-install-prompt.visible {
  transform: translateY(0);
}

.pwa-content {
  flex: 1;
}

.pwa-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.pwa-description {
  font-size: 0.875rem;
  opacity: 0.9;
}

.pwa-actions {
  display: flex;
  gap: 0.75rem;
}

.pwa-button {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.1);
  color: var(--white);
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.pwa-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}

.pwa-button.primary {
  background: var(--white);
  color: var(--primary-600);
  border-color: var(--white);
}

.pwa-button.primary:hover {
  background: var(--gray-100);
}
```

---

## 🌐 多語言支援設計

### RTL 語言支援

```css
/* RTL 佈局支援 */
[dir='rtl'] {
  direction: rtl;
}

[dir='rtl'] .layout-container {
  flex-direction: row-reverse;
}

[dir='rtl'] .margin-left {
  margin-left: 0;
  margin-right: var(--space-4);
}

[dir='rtl'] .text-align-left {
  text-align: right;
}

[dir='rtl'] .float-left {
  float: right;
}

/* 雙向文字支援 */
.bidi-text {
  unicode-bidi: plaintext;
}

.ltr-override {
  direction: ltr;
  unicode-bidi: bidi-override;
}

.rtl-override {
  direction: rtl;
  unicode-bidi: bidi-override;
}
```

### 字體回退機制

```css
/* 多語言字體堆疊 */
.font-system {
  font-family: 
    /* 繁體中文 */
    'Noto Sans TC',
    'PingFang TC',
    'Microsoft JhengHei',
    /* 簡體中文 */ 'Noto Sans SC',
    'PingFang SC',
    'Microsoft YaHei',
    /* 日文 */ 'Noto Sans JP',
    'Hiragino Sans',
    /* 韓文 */ 'Noto Sans KR',
    'Malgun Gothic',
    /* 英文回退 */ 'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
}

/* 地區特定調整 */
[lang='zh-TW'] {
  font-family: 'Noto Sans TC', var(--font-family-base);
}

[lang='zh-CN'] {
  font-family: 'Noto Sans SC', var(--font-family-base);
}

[lang='ja'] {
  font-family: 'Noto Sans JP', var(--font-family-base);
  line-height: 1.7; /* 日文需要更大行高 */
}

[lang='ko'] {
  font-family: 'Noto Sans KR', var(--font-family-base);
}
```

---

## 📋 實施檢查清單更新

### 技術實現檢查

- [ ] CSS 變數正確定義並在所有瀏覽器中工作
- [ ] 設計 Token 與實際樣式一致
- [ ] 響應式斷點在所有裝置上正確運作
- [ ] 動畫效能在低階裝置上可接受
- [ ] 圖標載入策略優化

### 業務邏輯檢查

- [ ] 對帳狀態視覺化準確反映業務邏輯
- [ ] ERP 整合狀態正確顯示
- [ ] 財務數據格式化符合會計標準
- [ ] 用戶角色權限正確反映在 UI 中

### 國際化檢查

- [ ] 所有文字內容已提取為翻譯鍵值
- [ ] RTL 語言佈局正確
- [ ] 不同語言的字體載入正常
- [ ] 數字、日期、貨幣格式化正確

### 效能優化檢查

- [ ] 關鍵路徑 CSS 內聯載入
- [ ] 非關鍵樣式延遲載入
- [ ] 圖標字體或 SVG 優化
- [ ] 動畫使用 GPU 加速
- [ ] 大型組件懶載入

這套完整的設計系統為井然 Orderly 平台提供了專業、一致且高效的視覺語言和互動模式。通過嚴格遵循這些設計規範，我們將能夠實現讓使用者從 8 小時的手工對帳時間縮短至 30 分鐘的目標，同時提供卓越的用戶體驗。
