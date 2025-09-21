# Service Layer Architecture Design
## Customer Hierarchy Service - FastAPI Implementation

### Overview

This document outlines the comprehensive service layer architecture for the 4-level customer hierarchy system. The architecture is designed for scalability, reliability, and maintainability with enterprise-grade features.

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer (FastAPI)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ Hierarchy   │ │ Migration   │ │ Bulk Ops    │ │ Entity CRUD ││
│  │ Endpoints   │ │ Endpoints   │ │ Endpoints   │ │ Endpoints   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Core Business Services                       ││
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            ││
│  │ │ Hierarchy   │ │ Migration   │ │ Bulk        │            ││
│  │ │ Service     │ │ Service     │ │ Service     │            ││
│  │ └─────────────┘ └─────────────┘ └─────────────┘            ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Infrastructure Services                        ││
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐││
│  │ │ Cache   │ │ Audit   │ │Validation│ │Integration│ │Background│││
│  │ │ Service │ │ Service │ │ Service  │ │ Service   │ │ Jobs    │││
│  │ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ CRUD Layer  │ │ Models      │ │ Database    │ │ Cache       ││
│  │ (SQLAlchemy)│ │ (SQLAlchemy)│ │ (PostgreSQL)│ │ (Redis)     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ User        │ │ Order       │ │ Billing     │ │ Notification││
│  │ Service     │ │ Service     │ │ Service     │ │ Service     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 2. Core Business Services

### 2.1 HierarchyService

**Purpose**: Core service for hierarchy tree operations and caching

**Key Features**:
- High-performance tree operations with Redis caching (<50ms query time)
- Advanced search with full-text capabilities and permission filtering
- Breadcrumb navigation and path resolution
- Hierarchy validation and move operations
- Real-time statistics and performance monitoring

**Performance Targets**:
- Tree queries: <50ms response time
- Cache hit rate: >90% for frequently accessed data
- Search operations: <100ms for complex queries

**Key Methods**:
```python
async def get_tree(root_id, max_depth, include_inactive, user_context)
async def search(query, search_types, filters, user_context)  
async def get_breadcrumb(node_id, node_type, user_context)
async def validate_move(source_id, target_parent_id, user_context)
async def move_node(source_id, target_parent_id, moved_by)
```

### 2.2 MigrationService

**Purpose**: Data migration workflows for hierarchy upgrades

**Key Features**:
- Multi-source migration support (legacy systems, ERP, CSV)
- Atomic migration execution with rollback capabilities
- Background processing for large datasets
- Progress tracking and real-time monitoring
- Comprehensive validation and preview capabilities

**Performance Targets**:
- Migration throughput: 1000+ entities per minute
- Rollback time: <5 minutes for any migration size
- Success rate: >95% for validated migrations

**Key Methods**:
```python
async def create_migration_plan(plan_data, created_by)
async def validate_migration_plan(plan_id, user_id)
async def preview_migration(plan_id, sample_size, user_id)
async def start_migration_execution(plan_id, executed_by)
async def rollback_migration(plan_id, execution_id, rolled_back_by)
```

### 2.3 BulkService

**Purpose**: Batch operations for large-scale entity processing

**Key Features**:
- High-performance batch processing (1000+ entities support)
- Background processing with progress tracking
- Transaction safety with atomic operations and rollback
- Multi-format import/export (CSV, Excel, JSON)
- Comprehensive validation with business rule enforcement

**Performance Targets**:
- Batch processing: 500+ entities per minute
- Background threshold: 100 entities
- Success rate: >98% for validated operations

**Key Methods**:
```python
async def start_bulk_create(bulk_data, created_by, user_context)
async def validate_bulk_move(move_data, user_context, user_id)
async def bulk_validate(validation_data, user_context, user_id)
async def start_bulk_export(export_data, exported_by, user_context)
```

## 3. Infrastructure Services

### 3.1 CacheService

**Purpose**: Redis-based caching with intelligent TTL management

