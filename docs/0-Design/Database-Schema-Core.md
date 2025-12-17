# 井然 Orderly - Database Schema Core

> **Version**: v2.1  
> **Date**: 2025-09-18  
> **Status**: Implementation Ready

---

## Schema Overview

井然 Orderly 数据库采用 **PostgreSQL 15+** 与 **SQLAlchemy ORM**，专为多租户餐饮供应链对账场景设计。核心设计原则：

- **多租户隔离**: 组织级数据隔离，支持行级安全策略 (RLS)
- **对账优化**: 为30分钟内完成对账流程优化的表结构和索引
- **审计追踪**: 完整的数据变更记录，满足财务合规要求
- **高性能**: 针对高频查询优化的索引策略和物化视图

---

## Core Entity Relationships

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Organization   │◄──►│      User       │    │    Product      │
│                 │    │                 │    │                 │
│ • restaurant    │    │ • multi-roles   │    │ • pricing       │
│ • supplier      │    │ • permissions   │    │ • categories    │
└─────────┬───────┘    └─────────────────┘    └────────┬────────┘
          │                                            │
          │            ┌─────────────────┐             │
          └───────────►│     Order       │◄────────────┘
                       │                 │
                       │ • status_flow   │
                       │ • adjustments   │
                       └─────────┬───────┘
                                 │
                       ┌─────────▼───────┐
                       │ Reconciliation  │
                       │                 │
                       │ • auto_match    │
                       │ • confidence    │
                       │ • discrepancies │
                       └─────────────────┘
```

---

## 1. Multi-Tenant Foundation

### Organizations (组织管理)

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('restaurant', 'supplier')),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务索引
  CONSTRAINT valid_org_type CHECK (type IN ('restaurant', 'supplier'))
);

-- 组织类型索引
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_active = true;
```

**Key Features**:

- **Type-based segregation**: 餐厅和供应商的清晰区分
- **Settings JSON**: 灵活的组织级配置存储
- **Soft delete**: 通过 `is_active` 实现逻辑删除

### Users (用户与权限)

```sql
CREATE TYPE user_role AS ENUM (
  'restaurant_admin',
  'restaurant_manager',
  'restaurant_operator',
  'supplier_admin',
  'supplier_manager',
  'platform_admin'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  token_version INT DEFAULT 0,  -- 用于全局登出
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务约束
  CONSTRAINT valid_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 用户查询优化索引
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email_active ON users(email) WHERE is_active = true;
CREATE INDEX idx_users_role_org ON users(role, organization_id);
```

**Security Features**:

- **Role-based access**: 细粒度的权限角色设计
- **Token versioning**: 支持强制全局登出功能
- **Email validation**: 数据库级别的邮箱格式验证

---

## 2. Product & Pricing System

### Products (产品目录)

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  pricing JSONB NOT NULL,  -- 灵活定价规则
  specifications JSONB DEFAULT '{}',
  version INT NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务约束
  UNIQUE(supplier_id, code, version),
  CONSTRAINT positive_version CHECK (version > 0),
  CONSTRAINT valid_pricing CHECK (pricing IS NOT NULL)
);

-- 产品查询优化
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_code ON products(supplier_id, code);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active) WHERE active = true;

-- 全文搜索支持
CREATE INDEX idx_products_search ON products
USING gin(to_tsvector('simple', name || ' ' || COALESCE(code, '')));
```

**Pricing JSON Structure**:

```json
{
  "type": "fixed|market_price|tiered",
  "base_price": 25.5,
  "price_range": { "min": 20.0, "max": 30.0 },
  "unit": "斤",
  "minimum_order": 10,
  "tiers": [
    { "from": 1, "to": 50, "price": 25.5 },
    { "from": 51, "to": 100, "price": 24.0 }
  ],
  "valid_from": "2025-09-01T00:00:00Z",
  "valid_to": "2025-12-31T23:59:59Z"
}
```

---

## 3. Order Lifecycle Management

### Orders (订单管理)

```sql
CREATE TYPE order_status AS ENUM (
  'draft',
  'submitted',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'accepted',
  'completed',
  'cancelled'
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  restaurant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status order_status DEFAULT 'draft',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  delivery_date DATE NOT NULL,
  delivery_address JSONB,
  notes TEXT,
  adjustments JSONB DEFAULT '[]',  -- 调整项记录
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务约束
  CONSTRAINT positive_amounts CHECK (
    subtotal >= 0 AND tax_amount >= 0 AND total_amount >= 0
  ),
  CONSTRAINT valid_delivery_date CHECK (delivery_date >= CURRENT_DATE),
  CONSTRAINT matching_organization_types CHECK (
    (SELECT type FROM organizations WHERE id = restaurant_id) = 'restaurant' AND
    (SELECT type FROM organizations WHERE id = supplier_id) = 'supplier'
  )
);

