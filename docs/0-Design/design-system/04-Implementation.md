# Design System — Implementation

> Design System v2.0（拆分 Modules）

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