**Key Features**:
- Connection pooling for optimal performance
- Pattern-based bulk operations for cache invalidation
- Circuit breaker pattern for cache failures
- Performance monitoring and metrics collection
- JSON and binary serialization support

**Performance Targets**:
- Cache operations: <5ms response time
- Hit rate: >85% across all operations
- Circuit breaker threshold: 5 failures

**Key Methods**:
```python
async def get(key, default)
async def set(key, value, ttl, serialization)
async def delete_pattern(pattern)
async def get_multi(keys)
async def set_multi(key_value_pairs, ttl)
```

### 3.2 IntegrationService

**Purpose**: External service communication with resilience patterns

**Key Features**:
- Circuit breaker pattern for service failures
- Retry logic with exponential backoff
- Health monitoring and status tracking
- Async communication with connection pooling
- Fallback mechanisms for critical operations

**Performance Targets**:
- Service response time: <2 seconds average
- Circuit breaker recovery: 60 seconds
- Health check frequency: Every 30 seconds

**Key Methods**:
```python
async def validate_user_permissions(user_id, resource_type, action)
async def notify_hierarchy_change(action, entity_id, entity_type, details)
async def validate_order_permissions(company_id, location_id, unit_id)
async def get_health_status()
```

### 3.3 AuditService

**Purpose**: Comprehensive audit logging for compliance and monitoring

**Key Features**:
- Detailed audit trails for all business operations
- Structured logging with correlation IDs
- Performance metrics collection
- Compliance-ready log formats (SOX, GDPR)
- Automatic log retention and archival

**Performance Targets**:
- Audit log write time: <10ms
- Log retention: 7 years for compliance
- Error rate: <0.1%

**Key Methods**:
```python
async def log_entity_created(entity_type, entity_id, entity_data, created_by)
async def log_entity_updated(entity_type, entity_id, before_state, after_state)
async def log_hierarchy_move(source_id, target_parent_id, moved_by, affected_count)
async def get_audit_trail(entity_type, entity_id, start_date, end_date)
```

### 3.4 ValidationService

**Purpose**: Business rule validation engine

**Key Features**:
- Configurable validation rules engine
- Taiwan-specific business compliance validation
- Hierarchy constraint validation
- Custom validation rules with severity levels
- Performance-optimized validation execution

**Performance Targets**:
- Validation time: <50ms per entity
- Rule execution: <10ms per rule
- Custom rule support: Unlimited

**Key Methods**:
```python
async def validate_entity(entity_type, entity_data, operation_type, context)
async def validate_hierarchy_operation(operation_type, source_entity, target_entity)
async def validate_bulk_operation(entities, operation_type, context)
def add_custom_validation_rule(entity_type, rule_name, rule_function)
```

### 3.5 BackgroundJobService

**Purpose**: Async task processing for long-running operations

**Key Features**:
- Async job queue with priority-based execution
- Automatic retry logic with exponential backoff
- Progress tracking and real-time monitoring
- Resource management and concurrency control
- Graceful shutdown and cleanup

**Performance Targets**:
- Job throughput: 100+ jobs per minute
- Queue capacity: 1000 jobs
- Worker pool: 5 concurrent workers

**Key Methods**:
```python
async def submit_job(job_type, function, priority, max_retries, timeout)
async def get_job_status(job_id)
async def cancel_job(job_id)
async def get_queue_stats()
```

## 4. Service Dependencies and Integration

### 4.1 Service Dependency Graph

```
HierarchyService
├── CacheService (caching)
├── IntegrationService (external services)
├── AuditService (change logging)
└── ValidationService (business rules)

MigrationService
├── CacheService (progress tracking)
├── IntegrationService (notifications)
├── AuditService (migration logging)
├── ValidationService (data validation)
└── BackgroundJobService (async execution)

BulkService
├── HierarchyService (hierarchy operations)
├── CacheService (operation tracking)
├── IntegrationService (notifications)
├── AuditService (operation logging)
├── ValidationService (bulk validation)
└── BackgroundJobService (background processing)
```

