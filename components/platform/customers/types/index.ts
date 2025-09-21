// ============================================================================
// Customer Hierarchy V2 - Clean Type Definitions
// ============================================================================
// Simplified types without complex state management patterns

export type UUID = string;

export type HierarchyNodeType = 'group' | 'company' | 'location' | 'business_unit';

// Base hierarchy node - simplified
export interface HierarchyNode {
  id: UUID;
  name: string;
  type: HierarchyNodeType;
  parentId?: UUID;
  isActive: boolean;
  children: HierarchyNode[];
  childrenCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Specialized types
export interface CustomerGroup extends HierarchyNode {
  type: 'group';
  code?: string;
  description?: string;
}

export interface CustomerCompany extends HierarchyNode {
  type: 'company';
  taxId?: string;
  taxIdType?: string;
  businessType?: string;
}

export interface CustomerLocation extends HierarchyNode {
  type: 'location';
  address?: string;
  coordinates?: { lat: number; lng: number };
  code?: string;
}

export interface BusinessUnit extends HierarchyNode {
  type: 'business_unit';
  unitType?: string;
  budgetMonthly?: number;
  code?: string;
}

// Search types
export interface SearchResult {
  entity: HierarchyNode;
  score: number;
  matchType: 'name' | 'code' | 'description';
  breadcrumb: string[];
}

// Simple loading states
export interface LoadingState {
  tree: boolean;
  search: boolean;
  nodeDetails: boolean;
  operations: boolean;
}

// Simple error states  
export interface ErrorState {
  tree: string | null;
  search: string | null;
  nodeDetails: string | null;
  operations: string | null;
}

// Main state interface - greatly simplified
export interface CustomerHierarchyState {
  // Core data
  tree: HierarchyNode[];
  selectedNodeId: UUID | null;
  expandedNodeIds: UUID[];
  
  // Search
  searchQuery: string;
  searchResults: SearchResult[];
  
  // UI state
  viewMode: 'tree' | 'cards' | 'table';
  showFilters: boolean;
  
  // Status
  loading: LoadingState;
  errors: ErrorState;
  
  // Simple metadata
  lastUpdated: Date | null;
}

// Action types for reducer
export type CustomerHierarchyAction =
  | { type: 'LOAD_TREE_START' }
  | { type: 'LOAD_TREE_SUCCESS'; payload: HierarchyNode[] }
  | { type: 'LOAD_TREE_ERROR'; payload: string }
  | { type: 'SELECT_NODE'; payload: UUID | null }
  | { type: 'TOGGLE_NODE'; payload: UUID }
  | { type: 'EXPAND_NODE'; payload: UUID }
  | { type: 'COLLAPSE_NODE'; payload: UUID }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_SUCCESS'; payload: SearchResult[] }
  | { type: 'SEARCH_ERROR'; payload: string }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'SET_VIEW_MODE'; payload: 'tree' | 'cards' | 'table' }
  | { type: 'SET_SHOW_FILTERS'; payload: boolean }
  | { type: 'CLEAR_ERROR'; payload: keyof ErrorState }
  | { type: 'RESET_STATE' };

// API response types
export interface TreeResponse {
  data: HierarchyNode[];
  totalCount: number;
  lastModified: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  queryTime: number;
}

// Context value type
export interface CustomerHierarchyContextValue {
  state: CustomerHierarchyState;
  actions: {
    loadTree: () => Promise<void>;
    selectNode: (nodeId: UUID | null) => void;
    toggleNode: (nodeId: UUID) => void;
    expandNode: (nodeId: UUID) => void;
    collapseNode: (nodeId: UUID) => void;
    search: (query: string) => Promise<void>;
    clearSearch: () => void;
    setViewMode: (mode: 'tree' | 'cards' | 'table') => void;
    setShowFilters: (show: boolean) => void;
    clearError: (errorType: keyof ErrorState) => void;
    resetState: () => void;
  };
}

// ============================================================================
// Dashboard Types for Enhanced UI
// ============================================================================

export type DashboardTab = 'overview' | 'groups' | 'companies' | 'locations' | 'analytics';

export interface ActivityMetrics {
  score: number; // 0-100 scale
  level: 'active' | 'medium' | 'low' | 'dormant';
  lastOrderDate?: Date;
  orderFrequency: number; // orders per month
  monthlyRevenue: number;
  trend: 'up' | 'down' | 'stable'; // compared to previous period
  trendScore: number; // percentage change
}

export interface CustomerMetrics {
  totalOrders: number;
  monthlyRevenue: number;
  avgOrderValue: number;
  lastOrderDate?: Date;
  creditUtilization?: number;
  deliverySuccessRate?: number;
  avgDeliveryTime?: number; // in hours
  orderFrequency: number;
  budgetUtilization?: number;
}

export interface DashboardStatistics {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  groupsCount: number;
  companiesCount: number;
  locationsCount: number;
  businessUnitsCount: number;
  totalMonthlyRevenue: number;
  revenueGrowth: number; // percentage
  avgActivityScore: number;
  topPerformers: CustomerPerformer[];
}

export interface CustomerPerformer {
  id: UUID;
  name: string;
  type: HierarchyNodeType;
  monthlyRevenue: number;
  orderCount: number;
  activityScore: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ActivityHeatmapData {
  date: string; // YYYY-MM-DD
  value: number; // 0-100 activity score
  orders: number;
  revenue: number;
}

export interface FilterOptions {
  types: HierarchyNodeType[];
  activityLevels: ActivityMetrics['level'][];
  minRevenue?: number;
  maxRevenue?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeInactive: boolean;
}

export interface SortOptions {
  field: 'name' | 'revenue' | 'orders' | 'activity' | 'lastOrder' | 'createdAt';
  direction: 'asc' | 'desc';
}

export interface DashboardState {
  activeTab: DashboardTab;
  selectedCustomers: Set<UUID>;
  filters: FilterOptions;
  sortOptions: SortOptions;
  bulkActionMode: boolean;
  dashboardData: DashboardStatistics | null;
  activityData: Record<UUID, ActivityMetrics>;
  metricsData: Record<UUID, CustomerMetrics>;
  heatmapData: ActivityHeatmapData[];
  isLoadingDashboard: boolean;
  isLoadingActivity: boolean;
  dashboardError: string | null;
}

// Enhanced hierarchy node with activity data
export interface EnhancedHierarchyNode extends HierarchyNode {
  activity?: ActivityMetrics;
  metrics?: CustomerMetrics;
  heatmapData?: ActivityHeatmapData[];
  tags?: string[];
  notes?: string;
}

// Tab-specific view configurations
export interface TabViewConfig {
  displayMode: 'cards' | 'table' | 'grid';
  itemsPerPage: number;
  showMetrics: boolean;
  showActivity: boolean;
  groupBy?: string;
  columns?: string[];
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeMetrics: boolean;
  includeActivity: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  selectedOnly: boolean;
}