-- 订单查询性能优化
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_supplier ON orders(supplier_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date);
CREATE INDEX idx_orders_restaurant_supplier ON orders(restaurant_id, supplier_id);
CREATE INDEX idx_orders_period_lookup ON orders(restaurant_id, supplier_id, delivery_date);

-- 订单号搜索
CREATE INDEX idx_orders_search ON orders
USING gin(to_tsvector('simple', order_number || ' ' || COALESCE(notes, '')));
```

### Order Items (订单明细)

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_code VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit_price DECIMAL(10, 4) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务约束
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT positive_price CHECK (unit_price >= 0),
  CONSTRAINT calculated_line_total CHECK (
    ABS(line_total - (quantity * unit_price)) < 0.01
  )
);

-- 订单明细查询优化
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
CREATE INDEX idx_order_items_code ON order_items(product_code);
```

---

## 4. Reconciliation Engine

### Reconciliations (对账记录)

```sql
CREATE TYPE reconciliation_status AS ENUM (
  'pending',
  'processing',
  'review_required',
  'approved',
  'disputed',
  'resolved'
);

CREATE TABLE reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_number VARCHAR(50) UNIQUE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  restaurant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status reconciliation_status DEFAULT 'pending',

  -- 对账汇总数据
  summary JSONB NOT NULL DEFAULT '{}',

  -- 差异记录
  discrepancies JSONB DEFAULT '[]',

  -- 解决方案
  resolution JSONB,

  -- AI置信度评分 (0.0000 to 1.0000)
  confidence_score DECIMAL(5, 4),

  -- 自动审批标识
  auto_approved BOOLEAN DEFAULT false,

  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务约束
  CONSTRAINT valid_period CHECK (period_end > period_start),
  CONSTRAINT valid_confidence CHECK (
    confidence_score IS NULL OR
    (confidence_score >= 0.0000 AND confidence_score <= 1.0000)
  ),
  CONSTRAINT approval_consistency CHECK (
    (approved_by IS NULL AND approved_at IS NULL) OR
    (approved_by IS NOT NULL AND approved_at IS NOT NULL)
  )
);

-- 对账查询性能优化
CREATE INDEX idx_reconciliations_restaurant_supplier ON reconciliations(restaurant_id, supplier_id);
CREATE INDEX idx_reconciliations_period ON reconciliations(restaurant_id, supplier_id, period_start, period_end);
CREATE INDEX idx_reconciliations_status ON reconciliations(status);
CREATE INDEX idx_reconciliations_confidence ON reconciliations(confidence_score) WHERE confidence_score IS NOT NULL;
CREATE INDEX idx_reconciliations_auto_approved ON reconciliations(auto_approved) WHERE auto_approved = true;
```

**Summary JSON Structure**:

```json
{
  "total_orders": 45,
  "total_amount": 125680.5,
  "total_quantity": 2340.5,
  "discrepancy_count": 3,
  "discrepancy_amount": 245.8,
  "accuracy_rate": 0.9954,
  "processing_time_seconds": 125,
  "auto_resolved_count": 2,
  "manual_review_count": 1
}
```

### Reconciliation Items (对账明细)