### 4.2 External Service Integration Points

**User Service Integration**:
- User permission validation
- Authentication context resolution
- Role-based access control

**Order Service Integration**:
- Ordering permission validation
- Hierarchy change notifications
- Company-level order constraints

**Billing Service Integration**:
- Company hierarchy change notifications
- Invoice routing and structure updates
- Payment hierarchy configuration

**Notification Service Integration**:
- Real-time hierarchy change alerts
- Migration status notifications
- Bulk operation completion alerts

## 5. Caching Strategy

### 5.1 Cache Hierarchy

```
Cache Layers:
├── L1: Application Memory (Fast access for active sessions)
├── L2: Redis Cache (Shared across instances)
└── L3: Database (Persistent storage)

Cache Types:
├── Hierarchy Trees (10 minute TTL)
├── Entity Details (5 minute TTL)
├── Search Results (2 minute TTL)
├── User Permissions (15 minute TTL)
└── Statistics (5 minute TTL)
```

### 5.2 Cache Invalidation Strategy

**Intelligent Invalidation**:
- Pattern-based invalidation for hierarchy changes
- Cascade invalidation for parent-child relationships
- Selective invalidation for bulk operations
- Time-based invalidation for statistics

**Cache Keys**:
```
hierarchy_tree:{root_id}:{depth}:{filters}:{user_scope}
entity:{entity_type}:{entity_id}
breadcrumb:{node_type}:{node_id}:{user_scope}
search:{query_hash}:{filters}:{user_scope}
stats:{scope}:{include_inactive}:{user_scope}
```

## 6. Background Job Architecture

### 6.1 Job Types and Processing

```
Job Priority Queue:
├── CRITICAL (0): System maintenance, rollbacks
├── HIGH (1): User-initiated operations
├── NORMAL (2): Scheduled tasks, reports
└── LOW (3): Cleanup, archival operations

Job Types:
├── migration_execution (HIGH priority)
├── bulk_operation (NORMAL priority)
├── data_export (NORMAL priority)
├── cache_warming (LOW priority)
└── audit_archival (LOW priority)
```

### 6.2 Retry and Error Handling

**Retry Strategy**:
- Maximum retries: 3 attempts
- Exponential backoff: 5s, 10s, 20s, 40s
- Circuit breaker for persistent failures
- Dead letter queue for manual review

**Error Handling**:
- Structured error logging with correlation IDs
- Automatic error classification and routing
- Failure notification for critical operations
- Rollback triggers for data consistency

## 7. Performance Optimization

### 7.1 Database Optimization

**Query Optimization**:
- Recursive CTEs for hierarchy traversal
- Selective loading with SQLAlchemy optimizations
- Connection pooling (min: 5, max: 20)
- Read replicas for query workloads

**Indexing Strategy**:
```sql
-- Hierarchy traversal indexes
CREATE INDEX idx_company_group_id ON customer_companies(group_id);
CREATE INDEX idx_location_company_id ON customer_locations(company_id);
CREATE INDEX idx_unit_location_id ON business_units(location_id);

-- Search indexes
CREATE INDEX idx_company_name_gin ON customer_companies USING gin(to_tsvector('english', name));
CREATE INDEX idx_location_name_gin ON customer_locations USING gin(to_tsvector('english', name));

-- Audit indexes
CREATE INDEX idx_audit_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp);
CREATE INDEX idx_audit_correlation ON audit_logs(correlation_id);
```

### 7.2 Memory Management

**Connection Pooling**:
- PostgreSQL: 10-20 connections per instance
- Redis: 20 connections maximum
- HTTP clients: 100 connection limit

**Memory Optimization**:
- Lazy loading for large result sets
- Pagination for all list operations
- Memory-efficient serialization
- Garbage collection tuning

## 8. Monitoring and Observability

### 8.1 Performance Metrics

**Service-Level Metrics**:
- Response time percentiles (P50, P90, P95, P99)
- Throughput (requests per second)
- Error rates by service and operation
- Cache hit rates and invalidation patterns

