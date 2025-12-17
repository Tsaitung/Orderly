# Customer Hierarchy Dashboard Redesign PRD

> **Version**: v1.0  
> **Date**: 2025-09-20  
> **Author**: Product Management Team  
> **Status**: Ready for Development  
> **Priority**: High

---

## 1. Executive Summary & Objectives

### 1.1 Business Goals

The Customer Hierarchy Dashboard redesign transforms the current simple card-based interface into a sophisticated business intelligence platform that provides restaurant supply chain managers with actionable insights and efficient navigation tools.

**Primary Business Goals:**

- **Improve Decision Making**: Provide activity metrics and engagement data for better customer relationship management
- **Increase Operational Efficiency**: Reduce navigation time by 60% through tabbed interface and smart filtering
- **Enhance Business Intelligence**: Transform raw hierarchy data into actionable business insights
- **Scale User Adoption**: Support growth from current 13 restaurant groups to 1,000+ organizations

### 1.2 Success Metrics

| Metric Category                 | Current State                    | Target (6 months)                    | Measurement Method         |
| ------------------------------- | -------------------------------- | ------------------------------------ | -------------------------- |
| **Navigation Efficiency**       | 5+ clicks to reach target entity | <3 clicks average                    | User interaction analytics |
| **Data Comprehension**          | Basic name/count display         | 90% users understand activity levels | User testing & surveys     |
| **Task Completion Time**        | 120s average to find entity      | <45s average                         | Time-to-task analytics     |
| **User Engagement**             | 40% daily active users           | 70% daily active users               | Platform analytics         |
| **Business Intelligence Usage** | 0% use metrics for decisions     | 60% use dashboard insights           | Feature usage tracking     |

### 1.3 Target Users

**Primary Users:**

- **Restaurant Chain Managers**: Need consolidated view of all locations and their activity levels
- **Supply Chain Coordinators**: Require quick access to location-specific information for order management
- **Business Development Representatives**: Need engagement metrics to identify growth opportunities

**Secondary Users:**

- **Platform Administrators**: Require comprehensive oversight tools for customer management
- **Finance Teams**: Need company-level views for billing and contract management
- **Customer Success Managers**: Use activity data to identify at-risk customers

---

## 2. Current System Analysis & Pain Points

### 2.1 Current State Assessment

**Existing Interface:**

- 13 restaurant groups displayed in 3-column grid layout
- All hierarchy levels (Group/Company/Location/Business Unit) mixed in same view
- Simple CustomerCard component showing: name, type badge, child count, active status indicator
- Basic breadcrumb navigation
- Search functionality across all levels
- Tree/Cards/Table view modes

**Technical Foundation:**

- React component with TypeScript
- 4-level hierarchy: Group → Company → Location → Business Unit
- FastAPI backend with SQLAlchemy models
- Real-time data via REST APIs
- Responsive design with TailwindCSS

### 2.2 Identified Pain Points

**Navigation Inefficiency:**

- All hierarchy levels mixed together causes confusion
- Users must drill-down through multiple levels to find specific entities
- No quick jump to specific hierarchy level
- Breadcrumb is the only navigation aid

**Lack of Business Intelligence:**

- No activity metrics or engagement indicators
- Cannot identify high-performing vs. dormant customers
- No trend analysis or business insights
- Missing context for decision-making

**Information Density Issues:**

- Simple card layout doesn't scale beyond current 13 entities
- No prioritization or sorting by business importance
- Limited space for essential business metrics
- Cannot distinguish between active and inactive relationships

**User Experience Gaps:**

- No overview dashboard for quick insights
- Cannot filter by business criteria (activity level, performance)
- No visual indicators for business health or engagement
- Missing quick actions for common workflows

---

## 3. User Stories

### 3.1 Restaurant Chain Manager Stories

**Story 1: Activity Overview Dashboard**

```
As a restaurant chain manager,
I want to see an overview dashboard with activity metrics across all my organizations,
So that I can quickly identify which locations need attention and which are performing well.

Acceptance Criteria:
- Dashboard shows total counts: Groups, Companies, Locations, Business Units
- Activity heatmap visualization showing engagement levels
- Top performers list (most active locations)
- At-risk customers list (low activity locations)
- 30-day and 90-day activity trends
- One-click drill-down to specific entities
```

**Story 2: Location-Specific Management**

```
As a restaurant chain manager,
I want to view all my locations in a dedicated tab with activity metrics,
So that I can efficiently manage deliveries and identify operational issues.

Acceptance Criteria:
- Locations tab shows all locations across companies
- Activity level indicators: Active (green), Low Activity (yellow), Dormant (red)
- Last order date and frequency metrics
- Delivery address and contact information
- Business units nested under each location
- Batch operations support (activate/deactivate multiple locations)
```

**Story 3: Financial Entity Management**

