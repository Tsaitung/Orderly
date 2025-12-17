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