**Business Metrics**:
- Hierarchy operation success rates
- Migration completion times
- Bulk operation throughput
- User activity patterns

### 8.2 Health Checks

**Service Health**:
- Database connectivity and query performance
- Redis connectivity and operation latency
- External service availability
- Background job queue health

**Alerting Thresholds**:
- Response time > 1 second (WARNING)
- Error rate > 1% (WARNING)
- Error rate > 5% (CRITICAL)
- Cache hit rate < 80% (WARNING)

## 9. Security and Compliance

### 9.1 Access Control

**Authentication**:
- JWT token validation through middleware
- User context propagation across services
- Service-to-service authentication

**Authorization**:
- Role-based access control (RBAC)
- Resource-level permissions
- Hierarchy-aware permission inheritance

### 9.2 Data Protection

**Encryption**:
- Data at rest: PostgreSQL encryption
- Data in transit: TLS 1.3 for all connections
- Sensitive data masking in logs

**Audit Requirements**:
- Complete audit trail for all operations
- Immutable log storage
- 7-year retention for compliance
- GDPR-compliant data handling

## 10. Deployment and Scaling

### 10.1 Horizontal Scaling

**Service Scaling**:
- Stateless service design for horizontal scaling
- Load balancing across multiple instances
- Auto-scaling based on CPU and memory metrics
- Database read replicas for query workloads

**Resource Requirements**:
```
Production Instance:
├── CPU: 4 cores minimum, 8 cores recommended
├── Memory: 8GB minimum, 16GB recommended
├── Storage: 100GB minimum for logs and cache
└── Network: 1Gbps minimum bandwidth

Database:
├── CPU: 8 cores minimum
├── Memory: 32GB minimum
├── Storage: 1TB SSD minimum
└── IOPS: 3000 minimum
```

### 10.2 High Availability

**Failover Strategy**:
- Multi-zone deployment for 99.9% availability
- Database clustering with automatic failover
- Redis Sentinel for cache high availability
- Circuit breakers for graceful degradation

**Backup Strategy**:
- Continuous database replication
- Point-in-time recovery (PITR)
- Cross-region backup replication
- Regular disaster recovery testing

## 11. Development Guidelines

### 11.1 Service Design Principles

**SOLID Principles**:
- Single Responsibility: Each service has one clear purpose
- Open/Closed: Services are extensible without modification
- Liskov Substitution: Interface consistency across implementations
- Interface Segregation: Minimal, focused service interfaces
- Dependency Inversion: Services depend on abstractions

**Best Practices**:
- Async/await for all I/O operations
- Dependency injection for testability
- Comprehensive error handling with structured logging
- Circuit breaker pattern for external dependencies
- Idempotent operations where possible

### 11.2 Testing Strategy

**Test Pyramid**:
```
E2E Tests (5%): Full workflow testing
├── Integration Tests (25%): Service interaction testing
└── Unit Tests (70%): Individual service logic testing

Test Categories:
├── Unit Tests: Service method testing with mocks
├── Integration Tests: Database and cache integration
├── Contract Tests: External service API contracts
└── Performance Tests: Load and stress testing
```

## 12. Future Considerations

### 12.1 Scalability Enhancements

**Event-Driven Architecture**:
- Message queue integration (RabbitMQ/Apache Kafka)
- Event sourcing for audit trail
- CQRS for read/write optimization

**Microservice Evolution**:
- Service mesh for advanced networking
- GraphQL API gateway
- Distributed tracing with OpenTelemetry

### 12.2 Technology Upgrades

**Performance Improvements**:
- PostgreSQL partitioning for large datasets
- Read replicas for geographical distribution
- CDN integration for static content

**Monitoring Enhancements**:
- Machine learning for anomaly detection
- Predictive scaling based on usage patterns
- Advanced metrics visualization

---

This service layer architecture provides a robust, scalable foundation for the customer hierarchy system with enterprise-grade reliability, security, and performance characteristics.