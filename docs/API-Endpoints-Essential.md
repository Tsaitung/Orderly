# 井然 Orderly - API Endpoints Essential

> **Version**: v2.1  
> **Date**: 2025-09-18  
> **Status**: Implementation Ready

---

## API Overview

井然 Orderly API 采用 **REST + JSON** 设计，专注于餐饮供应链对账自动化。所有端点都针对 Next.js 前端优化，支持 Server Components 和 Client Components 的数据获取模式。

### Base Configuration

```typescript
// API Base Configuration
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  version: 'v1',
  timeout: 30000,
  defaultHeaders: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-API-Version': '1.0',
  },
}
```

### Authentication Pattern

```typescript
// Authentication Headers
interface AuthHeaders {
  Authorization: `Bearer ${string}`
  'X-Organization-ID': string
  'X-User-Role': UserRole
  'X-Request-ID'?: string
}
```

---

## 1. Authentication & User Management

### POST /api/auth/login

**Purpose**: 用户登录认证

```typescript
interface LoginRequest {
  email: string
  password: string
  organization_id?: string
}

interface LoginResponse {
  success: true
  data: {
    tokens: {
      access_token: string
      refresh_token: string
      expires_in: number
    }
    user: {
      id: string
      email: string
      role: UserRole
      organization: {
        id: string
        name: string
        type: 'restaurant' | 'supplier'
      }
    }
  }
}
```

**Example Usage**:

```typescript
// Frontend login handler
async function handleLogin(credentials: LoginRequest) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  const result = await response.json()
  if (result.success) {
    // Store tokens securely
    localStorage.setItem('access_token', result.data.tokens.access_token)
    // Redirect to dashboard
    router.push('/dashboard')
  }
}
```

### GET /api/auth/me

**Purpose**: 获取当前用户信息

```typescript
interface UserProfileResponse {
  success: true
  data: {
    id: string
    email: string
    role: UserRole
    organization: OrganizationInfo
    permissions: string[]
    last_login_at: string
    preferences: Record<string, any>
  }
}
```

### POST /api/auth/refresh

**Purpose**: 刷新访问令牌

```typescript
interface RefreshRequest {
  refresh_token: string
}

interface RefreshResponse {
  success: true
  data: {
    access_token: string
    expires_in: number
  }
}
```

---

## 2. Order Management (订单管理)

### GET /api/v1/orders

**Purpose**: 获取订单列表 (支持分页和筛选)

```typescript
interface OrderListQuery {
  page?: number
  limit?: number
  status?: OrderStatus | OrderStatus[]
  supplier_id?: string
  restaurant_id?: string
  date_from?: string // YYYY-MM-DD
  date_to?: string
  search?: string
}

interface OrderListResponse {
  success: true
  data: {
    orders: OrderSummary[]
    pagination: {
      current_page: number
      total_pages: number
      total_items: number
      has_next: boolean
      has_prev: boolean
    }
    filters_applied: OrderListQuery
  }
}

interface OrderSummary {
  id: string
  order_number: string
  supplier: { id: string; name: string }
  restaurant: { id: string; name: string }
  status: OrderStatus
  total_amount: number
  delivery_date: string
  item_count: number
  created_at: string
  updated_at: string
}
```

**Example Usage**:

```typescript
// React Hook for order list
function useOrders(filters: OrderListQuery) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters as any)
      const response = await fetch(`/api/v1/orders?${params}`, {
        headers: getAuthHeaders(),
      })
      return response.json()
    },
    keepPreviousData: true,
  })
}
```

### POST /api/v1/orders

**Purpose**: 创建新订单

```typescript
interface CreateOrderRequest {
  supplier_id: string
  delivery_date: string // YYYY-MM-DD
  receiving_unit?: string
  special_location?: string
  items: OrderItemRequest[]
  notes?: string
}

interface OrderItemRequest {
  product_id: string
  product_code: string
  quantity: number
  unit_price?: number // 可选，用于时价商品
  notes?: string
}

interface CreateOrderResponse {
  success: true
  data: {
    order: OrderDetail
    validation_warnings?: string[]
  }
}
```

### GET /api/v1/orders/[orderId]

**Purpose**: 获取订单详情

```typescript
interface OrderDetailResponse {
  success: true
  data: OrderDetail
}

interface OrderDetail {
  id: string
  order_number: string
  restaurant: OrganizationInfo
  supplier: OrganizationInfo
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  tax_amount: number
  total_amount: number
  delivery_date: string
  delivery_address?: DeliveryAddress
  adjustments: OrderAdjustment[]
  notes?: string
  status_history: StatusHistoryEntry[]
  created_by: UserInfo
  created_at: string
  updated_at: string
}

interface OrderItem {
  id: string
  product: {
    id: string
    code: string
    name: string
    category?: string
  }
  quantity: number
  unit_price: number
  line_total: number
  notes?: string
}
```

