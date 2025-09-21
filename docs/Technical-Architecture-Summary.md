# 井然 Orderly - Technical Architecture Summary

> **Version**: v2.1  
> **Date**: 2025-09-18  
> **Status**: Implementation Ready

---

## Executive Summary

井然 Orderly 采用现代化 **Next.js 14+ App Router 模块化单体架构**，专注于餐饮供应链自动化对账和 ERP 深度整合。系统设计目标是在30分钟内完成对账处理，支持10,000并发用户，确保99.5%可用性。

### 核心价值定位
- **对账自动化**: 90%减少人工对账时间，从8小时降至30分钟
- **ERP 无缝整合**: 支持主流ERP系统的API连接和数据同步
- **实时协作**: 餐厅-供应商端到端订单生命周期管理
- **企业级可靠性**: 多区域部署，自动故障转移，零数据丢失

---

## System Architecture Overview

### High-Level Architecture Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser  │  Mobile PWA   │  ERP Systems  │  Webhook Clients │
└──────┬────────┴──────┬────────┴──────┬────────┴──────┬───────────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CDN Layer (Cloudflare)                        │
│     • Static Assets • Edge Cache • DDoS Protection • Global CDN │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               Next.js Application (Modular Monolith)            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Presentation Layer                      │  │
│  │ • Server Components • Client Components • API Routes    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Business Logic Layer                  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │  Orders  │ │Reconcile │ │ Products │ │   Users  │   │  │
│  │  │  Module  │ │  Module  │ │  Module  │ │  Module  │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │  │
│  │  │Acceptance│ │ Billing  │ │   ERP    │ │Analytics │   │  │
│  │  │  Module  │ │  Module  │ │Integration│ │  Module  │   │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Data Access Layer                     │  │
│  │  • SQLAlchemy ORM + Alembic • Query Optimization • Pool │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬─────────────────────┬──────────────────────────────┘
             │                     │
             ▼                     ▼
┌─────────────────────┐  ┌────────────────────┐
│   PostgreSQL DB     │  │    Redis Cache     │
│  • Primary (Write)  │  │  • Session Store   │
│  • Read Replicas    │  │  • Query Cache     │
│  • Point-in-Time    │  │  • Rate Limiting   │
│  • Cross-Region     │  │  • Task Queue      │
└─────────────────────┘  └────────────────────┘
```

### Technology Stack Decisions

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend Framework** | Next.js 14+ (App Router) | Server Components performance, built-in API routes, excellent TypeScript support |
| **UI Components** | React 18 + Radix UI | Modern patterns with built-in accessibility |
| **Styling** | TailwindCSS + CSS Modules | Utility-first with component-level isolation |
| **State Management** | Zustand + React Query | Lightweight state with powerful server state management |
| **Database** | PostgreSQL 15+ | ACID compliance, JSON support, excellent performance |
| **ORM** | SQLAlchemy 2.x + Alembic | Pythonic ORM, explicit migrations |
| **Cache** | Redis 7+ | High-performance caching, session management |
| **Queue** | BullMQ | Reliable reconciliation job processing |
| **File Storage** | Google Cloud Storage | Scalable document/image storage |
| **Search** | PostgreSQL FTS + Meilisearch | Built-in full-text search + dedicated search engine |
| **Monitoring** | DataDog + Sentry | APM and error tracking |
| **Infrastructure** | Google Cloud Platform | Regional proximity, managed services |

---

## Core Modules Architecture

### 1. Reconciliation Engine (核心对账引擎)

**Purpose**: 30分钟内完成自动化对账，支持多维度差异检测和置信度评分

```typescript
// lib/reconciliation/engine.ts
interface ReconciliationEngine {
  // 自动匹配算法
  autoMatch(orders: Order[], deliveries: Delivery[]): MatchResult[];
  
  // 置信度评分 (0-1.0)
  calculateConfidence(matches: MatchResult[]): number;
  
  // 差异检测
  detectDiscrepancies(matches: MatchResult[]): Discrepancy[];
  
  // 自动解决策略
  autoResolve(discrepancies: Discrepancy[]): Resolution[];
}
```

**Key Features**:
- **智能匹配算法**: 基于订单号、商品代码、数量、金额的多维度匹配
- **置信度评分**: ML模型评估对账结果可信度，>95%自动通过
- **异常检测**: 价格偏差、数量短缺、品质问题的自动识别
- **工作流自动化**: 低风险差异自动解决，高风险差异人工审核

### 2. ERP Integration Hub (ERP整合中心)

**Purpose**: 统一ERP适配器接口，支持主流ERP系统的双向数据同步

```typescript
// lib/erp/adapter-interface.ts
interface ERPAdapter {
  name: string;
  version: string;
  
  // 数据映射
  mapOrder(order: Order): ERPOrder;
  mapProduct(product: Product): ERPProduct;
  mapReconciliation(recon: Reconciliation): ERPReconciliation;
  
