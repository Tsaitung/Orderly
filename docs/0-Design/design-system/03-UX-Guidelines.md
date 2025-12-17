# Design System — UX Guidelines

> Design System v2.0（拆分 Modules）

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