### PUT /api/v1/orders/[orderId]/confirm

**Purpose**: 供应商确认订单

```typescript
interface ConfirmOrderRequest {
  confirmed_items: ConfirmedOrderItem[]
  adjustments?: OrderAdjustmentRequest[]
  estimated_delivery_time?: string
  notes?: string
}

interface ConfirmedOrderItem {
  product_id: string
  confirmed_quantity: number
  confirmed_price?: number // 时价商品必填
  availability_status: 'available' | 'partial' | 'unavailable'
  substitution?: {
    product_id: string
    reason: string
  }
  notes?: string
}
```

---

## 3. Reconciliation System (对账系统)

### POST /api/v1/reconciliation/generate

**Purpose**: 生成对账记录

```typescript
interface GenerateReconciliationRequest {
  restaurant_id: string
  supplier_id: string
  period_start: string // YYYY-MM-DD
  period_end: string
  period_type: 'weekly' | 'monthly' | 'custom'
  auto_resolve_threshold?: number // 0.95
  include_pending_orders?: boolean
}

interface GenerateReconciliationResponse {
  success: true
  data: {
    reconciliation: ReconciliationSummary
    processing_stats: {
      orders_processed: number
      items_matched: number
      discrepancies_found: number
      auto_resolved: number
      processing_time_ms: number
    }
  }
}

interface ReconciliationSummary {
  id: string
  reconciliation_number: string
  restaurant: OrganizationInfo
  supplier: OrganizationInfo
  period_start: string
  period_end: string
  status: ReconciliationStatus
  total_orders: number
  total_amount: number
  discrepancy_count: number
  discrepancy_amount: number
  confidence_score: number
  auto_approved: boolean
  created_at: string
}
```

### GET /api/v1/reconciliation/[reconciliationId]

**Purpose**: 获取对账详情

```typescript
interface ReconciliationDetailResponse {
  success: true
  data: ReconciliationDetail
}

interface ReconciliationDetail {
  id: string
  reconciliation_number: string
  restaurant: OrganizationInfo
  supplier: OrganizationInfo
  period_start: string
  period_end: string
  status: ReconciliationStatus

  // 汇总信息
  summary: {
    total_orders: number
    total_amount: number
    total_quantity: number
    accuracy_rate: number
    discrepancy_count: number
    discrepancy_amount: number
  }

  // 对账明细
  items: ReconciliationItem[]

  // 差异记录
  discrepancies: DiscrepancyDetail[]

  // 解决方案
  resolution?: ResolutionDetail

  confidence_score: number
  auto_approved: boolean

  created_by: UserInfo
  approved_by?: UserInfo
  approved_at?: string
  created_at: string
  updated_at: string
}

interface ReconciliationItem {
  id: string
  order: {
    id: string
    order_number: string
    delivery_date: string
  }
  product: {
    code: string
    name: string
  }
  ordered_quantity: number
  delivered_quantity: number
  accepted_quantity: number
  unit_price: number
  line_total: number
  discrepancy_type?: 'quantity' | 'price' | 'quality' | 'missing'
  discrepancy_amount?: number
  resolution_action?: 'accept' | 'adjust' | 'credit' | 'dispute'
  notes?: string
}
```

### PUT /api/v1/reconciliation/[reconciliationId]/dispute

**Purpose**: 提出对账异议

```typescript
interface DisputeReconciliationRequest {
  discrepancy_items: DisputeItem[]
  dispute_reason: string
  evidence_urls?: string[]
  proposed_resolution: string
}

interface DisputeItem {
  reconciliation_item_id: string
  dispute_type: 'quantity' | 'price' | 'quality' | 'other'
  expected_value: any
  actual_value: any
  evidence_description: string
}
```

### POST /api/v1/reconciliation/[reconciliationId]/approve

**Purpose**: 批准对账结果

```typescript
interface ApproveReconciliationRequest {
  resolution_notes?: string
  payment_terms?: {
    due_date: string
    payment_method: string
    discount_rate?: number
  }
}

interface ApproveReconciliationResponse {
  success: true
  data: {
    reconciliation: ReconciliationSummary
    invoice_generated: boolean
    invoice_id?: string
    payment_due_date: string
  }
}
```

---

