# Design System — Components

> Design System v2.0（拆分 Modules）

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