```sql
CREATE TABLE reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES reconciliations(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  product_code VARCHAR(100) NOT NULL,

  -- 数量对比
  ordered_quantity DECIMAL(10, 3) NOT NULL,
  delivered_quantity DECIMAL(10, 3) NOT NULL,
  accepted_quantity DECIMAL(10, 3) NOT NULL,

  -- 金额计算
  unit_price DECIMAL(10, 4) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,

  -- 差异分析
  discrepancy_type VARCHAR(50),  -- 'quantity', 'price', 'quality', 'missing'
  discrepancy_amount DECIMAL(12, 2),

  -- 解决方案
  resolution_action VARCHAR(50), -- 'accept', 'adjust', 'credit', 'dispute'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务约束
  CONSTRAINT positive_quantities CHECK (
    ordered_quantity >= 0 AND
    delivered_quantity >= 0 AND
    accepted_quantity >= 0
  ),
  CONSTRAINT positive_price CHECK (unit_price >= 0),
  CONSTRAINT valid_discrepancy CHECK (
    (discrepancy_type IS NULL AND discrepancy_amount IS NULL) OR
    (discrepancy_type IS NOT NULL AND discrepancy_amount IS NOT NULL)
  )
);

-- 对账明细查询优化
CREATE INDEX idx_reconciliation_items_reconciliation ON reconciliation_items(reconciliation_id);
CREATE INDEX idx_reconciliation_items_order ON reconciliation_items(order_id);
CREATE INDEX idx_reconciliation_items_discrepancy ON reconciliation_items(discrepancy_type) WHERE discrepancy_type IS NOT NULL;
```

---

## 5. Performance Optimization

### Materialized Views (物化视图)

```sql
-- 对账汇总视图 (每小时刷新)
CREATE MATERIALIZED VIEW reconciliation_summary AS
SELECT
  restaurant_id,
  supplier_id,
  DATE_TRUNC('month', period_end) as period_month,
  COUNT(*) as reconciliation_count,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
  SUM((summary->>'total_amount')::decimal) as total_amount,
  AVG((summary->>'accuracy_rate')::decimal) as avg_accuracy_rate,
  AVG(confidence_score) as avg_confidence_score,
  MAX(updated_at) as last_updated
FROM reconciliations
WHERE status IN ('approved', 'disputed', 'resolved')
GROUP BY restaurant_id, supplier_id, DATE_TRUNC('month', period_end);

CREATE UNIQUE INDEX idx_recon_summary_unique ON reconciliation_summary(restaurant_id, supplier_id, period_month);

-- 自动刷新策略
CREATE OR REPLACE FUNCTION refresh_reconciliation_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY reconciliation_summary;
END;
$$ LANGUAGE plpgsql;

-- 每小时刷新 (需要 pg_cron 扩展)
SELECT cron.schedule('refresh-recon-summary', '0 * * * *', 'SELECT refresh_reconciliation_summary();');
```

### Query Optimization Functions

```sql
-- 快速对账匹配查询
CREATE OR REPLACE FUNCTION find_reconciliation_candidates(
  p_restaurant_id UUID,
  p_supplier_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  order_id UUID,
  order_number VARCHAR,
  total_amount DECIMAL,
  item_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.total_amount,
    COUNT(oi.id) as item_count
  FROM orders o
  JOIN order_items oi ON o.id = oi.order_id
  WHERE o.restaurant_id = p_restaurant_id
    AND o.supplier_id = p_supplier_id
    AND o.delivery_date BETWEEN p_period_start AND p_period_end
    AND o.status IN ('delivered', 'accepted', 'completed')
    AND NOT EXISTS (
      SELECT 1 FROM reconciliation_items ri
      WHERE ri.order_id = o.id
    )
  GROUP BY o.id, o.order_number, o.total_amount
  ORDER BY o.delivery_date;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Audit & Compliance

### Audit Logs (审计日志)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,  -- 表名
  entity_id UUID NOT NULL,           -- 记录ID
  action VARCHAR(50) NOT NULL,       -- 'create', 'update', 'delete', 'approve'
  user_id UUID REFERENCES users(id),
  changes JSONB,                     -- before/after 值
  metadata JSONB DEFAULT '{}',       -- 额外信息
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 业务约束
  CONSTRAINT valid_action CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject'))
);

-- 审计日志查询优化
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- 分区策略 (按月分区)
CREATE TABLE audit_logs_y2025m09 PARTITION OF audit_logs
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
```