```
As a restaurant chain manager,
I want to view companies in a dedicated tab focused on billing and legal information,
So that I can manage contracts and financial relationships effectively.

Acceptance Criteria:
- Companies tab shows legal entities with tax information
- Billing activity metrics and payment status
- Contract renewal dates and terms
- Associated locations count and activity summary
- Quick access to billing history and invoices
- Compliance status indicators
```

### 3.2 Supply Chain Coordinator Stories

**Story 4: Quick Navigation and Search**

```
As a supply chain coordinator,
I want to quickly navigate between hierarchy levels and find specific entities,
So that I can respond to orders and deliveries efficiently.

Acceptance Criteria:
- Tabbed interface for instant level switching
- Global search with entity type filtering
- Recent entities quick access
- Favorites/bookmarks functionality
- Keyboard shortcuts for power users
- Mobile-optimized navigation
```

**Story 5: Activity-Based Prioritization**

```
As a supply chain coordinator,
I want to see customers prioritized by activity level and order frequency,
So that I can focus on high-value relationships and identify issues early.

Acceptance Criteria:
- Activity-based sorting (Most Active, Recently Active, Dormant)
- Order frequency metrics (daily, weekly, monthly patterns)
- Revenue impact indicators
- Last interaction timestamps
- Alert system for unusual activity patterns
- Export functionality for reporting
```

### 3.3 Business Development Representative Stories

**Story 6: Growth Opportunity Identification**

```
As a business development representative,
I want to identify growth opportunities and at-risk accounts using activity data,
So that I can proactively manage customer relationships and drive business growth.

Acceptance Criteria:
- Growth opportunity indicators (expanding locations, increasing order volume)
- At-risk account alerts (declining activity, payment issues)
- Comparative analysis between similar customers
- Expansion potential scoring
- Contact information and last interaction tracking
- Integration with CRM system
```

---

## 4. Functional Requirements

### 4.1 Overview Dashboard Requirements

#### 4.1.1 Key Metrics Display

**Summary Cards:**

```typescript
interface DashboardMetrics {
  totalGroups: number
  totalCompanies: number
  totalLocations: number
  totalBusinessUnits: number
  activeEntities: {
    groups: number
    companies: number
    locations: number
    businessUnits: number
  }
  activityMetrics: {
    highActivity: number // >10 orders in 30 days
    mediumActivity: number // 3-10 orders in 30 days
    lowActivity: number // 1-2 orders in 30 days
    dormant: number // 0 orders in 30 days
  }
}
```

**Visual Components:**

- Real-time counter animations for totals
- Progress bars showing active vs. total entities
- Color-coded activity distribution pie chart
- Trend indicators (↑↓) for 30-day changes

#### 4.1.2 Activity Heatmap Visualization

**Requirements:**

- Grid-based heatmap showing customer activity intensity
- Color gradient: Dark Green (High) → Light Green (Medium) → Yellow (Low) → Red (Dormant)
- Hover tooltips with entity details and metrics
- Click-through navigation to specific entities
- Time period selector: 7 days, 30 days, 90 days

**Data Structure:**

```typescript
interface ActivityHeatmapData {
  entityId: string
  entityName: string
  entityType: HierarchyNodeType
  activityScore: number // 0-100 scale
  orderCount: number
  lastOrderDate: Date | null
  coordinates: { x: number; y: number } // Grid position
}
```

#### 4.1.3 Top Performers Identification

**Criteria for Top Performers:**

- High order frequency (>10 orders/month)
- Consistent ordering patterns
- Growing order volume trends
- High-value orders (above average order value)

**Display Requirements:**

- Top 10 most active customers list
- Performance metrics: order frequency, total value, growth rate
- Quick action buttons: View Details, Contact, Create Order
- Refresh capability with real-time updates

### 4.2 Tabbed Interface Requirements

#### 4.2.1 Tab Structure and Navigation

**Tab Configuration:**

```typescript
interface TabConfiguration {
  id: string
  label: string
  icon: React.ComponentType
  entityType: HierarchyNodeType | 'overview'
  defaultSort: SortOption
  availableFilters: FilterOption[]
  columns: ColumnDefinition[]
}

const tabs: TabConfiguration[] = [
  {
    id: 'overview',
    label: '總覽 Overview',
    icon: BarChart3,
    entityType: 'overview',
    // ... configuration
  },
  {
    id: 'groups',
    label: '集團 Groups',
    icon: Building2,
    entityType: 'group',
    // ... configuration
  },
  {
    id: 'companies',
    label: '公司 Companies',
    icon: Building,
    entityType: 'company',
    // ... configuration
  },
  {
    id: 'locations',
    label: '地點 Locations',
    icon: MapPin,
    entityType: 'location',
    // ... configuration
  },
]
```

**Navigation Features:**

- Persistent tab state across page refreshes
- Keyboard shortcuts (Ctrl+1, Ctrl+2, etc.)
- Tab badges showing entity counts
- Right-click context menus for advanced options

#### 4.2.2 Groups Tab Specifications