## 4. Product & Pricing Management

### GET /api/v1/products

**Purpose**: 获取产品目录

```typescript
interface ProductListQuery {
  supplier_id?: string
  category?: string
  search?: string
  active?: boolean
  page?: number
  limit?: number
}

interface ProductListResponse {
  success: true
  data: {
    products: ProductSummary[]
    categories: CategorySummary[]
    pagination: PaginationInfo
  }
}

interface ProductSummary {
  id: string
  code: string
  name: string
  category: string
  supplier: { id: string; name: string }
  pricing: {
    type: 'fixed' | 'market_price' | 'tiered'
    base_price?: number
    price_range?: { min: number; max: number }
    unit: string
  }
  availability: 'available' | 'limited' | 'unavailable'
  updated_at: string
}
```

### GET /api/v1/products/[productId]/pricing

**Purpose**: 获取产品定价详情

```typescript
interface ProductPricingResponse {
  success: true
  data: {
    product: ProductDetail
    current_pricing: PricingDetail
    pricing_history: PricingHistoryEntry[]
  }
}

interface PricingDetail {
  type: 'fixed' | 'market_price' | 'tiered'
  base_price?: number
  price_range?: { min: number; max: number }
  tiers?: PriceTier[]
  unit: string
  minimum_order_quantity?: number
  valid_from: string
  valid_to?: string
  last_updated: string
}
```

---

## 5. Real-time Features

### GET /api/v1/notifications

**Purpose**: 获取用户通知

```typescript
interface NotificationListResponse {
  success: true
  data: {
    notifications: NotificationItem[]
    unread_count: number
  }
}

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  read_at?: string
  data?: Record<string, any>
  created_at: string
}
```

### PUT /api/v1/notifications/[notificationId]/read

**Purpose**: 标记通知为已读

```typescript
interface MarkNotificationReadResponse {
  success: true
  data: {
    notification_id: string
    read_at: string
  }
}
```

### WebSocket: /api/v1/ws/live-updates

**Purpose**: 实时更新推送

```typescript
interface WebSocketMessage {
  type: 'order_status_change' | 'reconciliation_ready' | 'dispute_created'
  organization_id: string
  data: any
  timestamp: string
}

// Frontend WebSocket connection
function useWebSocket(organizationId: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/api/v1/ws/live-updates?org=${organizationId}`)

    ws.onmessage = event => {
      const message: WebSocketMessage = JSON.parse(event.data)
      // Handle real-time updates
      handleRealtimeUpdate(message)
    }

    setSocket(ws)
    return () => ws.close()
  }, [organizationId])
}
```

---

## 6. File Upload & Management

### POST /api/v1/upload

**Purpose**: 文件上传 (支持多文件)

```typescript
interface FileUploadResponse {
  success: true
  data: {
    files: UploadedFile[]
    upload_session_id: string
  }
}

