# 井然 Orderly API 規格文件

> **版本**: v1.0  
> **更新日期**: 2025-09-17  
> **負責人**: 技術團隊  
> **狀態**: 開發中

---

## 概述

井然 Orderly API 是專為餐飲供應鏈對帳自動化和 ERP 整合設計的 RESTful API 服務。本 API 採用 JSON 格式，支援完整的訂單生命週期管理、自動化對帳、和供應商協作功能。

### 核心設計原則

- **對帳優先**: 所有 API 設計圍繞對帳自動化需求
- **ERP 友好**: 支援主流 ERP 系統的數據格式和整合模式
- **即時性**: 關鍵操作提供即時反饋和通知
- **可擴展**: 支援未來功能擴展和版本演進

---

## 認證與授權

### JWT Token 認證

所有 API 請求必須在 Header 中包含有效的 JWT Token：

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-API-Version: 1.0
X-Request-ID: <唯一請求ID>
```

### Token 獲取

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "company_id": "optional_company_id"
}
```

**響應範例**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "user": {
      "id": "user_123",
      "name": "張三",
      "role": "restaurant_manager",
      "company_id": "company_456"
    }
  },
  "metadata": {
    "timestamp": "2025-09-17T10:00:00Z",
    "request_id": "req_789",
    "version": "1.0"
  }
}
```

---

## 價格表管理 API

### 數據結構

```typescript
interface PriceTable {
  id: string;
  supplier_id: string;
  customer_segment_code?: string; // 客戶群體代碼
  valid_from: string; // ISO 8601 格式
  valid_to: string;
  version_code: string;
  price_elements: PriceElement[];
  status: 'active' | 'inactive' | 'draft';
  created_at: string;
  updated_at: string;
}