**Enterprise-Level View Requirements:**

- Consolidated metrics across all companies in group
- Group hierarchy visualization with expandable tree
- Performance comparison between groups
- Group-level settings and configurations

**Data Display:**

```typescript
interface GroupDisplayData {
  groupInfo: CustomerGroup
  metrics: {
    totalCompanies: number
    totalLocations: number
    totalBusinessUnits: number
    totalOrders30d: number
    totalRevenue30d: number
    activityLevel: 'high' | 'medium' | 'low' | 'dormant'
  }
  topCompanies: CompanyPerformanceData[]
  trends: TrendData[]
}
```

#### 4.2.3 Companies Tab Specifications

**Legal Entity Focus Requirements:**

- Tax ID and legal name prominence
- Billing information and payment status
- Contract and compliance information
- Associated locations with activity summary

**Key Features:**

- Tax ID validation status indicators
- Payment history quick access
- Contract renewal alerts
- Compliance checklist status
- Bulk billing operations

#### 4.2.4 Locations Tab Specifications

**Operational Units View Requirements:**

- Delivery address and contact information
- Operating hours and delivery windows
- Geographic clustering and mapping
- Business units nested under each location (not separate tab)

**Enhanced Features:**

- Map view toggle for geographic visualization
- Delivery route optimization suggestions
- Operating hours conflict detection
- Business unit quick actions (add, edit, activate/deactivate)

### 4.3 Activity Tracking Requirements

#### 4.3.1 Activity Calculation Logic

**Activity Score Formula:**

```typescript
interface ActivityCalculation {
  orderFrequency: number // Orders per 30 days
  orderValue: number // Average order value
  lastOrderDate: Date // Recency factor
  consistency: number // Regularity score (0-1)
  growth: number // 30d vs 90d comparison

  // Final score: weighted sum (0-100)
  activityScore: number
}

function calculateActivityScore(metrics: OrderMetrics): number {
  const weights = {
    frequency: 0.4, // 40% weight on order frequency
    value: 0.2, // 20% weight on order value
    recency: 0.25, // 25% weight on how recent last order was
    consistency: 0.1, // 10% weight on ordering pattern regularity
    growth: 0.05, // 5% weight on growth trend
  }

  return Math.min(
    100,
    metrics.frequency * weights.frequency +
      metrics.value * weights.value +
      metrics.recency * weights.recency +
      metrics.consistency * weights.consistency +
      metrics.growth * weights.growth
  )
}
```

#### 4.3.2 Activity Level Classification

**Level Definitions:**

- **Active (Green)**: Activity score 70-100, orders in last 7 days
- **Medium Activity (Blue)**: Activity score 40-69, orders in last 30 days
- **Low Activity (Yellow)**: Activity score 20-39, orders in last 90 days
- **Dormant (Red)**: Activity score 0-19, no orders in 90+ days

#### 4.3.3 Time-Based Metrics

**Required Time Periods:**

- Real-time: Current day activity
- Short-term: 7-day rolling window
- Medium-term: 30-day rolling window
- Long-term: 90-day rolling window
- Comparative: Year-over-year analysis

**Metric Types:**

- Order count and frequency
- Revenue and average order value
- Customer engagement events
- Support interactions
- Payment and billing activities

### 4.4 Quick Navigation Requirements

#### 4.4.1 Smart Search Enhancement

**Search Capabilities:**

```typescript
interface SearchConfiguration {
  globalSearch: boolean // Search across all hierarchy levels
  entityTypeFilters: boolean // Filter by Group/Company/Location/Unit
  activityFilters: boolean // Filter by activity level
  quickFilters: QuickFilter[] // Predefined filter combinations
  recentSearches: boolean // Search history
  searchSuggestions: boolean // Auto-complete and suggestions
}

interface SearchResult {
  entity: HierarchyNode
  matchType: 'name' | 'code' | 'address' | 'contact'
  matchStrength: number // 0-1 confidence score
  breadcrumb: string[] // Path to entity
  activityLevel: ActivityLevel
  lastActivity: Date | null
}
```

#### 4.4.2 Drill-Down Navigation

**Navigation Patterns:**

- One-click drill-down from overview cards
- Breadcrumb navigation with activity indicators
- Back/forward browser history support
- Deep-linking to specific entities
- Contextual navigation suggestions

#### 4.4.3 Bulk Operations Support

**Supported Operations:**

- Activate/deactivate multiple entities
- Bulk edit entity properties
- Mass migration operations
- Batch export/import functionality
- Bulk notification sending

---

## 5. Data Requirements

### 5.1 Required API Endpoints

#### 5.1.1 Dashboard Analytics APIs