### Auto-Audit Triggers

```sql
-- 自动审计触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    user_id,
    changes,
    ip_address
  ) VALUES (
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    LOWER(TG_OP),
    NULLIF(current_setting('app.user_id', true), '')::UUID,
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE jsonb_build_object(
        'before', to_jsonb(OLD),
        'after', to_jsonb(NEW)
      )
    END,
    NULLIF(current_setting('app.ip_address', true), '')::INET
  );

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- 为关键表添加审计触发器
CREATE TRIGGER audit_orders_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_reconciliations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reconciliations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 7. Row Level Security (RLS)

### Multi-Tenant Data Isolation

```sql
-- 启用行级安全
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 餐厅数据访问策略
CREATE POLICY restaurant_order_policy ON orders
  FOR ALL
  TO authenticated_users
  USING (restaurant_id = current_setting('app.organization_id')::UUID);

-- 供应商数据访问策略
CREATE POLICY supplier_order_policy ON orders
  FOR SELECT
  TO authenticated_users
  USING (supplier_id = current_setting('app.organization_id')::UUID);

-- 平台管理员全局访问
CREATE POLICY platform_admin_policy ON orders
  FOR ALL
  TO authenticated_users
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = current_setting('app.user_id')::UUID
        AND role = 'platform_admin'
    )
  );

-- 对账记录访问策略
CREATE POLICY reconciliation_access_policy ON reconciliations
  FOR ALL
  TO authenticated_users
  USING (
    restaurant_id = current_setting('app.organization_id')::UUID OR
    supplier_id = current_setting('app.organization_id')::UUID
  );
```

---

## 8. Backup & Recovery Strategy

### Backup Configuration

```sql
-- 连续备份配置
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'gcloud storage cp %p gs://orderly-backup-primary/wal/%f';
ALTER SYSTEM SET wal_level = replica;

-- 时间点恢复
SELECT pg_start_backup('daily_backup');
-- 执行文件系统备份
SELECT pg_stop_backup();

-- 自动清理旧备份
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS void AS $$
BEGIN
  -- 清理30天前的WAL文件
  PERFORM * FROM pg_ls_archive_statusdir()
  WHERE modification_time < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### Data Retention Policies

```sql
-- 审计日志保留策略 (保留2年)
CREATE OR REPLACE FUNCTION cleanup_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '2 years';

  -- 记录清理统计
  INSERT INTO system_events (event_type, message, created_at)
  VALUES ('audit_cleanup', 'Cleaned up audit logs older than 2 years', NOW());
END;
$$ LANGUAGE plpgsql;

-- 工作流任务清理 (保留30天)
CREATE OR REPLACE FUNCTION cleanup_workflow_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM workflow_tasks
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql;
```

---

## Database Sizing & Performance

### Connection Pool Configuration

```typescript
// SQLAlchemy connection configuration
const databaseUrl = buildDatabaseUrl({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT ?? '5432',
  name: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const prisma = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
  // Connection pool settings
  connection_limit: 25,
  pool_timeout: 10,
  statement_timeout: 30000,
  query_timeout: 30000,
})
```

### Performance Targets

| Metric                        | Target          | Notes                  |
| ----------------------------- | --------------- | ---------------------- |
| **Query Response Time**       | P95 < 100ms     | Core business queries  |
| **Reconciliation Processing** | < 30 minutes    | Monthly reconciliation |
| **Connection Pool**           | 80% utilization | Peak load handling     |
| **Index Hit Ratio**           | > 99%           | Cache effectiveness    |
| **Transaction Duration**      | P99 < 5 seconds | Long-running queries   |

This database schema provides the foundation for the 井然 Orderly platform's core functionality, optimized for high-performance reconciliation processing while maintaining data integrity and audit compliance.