interface UploadedFile {
  id: string
  filename: string
  original_name: string
  url: string
  size: number
  mimetype: string
  uploaded_at: string
}
```

**Example Usage**:

```typescript
// File upload with progress
async function uploadFiles(files: FileList) {
  const formData = new FormData()
  Array.from(files).forEach(file => {
    formData.append('files', file)
  })

  const response = await fetch('/api/v1/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })

  return response.json()
}
```

---

## 7. ERP Integration

### POST /api/v1/erp/sync

**Purpose**: ERP数据同步

```typescript
interface ERPSyncRequest {
  sync_type: 'full' | 'incremental'
  data_types: ('orders' | 'products' | 'customers')[]
  since_timestamp?: string
  dry_run?: boolean
}

interface ERPSyncResponse {
  success: true
  data: {
    sync_id: string
    status: 'queued' | 'running' | 'completed' | 'failed'
    records_to_sync: number
    estimated_duration_minutes: number
  }
}
```

### GET /api/v1/erp/sync-status/[syncId]

**Purpose**: 查询同步状态

```typescript
interface ERPSyncStatusResponse {
  success: true
  data: {
    sync_id: string
    status: 'queued' | 'running' | 'completed' | 'failed'
    progress: {
      total_records: number
      processed_records: number
      success_count: number
      error_count: number
      percentage: number
    }
    errors?: SyncError[]
    started_at?: string
    completed_at?: string
  }
}
```

### POST /api/v1/erp/webhook/configure

**Purpose**: 配置ERP Webhook

```typescript
interface WebhookConfigRequest {
  url: string
  events: string[]
  secret_key: string
  active: boolean
  retry_config?: {
    max_attempts: number
    backoff_multiplier: number
  }
}

interface WebhookConfigResponse {
  success: true
  data: {
    webhook_id: string
    endpoint_url: string
    verification_token: string
    test_url: string
  }
}
```

---

## 8. Analytics & Reporting

### GET /api/v1/analytics/dashboard

**Purpose**: 获取仪表板数据

```typescript
interface DashboardAnalyticsQuery {
  period: 'today' | 'week' | 'month' | 'quarter'
  date_from?: string
  date_to?: string
}

interface DashboardAnalyticsResponse {
  success: true
  data: {
    summary: {
      total_orders: number
      total_revenue: number
      reconciliation_accuracy: number
      active_suppliers: number
    }
    trends: {
      orders_trend: TrendData[]
      revenue_trend: TrendData[]
      accuracy_trend: TrendData[]
    }
    top_products: ProductAnalytics[]
    recent_activities: ActivityItem[]
  }
}

interface TrendData {
  date: string
  value: number
  change_percentage?: number
}
```

### GET /api/v1/analytics/reconciliation-performance

**Purpose**: 对账性能分析

```typescript
interface ReconciliationPerformanceResponse {
  success: true
  data: {
    overall_metrics: {
      average_processing_time_minutes: number
      accuracy_rate: number
      auto_approval_rate: number
      dispute_rate: number
    }
    by_supplier: SupplierPerformance[]
    by_period: PeriodPerformance[]
    improvement_suggestions: string[]
  }
}
```

---

## 9. Error Handling & Response Format

### Standard Error Response

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, any>
    field_errors?: FieldError[]
  }
  metadata: {
    request_id: string
    timestamp: string
    version: string
  }
}

interface FieldError {
  field: string
  message: string
  code: string
}
```

### Common Error Codes

| Code                      | HTTP Status | Description                     |
| ------------------------- | ----------- | ------------------------------- |
| `UNAUTHORIZED`            | 401         | Invalid or expired token        |
| `FORBIDDEN`               | 403         | Insufficient permissions        |
| `NOT_FOUND`               | 404         | Resource not found              |
| `VALIDATION_ERROR`        | 400         | Request validation failed       |
| `BUSINESS_RULE_VIOLATION` | 422         | Business logic violation        |
| `RATE_LIMIT_EXCEEDED`     | 429         | Too many requests               |
| `INTERNAL_SERVER_ERROR`   | 500         | Server error                    |
| `SERVICE_UNAVAILABLE`     | 503         | Service temporarily unavailable |

### Frontend Error Handling

```typescript
// Centralized API error handler
export class APIError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message)
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!data.success) {
    throw new APIError(data.error.code, response.status, data.error.message, data.error.details)
  }

  return data.data
}
```

---

## 10. Rate Limiting & Caching

### Rate Limiting Headers

```typescript
interface RateLimitHeaders {
  'X-RateLimit-Limit': string // 每分钟限制
  'X-RateLimit-Remaining': string // 剩余请求数
  'X-RateLimit-Reset': string // 重置时间戳
  'Retry-After'?: string // 重试等待秒数
}
```

### Cache Control

```typescript
// API responses include cache control headers
interface CacheHeaders {
  'Cache-Control': string
  ETag: string
  'Last-Modified': string
  Vary: string
}

// Example cache strategies
const CACHE_STRATEGIES = {
  static_data: 'public, max-age=3600', // 1 hour
  user_data: 'private, max-age=300', // 5 minutes
  real_time: 'no-cache, no-store, must-revalidate', // No cache
  conditional: 'private, max-age=0, must-revalidate', // Always validate
}
```

---

## Frontend Integration Examples

### React Query Setup

```typescript
// API client with React Query
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query'

// Custom hooks for API integration
export function useOrders(filters: OrderListQuery) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => apiRequest<OrderListResponse>(`/api/v1/orders?${new URLSearchParams(filters)}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrderRequest) =>
      apiRequest<CreateOrderResponse>('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      // Invalidate orders cache
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
```

### Server Components Data Fetching

```typescript
// Server Component example
async function OrdersPage({ searchParams }: { searchParams: OrderListQuery }) {
  const ordersData = await apiRequest<OrderListResponse>(
    `/api/v1/orders?${new URLSearchParams(searchParams)}`
  );

  return (
    <div>
      <OrdersHeader />
      <OrdersList orders={ordersData.orders} />
      <Pagination {...ordersData.pagination} />
    </div>
  );
}
```

This API specification provides the essential endpoints needed for the 井然 Orderly frontend integration, focusing on the core reconciliation workflow while maintaining flexibility for future enhancements.