```typescript
// Overview dashboard metrics
GET /api/v2/customer-hierarchy/analytics/overview
Response: DashboardMetrics

// Activity heatmap data
GET /api/v2/customer-hierarchy/analytics/activity-heatmap
Query: timeRange=30d&entityType=all
Response: ActivityHeatmapData[]

// Top performers list
GET /api/v2/customer-hierarchy/analytics/top-performers
Query: limit=10&period=30d&metric=orderFrequency
Response: TopPerformerData[]

// Activity trends
GET /api/v2/customer-hierarchy/analytics/trends
Query: entityId&timeRange=90d&granularity=daily
Response: TrendData[]
```

#### 5.1.2 Enhanced Entity APIs

```typescript
// Enhanced hierarchy tree with activity metrics
GET /api/v2/customer-hierarchy/tree/enhanced
Query: includeMetrics=true&timeRange=30d
Response: EnhancedHierarchyNode[]

// Activity-enhanced entity list by type
GET /api/v2/customer-hierarchy/{entityType}/enhanced
Query: includeActivity=true&sortBy=activityScore&order=desc
Response: EnhancedEntityList

// Entity activity history
GET /api/v2/customer-hierarchy/{entityType}/{id}/activity-history
Query: timeRange=90d&includeOrders=true
Response: ActivityHistory
```

#### 5.1.3 Search and Filter APIs

```typescript
// Enhanced search with activity filtering
POST /api/v2/customer-hierarchy/search/enhanced
Body: SearchRequest {
  query: string;
  entityTypes: HierarchyNodeType[];
  activityLevels: ActivityLevel[];
  timeRange: string;
  sortBy: SortOption;
}
Response: SearchResult[]

// Quick filters
GET /api/v2/customer-hierarchy/filters/quick
Response: QuickFilterDefinition[]
```

### 5.2 Data Structure Enhancements

#### 5.2.1 Enhanced Hierarchy Node

```typescript
interface EnhancedHierarchyNode extends HierarchyNode {
  activityMetrics: {
    score: number // 0-100 activity score
    level: ActivityLevel // Calculated level
    lastOrderDate: Date | null
    orderCount30d: number
    orderCount90d: number
    averageOrderValue: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }
  businessMetrics: {
    totalRevenue30d: number
    totalRevenue90d: number
    paymentStatus: 'current' | 'overdue' | 'suspended'
    contractStatus: 'active' | 'expiring' | 'expired'
  }
  contactMetrics: {
    lastContactDate: Date | null
    contactMethod: 'order' | 'support' | 'billing' | 'sales'
    responseRate: number // 0-1 scale
  }
}
```

#### 5.2.2 Dashboard Metrics Schema

```typescript
interface DashboardMetrics {
  summary: {
    totalGroups: number
    totalCompanies: number
    totalLocations: number
    totalBusinessUnits: number
    activeToday: number
    newThisMonth: number
  }
  activityDistribution: {
    active: number
    medium: number
    low: number
    dormant: number
  }
  trends: {
    ordersGrowth30d: number // Percentage change
    revenueGrowth30d: number
    newCustomers30d: number
    churnRate30d: number
  }
  alerts: {
    paymentOverdue: number
    contractsExpiring: number
    inactiveCustomers: number
    systemIssues: number
  }
}
```

### 5.3 Performance Requirements

#### 5.3.1 Data Loading Specifications

| Operation          | Target Response Time | Cache Strategy              | Update Frequency |
| ------------------ | -------------------- | --------------------------- | ---------------- |
| Overview Dashboard | <200ms               | Redis cache, 5min TTL       | Every 5 minutes  |
| Tab Data Loading   | <300ms               | Redis cache, 15min TTL      | Every 15 minutes |
| Activity Metrics   | <500ms               | Database query optimization | Real-time        |
| Search Results     | <400ms               | Elasticsearch index         | Near real-time   |
| Heatmap Data       | <600ms               | Pre-calculated aggregates   | Every hour       |

#### 5.3.2 Scalability Targets

- Support 10,000+ customer entities with sub-second response times
- Handle 1,000 concurrent dashboard users
- Process activity calculations for 100,000+ business units
- Maintain performance with 1M+ orders in analytics window

---

## 6. UX/UI Requirements

### 6.1 Design System Compliance

#### 6.1.1 Orderly Brand Integration

**Color Palette:**