interface PriceElement {
  item_code: string;
  item_name: string;
  description?: string;
  category: string;
  supply_status: 'available' | 'out_of_stock' | 'discontinued';
  price_type: 'fixed' | 'market_price';
  price?: number; // 固定價格（台幣）
  price_range?: { 
    min: number; 
    max: number; 
  }; // 時價區間
  unit: string; // 計價單位（斤、公斤、箱等）
  is_taxable: boolean;
  minimum_order_quantity?: number;
  stock_quantity?: number;
}
```

### API 端點

#### 1. 創建價格表

```http
POST /api/price-tables
```

**請求範例**:
```json
{
  "customer_segment_code": "premium",
  "valid_from": "2025-09-17T00:00:00Z",
  "valid_to": "2025-12-31T23:59:59Z",
  "version_code": "v2025q4",
  "price_elements": [
    {
      "item_code": "VEG001",
      "item_name": "高麗菜",
      "description": "台灣本土高麗菜，新鮮採摘",
      "category": "蔬菜類",
      "supply_status": "available",
      "price_type": "market_price",
      "price_range": { "min": 25, "max": 35 },
      "unit": "斤",
      "is_taxable": true,
      "minimum_order_quantity": 10
    }
  ]
}
```

#### 2. 查詢價格表清單

```http
GET /api/price-tables?supplier_id={supplier_id}&status=active&page=1&limit=20
```

**響應範例**:
```json
{
  "success": true,
  "data": {
    "price_tables": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 100,
      "items_per_page": 20
    }
  }
}
```

#### 3. 更新價格表

```http
PUT /api/price-tables/{id}
```

#### 4. 查詢單一價格表

```http
GET /api/price-tables/{id}
```

---

## 訂單生命週期 API

### 數據結構

```typescript
interface Order {
  id: string;
  order_number: string; // 自動生成或自定義
  restaurant_id: string;
  supplier_id: string;
  order_time: string;
  delivery_date: string;
  special_delivery_time?: string;
  price_table_version: string;
  receiving_unit: string; // 收貨單位
  special_location?: string;
  demand_elements: DemandElement[];
  status: OrderStatus;
  adjustments: OrderAdjustments;
  total_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DemandElement {
  item_code: string;
  item_name: string;
  ordered_quantity: number;
  actual_quantity?: number; // 實際配送量
  confirmed_price?: number; // 確認價格（時價商品用）
  unit: string;
  amount_range?: { min: number; max: number }; // 時價商品金額範圍
  notes?: string;
}

interface OrderAdjustments {
  vegetable_price_offset_taxed: number;    // 菜價折抵（含稅）
  vegetable_price_offset_untaxed: number;  // 菜價折抵（不含稅）
  shipping_offset: number;                 // 運費折抵
  other_offsets: { 
    [key: string]: {
      amount: number;
      description: string;
    };
  }; // 其他折抵
}

type OrderStatus = 'created' | 'confirmed' | 'shipped' | 'arrived' | 
                   'accepted' | 'settled' | 'cancelled' | 'returned';
```

### 餐廳端 API

#### 1. 創建訂單

```http
POST /api/orders
```

**請求範例**:
```json
{
  "supplier_id": "supplier_123",
  "delivery_date": "2025-09-18",
  "receiving_unit": "台北店",
  "demand_elements": [
    {
      "item_code": "VEG001",
      "item_name": "高麗菜",
      "ordered_quantity": 50,
      "unit": "斤",
      "amount_range": { "min": 1200, "max": 1500 }
    }
  ],
  "notes": "請於上午11點前送達"
}
```

#### 2. 修改訂單（確認前）

```http
PUT /api/orders/{id}
```

**注意**: 只有狀態為 'created' 的訂單可以修改

#### 3. 取消訂單

```http
DELETE /api/orders/{id}
```

#### 4. 查詢訂單清單

```http
GET /api/orders?status=confirmed,shipped&supplier_id={id}&date_from=2025-09-01&date_to=2025-09-30
```

### 供應商端 API

#### 1. 確認訂單

```http
PUT /api/orders/{id}/confirm
```

**請求範例**:
```json
{
  "confirmed_elements": [
    {
      "item_code": "VEG001",
      "confirmed_price": 30,
      "actual_quantity": 48,
      "notes": "今日市價較高，數量略有調整"
    }
  ],
  "adjustments": {
    "shipping_offset": -50,
    "other_offsets": {
      "quality_bonus": {
        "amount": 100,
        "description": "特級品質獎勵"
      }
    }
  }
}
```

#### 2. 訂單出貨

```http
PUT /api/orders/{id}/ship
```

#### 3. 訂單到貨

```http
PUT /api/orders/{id}/arrive
```

#### 4. 理貨更新

```http
PUT /api/orders/{id}/inventory-update
```

#### 5. 訂單異動（驗收後）

```http
PUT /api/orders/{id}/adjust
```

---

## 對帳自動化 API

### 數據結構

```typescript
interface ReconciliationRecord {
  id: string;
  restaurant_id: string;
  supplier_id: string;
  period_start: string;
  period_end: string;
  period_type: 'weekly' | 'monthly' | 'custom';
  orders: string[]; // 相關訂單 ID 列表
  total_amount: number;
  total_quantity: number;
  status: 'pending' | 'reviewing' | 'disputed' | 'resolved' | 'paid';
  discrepancies: Discrepancy[];
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
  payment_due_date?: string;
}

interface Discrepancy {
  id: string;
  order_id: string;
  item_code: string;
  type: 'quantity' | 'price' | 'quality' | 'missing' | 'extra' | 'damaged';
  severity: 'low' | 'medium' | 'high' | 'critical';
  expected_value: any;
  actual_value: any;
  amount_impact: number; // 對總金額的影響
  status: 'open' | 'resolved' | 'accepted' | 'rejected';
  resolution?: string;
  evidence?: string[]; // 照片或文件 URL
  created_at: string;
  resolved_at?: string;
}
```

### API 端點

#### 1. 生成對帳單

```http
POST /api/reconciliation/generate
```

**請求範例**:
```json
{
  "restaurant_id": "restaurant_123",
  "supplier_id": "supplier_456",
  "period_start": "2025-09-01",
  "period_end": "2025-09-30",
  "period_type": "monthly",
  "auto_resolve_minor": true, // 自動解決輕微差異
  "tolerance_percentage": 2.0 // 容忍範圍 2%
}
```

#### 2. 查詢對帳記錄

```http
GET /api/reconciliation?status=pending&period_start=2025-09-01&period_end=2025-09-30
```

#### 3. 提出異議

```http
PUT /api/reconciliation/{id}/dispute
```

**請求範例**:
```json
{
  "discrepancy_id": "disc_789",
  "dispute_reason": "數量不符，實際收到45斤，但記錄為50斤",
  "evidence_photos": ["photo1.jpg", "photo2.jpg"],
  "proposed_resolution": "調整數量為實際收貨量"
}
```

#### 4. 解決異議

```http
PUT /api/reconciliation/{id}/resolve
```

#### 5. 接受對帳結果

```http
POST /api/reconciliation/{id}/accept
```

---

## 驗收點收 API

### 數據結構

```typescript
interface AcceptanceRecord {
  id: string;
  order_id: string;
  accepted_by: string; // 驗收人員 ID
  acceptance_time: string;
  acceptance_location: string;
  items: AcceptedItem[];
  photos: AcceptancePhoto[];
  overall_rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  discrepancies: AcceptanceDiscrepancy[];
  status: 'in_progress' | 'completed' | 'disputed';
}

interface AcceptedItem {
  item_code: string;
  item_name: string;
  ordered_quantity: number;
  received_quantity: number;
  quality_rating: 1 | 2 | 3 | 4 | 5;
  condition: 'excellent' | 'good' | 'acceptable' | 'poor' | 'damaged';
  expiry_date?: string;
  batch_number?: string;
  temperature?: number; // 冷鏈商品溫度記錄
  notes?: string;
}

interface AcceptancePhoto {
  id: string;
  url: string;
  type: 'overview' | 'item_detail' | 'quality_issue' | 'packaging' | 'temperature';
  item_code?: string;
  caption?: string;
  timestamp: string;
  gps_location?: { lat: number; lng: number };
}

interface AcceptanceDiscrepancy {
  id: string;
  type: 'quantity_short' | 'quantity_over' | 'quality_issue' | 
        'packaging_damage' | 'expired' | 'wrong_item' | 'other';
  severity: 'minor' | 'major' | 'critical';
  item_code: string;
  description: string;
  evidence_photos: string[];
  proposed_resolution: string;
  financial_impact?: number;
}
```

### API 端點

#### 1. 創建驗收記錄

```http
POST /api/acceptance
```

**請求範例**:
```json
{
  "order_id": "order_123",
  "acceptance_location": "台北店後門",
  "items": [
    {
      "item_code": "VEG001",
      "item_name": "高麗菜",
      "ordered_quantity": 50,
      "received_quantity": 48,
      "quality_rating": 4,
      "condition": "good",
      "notes": "品質良好，略有2斤短缺"
    }
  ],
  "overall_rating": 4,
  "notes": "整體驗收滿意"
}
```

#### 2. 上傳驗收照片

```http
POST /api/acceptance/upload-photo
Content-Type: multipart/form-data
```

**Form Data**:
- `file`: 圖片檔案
- `acceptance_id`: 驗收記錄 ID
- `type`: 照片類型
- `item_code`: 相關商品代碼（可選）
- `caption`: 照片說明（可選）

#### 3. 查詢驗收記錄

```http
GET /api/acceptance/{order_id}
```

#### 4. 完成驗收流程

```http
PUT /api/acceptance/{id}/complete
```

---

## ERP 整合專用 API

### 批量數據同步

#### 1. ERP 數據同步

```http
POST /api/erp/sync
```

**請求範例**:
```json
{
  "sync_type": "incremental",
  "data_type": "orders",
  "timestamp": "2025-09-17T10:00:00Z",
  "records": [
    {
      "external_id": "ERP_ORDER_001",
      "mapping": {
        "supplier_code": "SUP001",
        "item_codes": {
          "ERP_ITEM_001": "VEG001"
        }
      },
      "data": { /* 訂單數據 */ }
    }
  ],
  "checksum": "abc123def456"
}
```

#### 2. 查詢同步狀態

```http
GET /api/erp/sync-status?sync_id={sync_id}
```

#### 3. 批量數據匯入

```http
POST /api/erp/bulk-import
Content-Type: multipart/form-data
```

**Form Data**:
- `file`: Excel/CSV 檔案
- `data_type`: 數據類型（orders, products, reconciliation）
- `mapping_config`: 欄位對應配置

#### 4. 數據匯出

```http
GET /api/erp/export/{format}?type=reconciliation&period_start=2025-09-01&period_end=2025-09-30
```

支援格式: `excel`, `csv`, `json`

### Webhook 配置

#### 1. 配置 Webhook

```http
POST /api/erp/webhook/configure
```

**請求範例**:
```json
{
  "endpoint_url": "https://your-erp.com/webhook/orderly",
  "events": [
    "order.confirmed",
    "order.shipped",
    "reconciliation.generated"
  ],
  "secret_key": "your_webhook_secret",
  "retry_config": {
    "max_retries": 3,
    "retry_delay": 300
  }
}
```

#### 2. 測試 Webhook

```http
GET /api/erp/webhook/test
```

### Webhook 事件格式

```json
{
  "event_type": "order.confirmed",
  "timestamp": "2025-09-17T10:00:00Z",
  "data": {
    "order_id": "order_123",
    "order_number": "ORD20250917001",
    "status": "confirmed",
    /* 其他相關數據 */
  },
  "signature": "sha256=abc123...", // HMAC 簽名驗證
  "delivery_attempt": 1
}
```

---

## 錯誤處理

### 標準錯誤響應格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "請求數據驗證失敗",
    "details": {
      "field": "delivery_date",
      "issue": "delivery_date 不能是過去的日期"
    }
  },
  "metadata": {
    "timestamp": "2025-09-17T10:00:00Z",
    "request_id": "req_789",
    "version": "1.0"
  }
}
```

### 常見錯誤碼

| 錯誤碼 | HTTP 狀態 | 說明 |
|--------|-----------|------|
| `UNAUTHORIZED` | 401 | 未授權，Token 無效或過期 |
| `FORBIDDEN` | 403 | 禁止訪問，權限不足 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `VALIDATION_ERROR` | 400 | 請求數據驗證失敗 |
| `BUSINESS_RULE_VIOLATION` | 422 | 違反業務規則 |
| `RATE_LIMIT_EXCEEDED` | 429 | 超過請求頻率限制 |
| `INTERNAL_SERVER_ERROR` | 500 | 服務器內部錯誤 |
| `SERVICE_UNAVAILABLE` | 503 | 服務暫時不可用 |

---

## 限流與配額

### 請求頻率限制

| 方案 | 每分鐘請求數 | 突發允許量 | 同時連接數 |
|------|-------------|------------|------------|
| 基礎版 | 1,000 | 100 | 10 |
| 專業版 | 5,000 | 500 | 50 |
| 企業版 | 10,000 | 1,000 | 100 |

### 限流響應

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1632150000
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "超過請求頻率限制，請稍後重試"
  }
}
```

---

## 監控與追蹤

### 請求追蹤

每個 API 請求都應包含唯一的 `X-Request-ID` header，用於追蹤和問題排查。

### 效能指標

- **響應時間**: P95 < 300ms
- **可用性**: > 99.5%
- **錯誤率**: < 0.1%

### 健康檢查

```http
GET /api/health
```

**響應範例**:
```json
{
  "status": "healthy",
  "timestamp": "2025-09-17T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "file_storage": "healthy"
  }
}
```

---

## 版本控制

### API 版本策略

- **Header 版本控制**: `X-API-Version: 1.0`
- **URL 版本控制**: `/api/v1/orders` (備用方案)
- **向後兼容**: 小版本更新保持向後兼容
- **棄用策略**: 提前6個月通知，提供遷移指南

### 變更日誌

#### v1.0 (2025-09-17)
- 初始版本發布
- 支援完整訂單生命週期管理
- 對帳自動化功能
- ERP 整合介面

---

## SDK 和工具

### 提供的 SDK

- **Node.js**: `npm install @orderly/api-client`
- **Python**: `pip install orderly-api`
- **Java**: Maven/Gradle 依賴
- **C#**: NuGet 套件

### 開發工具

- **Postman Collection**: 完整 API 測試集合
- **OpenAPI Spec**: 標準 API 規格文檔
- **API Explorer**: 線上測試工具

---

## 技術支援

### 開發者資源

- **文檔網站**: https://docs.orderly.com
- **開發者論壇**: https://developers.orderly.com
- **GitHub**: https://github.com/orderly/api-examples

### 支援聯絡

- **技術支援**: api-support@orderly.com
- **緊急支援**: +886-2-xxxx-xxxx (24/7)
- **SLA**: 4小時響應時間（企業版）

---

**文件版本**: v1.0  
**最後更新**: 2025-09-17  
**下次審查**: 2025-10-17