  // 双向同步
  sendData(data: any): Promise<ERPResponse>;
  receiveWebhook(payload: any): Promise<void>;
  
  // 健康检查
  healthCheck(): Promise<boolean>;
}
```

**Supported ERP Systems**:
- **鼎新 Digiwin**: 台湾中小企业主流ERP
- **Microsoft Dynamics 365**: 国际企业级ERP
- **SAP Business One**: 中大型企业ERP
- **Oracle NetSuite**: 云端ERP解决方案

### 3. Order Lifecycle Management (订单生命周期管理)

**Purpose**: 端到端订单流程管理，从创建到结算的完整追踪

```typescript
// lib/orders/lifecycle.ts
enum OrderStatus {
  draft = 'draft',
  submitted = 'submitted', 
  confirmed = 'confirmed',
  preparing = 'preparing',
  shipped = 'shipped',
  delivered = 'delivered',
  accepted = 'accepted',
  completed = 'completed',
  cancelled = 'cancelled'
}

interface OrderWorkflow {
  createOrder(data: CreateOrderRequest): Promise<Order>;
  confirmOrder(orderId: string, confirmData: ConfirmOrderData): Promise<Order>;
  shipOrder(orderId: string, shipData: ShipOrderData): Promise<Order>;
  acceptDelivery(orderId: string, acceptData: AcceptanceData): Promise<Order>;
  triggerReconciliation(orderId: string): Promise<Reconciliation>;
}
```

### 4. Multi-Tenant Security (多租户安全架构)

**Purpose**: 组织级数据隔离，基于角色的权限控制

```typescript
// lib/auth/multi-tenant.ts
interface TenantContext {
  organizationId: string;
  userRole: UserRole;
  permissions: Permission[];
}

// Database Row-Level Security
const RLS_POLICIES = {
  restaurant_data: 'restaurant_id = current_setting("app.organization_id")::uuid',
  supplier_data: 'supplier_id = current_setting("app.organization_id")::uuid',
  cross_tenant: 'organization_id IN (SELECT id FROM authorized_orgs())'
};
```

---

## Performance & Scalability Targets

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time** | P95 < 300ms | All REST endpoints |
| **Reconciliation Processing** | < 30 minutes | For monthly reconciliation |
| **Database Query Time** | P99 < 100ms | Core business queries |
| **Cache Hit Rate** | > 85% | Redis cache effectiveness |
| **UI Response Time** | < 200ms | Client-side interactions |

### Scalability Architecture

```yaml
# Auto-scaling Configuration
scaling:
  min_instances: 2
  max_instances: 100
  
  triggers:
    - metric: cpu_utilization
      target: 60%
    - metric: memory_utilization  
      target: 70%
    - metric: request_count_per_instance
      target: 1000
    - metric: reconciliation_queue_length
      target: 100

# Database Scaling
database:
  connection_pool: 25
  read_replicas: 2-5 (auto-scale)
  query_timeout: 30s
  statement_timeout: 60s
```

### Caching Strategy

```typescript
// Multi-layer Cache Strategy
interface CacheStrategy {
  L1: InMemoryCache;    // 10ms access time
  L2: RedisCache;       // 50ms access time  
  L3: DatabaseCache;    // 100ms+ access time
}

// Cache Invalidation
const CACHE_TTL = {
  products: 3600,           // 1 hour
  price_tables: 1800,       // 30 minutes
  user_sessions: 86400,     // 24 hours
  reconciliation_results: 7200  // 2 hours
};
```

---

## Security Architecture

### Authentication & Authorization

```typescript
// JWT-based Authentication
interface AuthTokens {
  accessToken: string;   // 1 hour expiry
  refreshToken: string;  // 7 days expiry
  scope: string[];       // Permission scopes
}

// Role-Based Access Control
const PERMISSIONS = {
  'restaurant_admin': ['orders:*', 'reconciliation:*', 'users:manage'],
  'restaurant_manager': ['orders:read', 'orders:create', 'reconciliation:read'],
  'supplier_admin': ['orders:read', 'orders:confirm', 'products:*'],
  'platform_admin': ['*']
};
```

### Data Protection

```typescript
// Encryption at Rest
interface EncryptionService {
  encryptPII(data: string): Promise<string>;
  decryptPII(encrypted: string): Promise<string>;
  encryptSensitiveData(data: any, keyId: string): Promise<EncryptedData>;
}

// Audit Trail
interface AuditLog {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'approve';
  userId: string;
  changes: Record<string, any>;
  ipAddress: string;
  timestamp: Date;
}
```

---

## Integration Patterns

### ERP Integration Architecture

```typescript
// Adapter Registry Pattern
class ERPAdapterRegistry {
  private adapters = new Map<string, ERPAdapter>();
  
  register(name: string, adapter: ERPAdapter): void;
  get(name: string): ERPAdapter;
  