- Primary: Mocha Mousse (#A47864) for headers and primary actions
- Activity Colors:
  - Active: #10B981 (Emerald 500)
  - Medium: #3B82F6 (Blue 500)
  - Low: #F59E0B (Amber 500)
  - Dormant: #EF4444 (Red 500)
- Background: #F8FAFC (Slate 50)
- Cards: #FFFFFF with 4px border radius

**Typography:**

- Headers: Noto Sans TC (Chinese) / Inter (English), Semi-bold
- Body: Noto Sans TC / Inter, Regular
- Metrics: Inter, Medium (for number emphasis)

#### 6.1.2 Component Standards

**Tab Component:**

```tsx
interface TabComponentProps {
  tabs: TabConfiguration[]
  activeTab: string
  onTabChange: (tabId: string) => void
  entityCounts: Record<string, number>
  className?: string
}

// Visual specifications:
// - Height: 48px
// - Active tab: Mocha Mousse background, white text
// - Inactive tab: transparent background, gray text
// - Badge: circular, positioned top-right of tab label
// - Border: 2px bottom border for active tab
```

**Activity Indicator Component:**

```tsx
interface ActivityIndicatorProps {
  level: ActivityLevel
  score?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  tooltip?: boolean
}

// Visual specifications:
// - Circle indicator: 8px (sm), 12px (md), 16px (lg)
// - Colors match activity level definitions
// - Optional text label next to indicator
// - Tooltip shows score and last activity
```

### 6.2 Responsive Design Requirements

#### 6.2.1 Desktop Layout (1024px+)

- Full tabbed interface with all features visible
- Multi-column grid layouts for cards (3-4 columns)
- Side-by-side overview dashboard and quick actions
- Expanded search with all filter options
- Hover states and tooltips fully functional

#### 6.2.2 Tablet Layout (768px-1023px)

- Stacked tab interface with horizontal scrolling if needed
- 2-column card grids
- Collapsible sidebar for filters
- Touch-optimized button sizes (44px minimum)
- Swipe gestures for tab navigation

#### 6.2.3 Mobile Layout (320px-767px)

- Full-width tabs with vertical scrolling
- Single-column card layout
- Drawer-based navigation for filters
- Simplified overview dashboard with key metrics only
- Bottom sheet for detailed entity views

### 6.3 Accessibility Standards

#### 6.3.1 WCAG 2.1 AA Compliance

**Color and Contrast:**

- Minimum 4.5:1 contrast ratio for all text
- Activity colors designed for colorblind accessibility
- Pattern/texture alternatives to color-only indicators
- High contrast mode support

**Keyboard Navigation:**

- Tab order follows logical flow
- Arrow keys for tab navigation
- Enter/Space for activation
- Escape key for modal/drawer dismissal
- Skip links for main content areas

**Screen Reader Support:**

- Proper ARIA labels for all interactive elements
- Role attributes for custom components
- Live regions for dynamic content updates
- Meaningful alt text for visual indicators

#### 6.3.2 Interaction Design

**Touch Targets:**

- Minimum 44x44px for all interactive elements
- Adequate spacing between touch targets (8px minimum)
- Visual feedback for touch interactions
- Gesture support for swipe navigation

**Visual Feedback:**

- Loading states for all async operations
- Error states with clear messaging
- Success confirmations for actions
- Progress indicators for multi-step operations

---

## 7. Technical Specifications

### 7.1 Frontend Component Architecture

#### 7.1.1 Component Hierarchy

```tsx
CustomerHierarchyDashboard/
├── DashboardHeader
├── TabNavigation
├── TabContent/
│   ├── OverviewTab/
│   │   ├── MetricsSummary
│   │   ├── ActivityHeatmap
│   │   ├── TopPerformers
│   │   └── TrendCharts
│   ├── GroupsTab/
│   │   ├── GroupCard
│   │   ├── GroupMetrics
│   │   └── GroupActions
│   ├── CompaniesTab/
│   │   ├── CompanyCard
│   │   ├── BillingInfo
│   │   └── ComplianceStatus
│   └── LocationsTab/
│       ├── LocationCard
│       ├── BusinessUnitsList
│       ├── MapView
│       └── DeliveryInfo
├── SearchAndFilters/
│   ├── GlobalSearch
│   ├── QuickFilters
│   └── AdvancedFilters
└── CommonComponents/
    ├── ActivityIndicator
    ├── EntityCard
    ├── MetricDisplay
    └── ActionMenu
```

#### 7.1.2 State Management

```typescript
interface DashboardState {
  // UI State
  activeTab: string
  viewMode: 'cards' | 'table' | 'map'
  searchQuery: string
  activeFilters: FilterState

  // Data State
  dashboardMetrics: DashboardMetrics | null
  enhancedEntities: Record<string, EnhancedHierarchyNode[]>
  activityData: ActivityHeatmapData[]
  topPerformers: TopPerformerData[]

  // Loading & Error States
  loading: {
    metrics: boolean
    entities: boolean
    search: boolean
  }
  errors: {
    metrics: string | null
    entities: string | null
    search: string | null
  }
}

// Context provider for dashboard state
interface DashboardContextValue {
  state: DashboardState
  actions: {
    setActiveTab: (tab: string) => void
    updateFilters: (filters: FilterState) => void
    refreshData: () => void
    searchEntities: (query: string) => void
  }
}
```

### 7.2 Backend API Enhancements

#### 7.2.1 Activity Calculation Service

```python
class ActivityCalculationService:
    def __init__(self, db: Session):
        self.db = db

    async def calculate_entity_activity(
        self,
        entity_id: str,
        time_range: str = "30d"
    ) -> ActivityMetrics:
        """Calculate comprehensive activity metrics for an entity"""

        orders = await self.get_orders_for_entity(entity_id, time_range)

        # Calculate frequency score (0-40 points)
        frequency_score = min(40, len(orders) * 4)

        # Calculate value score (0-20 points)
        avg_value = sum(order.total_amount for order in orders) / len(orders) if orders else 0
        value_score = min(20, avg_value / 1000 * 20)

        # Calculate recency score (0-25 points)
        last_order = max(orders, key=lambda x: x.created_at) if orders else None
        days_since_last = (datetime.now() - last_order.created_at).days if last_order else 999
        recency_score = max(0, 25 - days_since_last)

        # Calculate consistency score (0-10 points)
        consistency_score = self.calculate_consistency(orders)

        # Calculate growth score (0-5 points)
        growth_score = await self.calculate_growth_trend(entity_id)

        total_score = frequency_score + value_score + recency_score + consistency_score + growth_score

        return ActivityMetrics(
            score=min(100, total_score),
            level=self.score_to_level(total_score),
            order_count=len(orders),
            last_order_date=last_order.created_at if last_order else None,
            average_order_value=avg_value,
            trend=await self.calculate_trend(entity_id)
        )
```

#### 7.2.2 Caching Strategy

```python
class DashboardCacheService:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    async def get_dashboard_metrics(self) -> DashboardMetrics:
        """Get cached dashboard metrics with fallback to calculation"""

        cache_key = "dashboard:metrics:overview"
        cached_data = await self.redis.get(cache_key)

        if cached_data:
            return DashboardMetrics.parse_raw(cached_data)

        # Calculate fresh metrics
        metrics = await self.calculate_dashboard_metrics()

        # Cache for 5 minutes
        await self.redis.setex(
            cache_key,
            300,
            metrics.json()
        )

        return metrics

    async def invalidate_entity_cache(self, entity_id: str):
        """Invalidate cache when entity data changes"""
        patterns = [
            f"entity:{entity_id}:*",
            "dashboard:metrics:*",
            "hierarchy:tree:*"
        ]

        for pattern in patterns:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
```

### 7.3 Performance Optimization

#### 7.3.1 Database Query Optimization

```sql
-- Optimized query for activity calculations
WITH entity_orders AS (
    SELECT
        bu.id as business_unit_id,
        bu.location_id,
        l.company_id,
        c.group_id,
        COUNT(o.id) as order_count_30d,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date,
        SUM(o.total_amount) as total_revenue_30d
    FROM business_units bu
    LEFT JOIN customer_locations l ON bu.location_id = l.id
    LEFT JOIN customer_companies c ON l.company_id = c.id
    LEFT JOIN orders o ON bu.id = o.business_unit_id
        AND o.created_at >= NOW() - INTERVAL '30 days'
    WHERE bu.is_active = true
    GROUP BY bu.id, bu.location_id, l.company_id, c.group_id
)
SELECT
    entity_id,
    entity_type,
    entity_name,
    order_count_30d,
    avg_order_value,
    last_order_date,
    total_revenue_30d,
    CASE
        WHEN order_count_30d >= 10 THEN 'active'
        WHEN order_count_30d >= 3 THEN 'medium'
        WHEN order_count_30d >= 1 THEN 'low'
        ELSE 'dormant'
    END as activity_level
FROM entity_orders;

-- Indexes for performance
CREATE INDEX CONCURRENTLY idx_orders_business_unit_created_at
ON orders (business_unit_id, created_at)
WHERE created_at >= NOW() - INTERVAL '90 days';

CREATE INDEX CONCURRENTLY idx_entities_activity_composite
ON business_units (is_active, location_id)
INCLUDE (id, name, code);
```

#### 7.3.2 Frontend Performance Optimization

```typescript
// Virtual scrolling for large entity lists
const VirtualizedEntityList: React.FC<EntityListProps> = ({ entities }) => {
  const rowVirtualizer = useVirtualizer({
    count: entities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated card height
    overscan: 5
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: rowVirtualizer.getTotalSize() }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <EntityCard entity={entities[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Memoized components for performance
const MemoizedActivityIndicator = React.memo(ActivityIndicator);
const MemoizedEntityCard = React.memo(EntityCard);
const MemoizedMetricDisplay = React.memo(MetricDisplay);
```

---

## 8. Implementation Roadmap

### 8.1 Development Phases

#### Phase 1: Foundation & Overview Dashboard (Weeks 1-2)

**Backend Development:**

- Implement activity calculation service
- Create dashboard metrics APIs
- Set up caching infrastructure
- Database query optimization

**Frontend Development:**

- Create tabbed interface structure
- Implement overview dashboard layout
- Build activity indicator components
- Set up state management

**Deliverables:**

- Working overview dashboard with basic metrics
- Tab navigation structure
- Activity calculation backend service

#### Phase 2: Enhanced Entity Views (Weeks 3-4)

**Backend Development:**

- Enhance existing APIs with activity data
- Implement activity heatmap data generation
- Create top performers calculation
- Add search enhancement APIs

**Frontend Development:**

- Build Groups tab with enhanced metrics
- Implement Companies tab with billing focus
- Create Locations tab with nested business units
- Add activity-based sorting and filtering

**Deliverables:**

- Complete tabbed interface with all entity types
- Enhanced entity cards with activity metrics
- Working search and filter functionality

#### Phase 3: Advanced Features & Optimization (Weeks 5-6)

**Backend Development:**

- Implement trend calculation algorithms
- Add bulk operation APIs
- Performance optimization and caching
- API documentation and testing

**Frontend Development:**

- Add activity heatmap visualization
- Implement bulk operations UI
- Create mobile responsive layouts
- Add accessibility features

**Deliverables:**

- Fully functional dashboard with all features
- Mobile-optimized interface
- Performance-optimized backend

#### Phase 4: Testing & Polish (Weeks 7-8)

**Quality Assurance:**

- Comprehensive testing across all features
- Performance testing with large datasets
- Accessibility audit and fixes
- User acceptance testing

**Deployment Preparation:**

- Production environment setup
- Monitoring and alerting configuration
- Documentation completion
- Training material preparation

**Deliverables:**

- Production-ready dashboard
- Complete documentation
- Training materials for users

### 8.2 Risk Mitigation

#### Technical Risks

**Risk**: Performance degradation with large datasets

- **Mitigation**: Implement virtual scrolling, pagination, and aggressive caching
- **Contingency**: Fallback to simplified views for large datasets

**Risk**: Activity calculation complexity affecting response times

- **Mitigation**: Pre-calculate metrics via background jobs, cache aggressively
- **Contingency**: Simplified activity scoring algorithm

#### Business Risks

**Risk**: User confusion with new interface

- **Mitigation**: Gradual rollout, comprehensive training, feedback collection
- **Contingency**: Feature flags to revert to simplified interface

**Risk**: Data accuracy concerns in activity metrics

- **Mitigation**: Extensive testing, validation dashboards, audit trails
- **Contingency**: Manual override capabilities for critical metrics

---

## 9. Success Measurement & KPIs

### 9.1 User Adoption Metrics

#### Immediate Success Indicators (First 30 Days)

| Metric                  | Target                          | Measurement Method                      |
| ----------------------- | ------------------------------- | --------------------------------------- |
| Daily Active Users      | 80% of previous dashboard users | Google Analytics, user session tracking |
| Feature Adoption Rate   | 60% use tabbed interface        | Feature usage analytics                 |
| Task Completion Rate    | 85% successful task completion  | User interaction tracking               |
| User Satisfaction Score | >4.0/5.0                        | In-app surveys, NPS scores              |

#### Long-term Success Indicators (90 Days)

| Metric                 | Target                              | Measurement Method           |
| ---------------------- | ----------------------------------- | ---------------------------- |
| User Retention         | 90% monthly retention               | User session analytics       |
| Feature Utilization    | 70% use activity-based features     | Feature usage tracking       |
| Efficiency Improvement | 40% reduction in navigation time    | User journey analytics       |
| Business Impact        | 15% increase in customer engagement | Business metrics correlation |

### 9.2 Technical Performance KPIs

#### Response Time Targets

| Component               | Target            | Maximum Acceptable |
| ----------------------- | ----------------- | ------------------ |
| Overview Dashboard Load | <200ms            | 500ms              |
| Tab Switch              | <100ms            | 300ms              |
| Search Results          | <300ms            | 800ms              |
| Activity Calculations   | <500ms            | 1500ms             |
| Bulk Operations         | <2s per 100 items | 5s per 100 items   |

#### System Health Metrics

| Metric                     | Target    | Alert Threshold |
| -------------------------- | --------- | --------------- |
| API Uptime                 | 99.9%     | <99.5%          |
| Error Rate                 | <0.1%     | >0.5%           |
| Cache Hit Rate             | >90%      | <80%            |
| Database Query Performance | <50ms p95 | >100ms p95      |

### 9.3 Business Impact Measurement

#### Customer Relationship Management

- **Customer Engagement Score**: Increase in proactive customer outreach based on dashboard insights
- **At-Risk Customer Identification**: Percentage of dormant customers identified and re-engaged
- **Revenue Recovery**: Amount of revenue recovered from at-risk customers identified through dashboard

#### Operational Efficiency

- **Support Ticket Reduction**: Decrease in navigation-related support requests
- **Decision Speed**: Time reduction from data access to business decision
- **User Productivity**: Overall time savings in customer management tasks

---

## 10. Appendices

### Appendix A: Wireframes and Mockups

#### A.1 Overview Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Customer Hierarchy Dashboard                    [Refresh] │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Groups] [Companies] [Locations]                │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ Groups  │ │Companies│ │Locations│ │Business │            │
│ │   25    │ │   156   │ │   423   │ │ Units   │            │
│ │    ●    │ │    ●    │ │    ●    │ │  1,247  │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├─────────────────────────────────────────────────────────────┤
│ Activity Distribution    │ Top Performers                   │
│ ┌───────────────────────┐│ ┌─────────────────────────────┐  │
│ │     Heatmap           ││ │ 1. 王品集團 (143 orders)    │  │
│ │   [Color Grid View]   ││ │ 2. 鼎泰豐 (98 orders)       │  │
│ │                       ││ │ 3. 晶華酒店 (87 orders)     │  │
│ └───────────────────────┘│ └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### A.2 Locations Tab with Business Units

```
┌─────────────────────────────────────────────────────────────┐
│ Locations (423)                              [+ Add] [⚙️]   │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Search locations... [🔽Activity] [🔽City] [🔽Status]     │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📍 王品牛排台北信義店                              ● │ │
│ │ 台北市信義區松仁路100號                                │ │
│ │ 聯絡人: 李店長 (02-2722-0000)                          │ │
│ │ 活動度: ●●●●○ (87/100) | 最後訂單: 2天前              │ │
│ │                                                         │ │
│ │ Business Units:                                         │ │
│ │ ├─ 🍽️  主廚房     [●Active]   [Edit] [Orders]          │ │
│ │ ├─ 🍷  酒吧部     [●Active]   [Edit] [Orders]          │ │
│ │ └─ 🥗  沙拉台     [○Inactive] [Edit] [Orders]          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Appendix B: Activity Calculation Examples

#### B.1 Sample Activity Score Calculation

```typescript
// Example: High-performing restaurant location
const locationMetrics = {
  orderCount30d: 25, // 25 orders in 30 days
  averageOrderValue: 15000, // NT$15,000 average
  lastOrderDate: new Date('2025-09-19'), // 1 day ago
  orderRegularity: 0.8, // Consistent ordering pattern
  growthRate: 0.15, // 15% growth compared to previous period
}

const activityScore = calculateActivityScore(locationMetrics)
// Result: 88/100 (Active level)
```

#### B.2 Activity Level Examples

```typescript
const examples = [
  {
    name: '王品牛排信義店',
    score: 92,
    level: 'active',
    indicators: ['Daily orders', 'High value', 'Consistent pattern'],
  },
  {
    name: '小餐廳分店',
    score: 45,
    level: 'medium',
    indicators: ['Weekly orders', 'Moderate value', 'Irregular pattern'],
  },
  {
    name: '季節性餐廳',
    score: 23,
    level: 'low',
    indicators: ['Monthly orders', 'Low value', 'Seasonal pattern'],
  },
  {
    name: '暫停營業店',
    score: 5,
    level: 'dormant',
    indicators: ['No recent orders', 'No contact', 'Inactive status'],
  },
]
```

### Appendix C: API Response Examples

#### C.1 Dashboard Metrics Response

```json
{
  "summary": {
    "totalGroups": 25,
    "totalCompanies": 156,
    "totalLocations": 423,
    "totalBusinessUnits": 1247,
    "activeToday": 89,
    "newThisMonth": 12
  },
  "activityDistribution": {
    "active": 234,
    "medium": 156,
    "low": 87,
    "dormant": 45
  },
  "trends": {
    "ordersGrowth30d": 12.5,
    "revenueGrowth30d": 18.2,
    "newCustomers30d": 8,
    "churnRate30d": 2.1
  },
  "alerts": {
    "paymentOverdue": 3,
    "contractsExpiring": 7,
    "inactiveCustomers": 12,
    "systemIssues": 0
  }
}
```

#### C.2 Enhanced Entity Response

```json
{
  "id": "loc_123",
  "name": "王品牛排信義店",
  "type": "location",
  "address": {
    "street": "松仁路100號",
    "city": "台北市",
    "district": "信義區"
  },
  "activityMetrics": {
    "score": 87,
    "level": "active",
    "lastOrderDate": "2025-09-19T10:30:00Z",
    "orderCount30d": 25,
    "orderCount90d": 78,
    "averageOrderValue": 15000,
    "trend": "increasing"
  },
  "businessMetrics": {
    "totalRevenue30d": 375000,
    "totalRevenue90d": 1125000,
    "paymentStatus": "current",
    "contractStatus": "active"
  },
  "businessUnits": [
    {
      "id": "bu_456",
      "name": "主廚房",
      "code": "KITCHEN",
      "type": "kitchen",
      "isActive": true,
      "activityMetrics": {
        "score": 95,
        "level": "active",
        "orderCount30d": 20
      }
    }
  ]
}
```

---

**END OF DOCUMENT**

This PRD provides comprehensive specifications for transforming the current Customer Hierarchy Management interface into a sophisticated dashboard with activity tracking, business intelligence, and improved user experience. The document serves as a complete guide for development teams to implement the redesigned system while maintaining alignment with business objectives and user needs.