  async syncToERP(orgId: string, data: any): Promise<ERPResponse> {
    const org = await this.getOrganization(orgId);
    const adapter = this.get(org.erpConfig.type);
    return adapter.sendData(data);
  }
}

// Webhook Event System
interface WebhookEvent {
  event_type: string;
  organization_id: string;
  data: any;
  timestamp: Date;
  signature: string;
}
```

### API Gateway Pattern

```typescript
// Middleware Pipeline
const apiMiddleware = compose(
  rateLimiter(),     // Rate limiting
  authenticate(),    // JWT validation
  authorize(),       // Permission check
  validate(),        // Request validation
  transform(),       // Data transformation
  cache(),          // Response caching
  audit()           // Audit logging
);
```

---

## Deployment & Infrastructure

### Multi-Region Deployment

```yaml
# Google Cloud Platform Regions
regions:
  primary:
    location: asia-east1      # Taiwan
    services: [cloud-run, cloud-sql, redis, storage]
    
  secondary: 
    location: asia-southeast1 # Singapore
    services: [cloud-run, cloud-sql-replica, redis]
    
  disaster_recovery:
    location: us-central1     # Iowa
    services: [cloud-sql-standby, storage-backup]
```

### High Availability Features

- **RTO (Recovery Time Objective)**: < 5 minutes
- **RPO (Recovery Point Objective)**: 0 (zero data loss)
- **Automatic Failover**: Database and application tier
- **Health Checks**: Every 30 seconds with 3-strike failure detection
- **Circuit Breakers**: For external service dependencies

---

## Monitoring & Observability

### SLO/SLA Monitoring

```yaml
slo:
  availability:
    target: 99.9%
    error_budget: 0.1%
    measurement_window: 30d
    
  performance:
    api_response_time:
      target: 300ms (P95)
      measurement_window: 24h
      
    reconciliation_processing:
      target: 30min (P99)
      measurement_window: 1h
      
  business_metrics:
    reconciliation_accuracy:
      target: 99.5%
      measurement_window: 7d
```

### Multi-Provider APM

- **DataDog**: Infrastructure monitoring, APM traces, business metrics
- **Sentry**: Error tracking, performance monitoring, release management
- **Prometheus + Grafana**: Custom metrics, alerting, operational dashboards

---

## Development Workflow

### Code Organization

```
/app
  /api              # API routes (Next.js App Router)
  /(app)            # Application pages  
  /components       # React components
/lib
  /modules          # Business logic modules
    /orders
    /reconciliation
    /products
    /users
  /shared           # Shared utilities
  /infrastructure   # Technical concerns (auth, cache, db)
/prisma             # Database schema and migrations
/tests              # Test suites (unit, integration, e2e)
```

### Testing Strategy

- **Unit Tests**: ≥80% coverage requirement
- **Integration Tests**: API endpoints with ephemeral databases
- **E2E Tests**: Critical user journeys with Playwright
- **Load Tests**: k6 performance benchmarks
- **Chaos Engineering**: Network partitions, resource exhaustion

---

## Migration Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Next.js application setup with module structure
- [ ] Database layer (SQLAlchemy + Alembic) with PostgreSQL
- [ ] Authentication & authorization system  
- [ ] Redis cache infrastructure

### Phase 2: Core Modules (Weeks 3-4)
- [ ] User management module
- [ ] Product catalog module
- [ ] Order management system
- [ ] Reconciliation engine foundation

### Phase 3: Integration (Weeks 5-6)
- [ ] ERP adapter framework
- [ ] Webhook delivery system
- [ ] Notification service
- [ ] File upload/processing

### Phase 4: Migration (Weeks 7-8) 
- [ ] Data migration scripts
- [ ] API compatibility layer
- [ ] Traffic routing configuration
- [ ] Rollback procedures

### Phase 5: Optimization (Weeks 9-10)
- [ ] Performance tuning
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation completion

---

## Key Design Principles

### 1. Domain-Driven Design
- Bounded contexts for each business domain
- Aggregate roots for consistency boundaries  
- Loose coupling through domain events
- Repository pattern for data access

### 2. API Design
- RESTful conventions with OpenAPI 3.0 spec
- Consistent error response format
- Pagination for list endpoints
- Versioning strategy (header-based)

### 3. Performance Optimization
- Query optimization with proper indexing
- Multi-layer caching strategy
- Connection pooling for database access
- Background job processing for heavy operations

### 4. Security Best Practices
- Zero-trust security model
- Encryption at rest and in transit
- Regular security audits and penetration testing
- Principle of least privilege access

This technical architecture provides a solid foundation for the 井然 Orderly platform, balancing simplicity with enterprise requirements while ensuring scalability, maintainability, and performance to support the critical automated reconciliation and ERP integration capabilities.
# Technical Architecture Summary

Note: The repository has migrated from a legacy Node ORM to SQLAlchemy + Alembic on FastAPI services. Any prior legacy ORM references are deprecated and will be updated progressively.
