// ============================================================================
// Customer Hierarchy Types - 4-Level System
// ============================================================================
// 井然 Orderly Platform - Customer Hierarchy Management System
// 4-層客戶層級系統：集團 → 公司 → 地點 → 業務單位

export type UUID = string;

// ============================================================================
// 基礎共用型別 (Common Types)
// ============================================================================

export interface Address {
  street: string;
  district?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface Contact {
  name: string;
  phone: string;
  email?: string;
  title?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DayHours {
  open: string; // "09:00"
  close: string; // "22:00"
  breaks?: Array<{start: string; end: string}>;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
  holidays?: DayHours;
}

export interface OrderingPermissions {
  maxOrderValue?: number;
  requiresApproval?: boolean;
  approvers?: string[];
  allowedSuppliers?: string[];
  blockedCategories?: string[];
}

// ============================================================================
// 層級節點型別 (Hierarchy Node Types)
// ============================================================================

export enum HierarchyNodeType {
  GROUP = "group",
  COMPANY = "company", 
  LOCATION = "location",
  BUSINESS_UNIT = "business_unit"
}

export enum TaxIdType {
  COMPANY = "company",     // 公司統一編號 (8位數字)
  INDIVIDUAL = "individual", // 個人身分證號 (1字母+9數字)
  FOREIGN = "foreign"      // 外國實體
}

export enum BusinessUnitType {
  KITCHEN = "kitchen",           // 廚房
  BAR = "bar",                  // 酒吧
  BAKERY = "bakery",            // 烘焙部
  CENTRAL_KITCHEN = "central_kitchen", // 中央廚房
  STORAGE = "storage",          // 倉庫
  OFFICE = "office",            // 辦公室
  OTHER = "other"               // 其他
}

// ============================================================================
// Level 1: Group (集團) - Virtual umbrella entity
// ============================================================================

export interface CustomerGroupBase {
  name: string;
  code?: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface CustomerGroupCreate extends CustomerGroupBase {
  // No additional fields needed for creation
}

export interface CustomerGroupUpdate extends Partial<CustomerGroupBase> {
  // All fields optional for updates
}

export interface CustomerGroup extends CustomerGroupBase {
  id: UUID;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  companies?: CustomerCompany[];
  
  // Statistics
  companiesCount?: number;
  locationsCount?: number;
  businessUnitsCount?: number;
  totalMonthlyRevenue?: number;
}

// ============================================================================
// Level 2: Company (公司) - Legal entity for billing
// ============================================================================

export interface CustomerCompanyBase {
  groupId?: UUID;
  name: string;
  legalName?: string;
  taxId: string;
  taxIdType: TaxIdType;
  billingAddress: Address;
  billingContact: Contact;
  billingEmail?: string;
  paymentTerms?: string; // NET30, NET60, etc.
  creditLimit?: number;
  extraData?: Record<string, any>;
  settings?: Record<string, any>;
  notes?: string;
  isActive?: boolean;
}

export interface CustomerCompanyCreate extends CustomerCompanyBase {
  taxIdType: TaxIdType;
}

export interface CustomerCompanyUpdate extends Partial<CustomerCompanyBase> {
  // All fields optional for updates
}

export interface CustomerCompany extends CustomerCompanyBase {
  id: UUID;
  taxIdType: TaxIdType;
  isActive: boolean;
  extraData: Record<string, any>;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  group?: CustomerGroup;
  locations?: CustomerLocation[];
  
  // Statistics
  locationsCount?: number;
  businessUnitsCount?: number;
  monthlyRevenue?: number;
  totalOrders?: number;
  avgOrderValue?: number;
  creditUtilization?: number;
}

// ============================================================================
// Level 3: Location (地點) - Physical delivery destination
// ============================================================================

export interface CustomerLocationBase {
  companyId: UUID;
  name: string;
  code?: string;
  address: Address;
  deliveryContact: Contact;
  operatingHours?: OperatingHours;
  deliveryInstructions?: string;
  coordinates?: Coordinates;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface CustomerLocationCreate extends CustomerLocationBase {
  companyId: UUID;
}

export interface CustomerLocationUpdate extends Partial<CustomerLocationBase> {
  // All fields optional for updates
}

export interface CustomerLocation extends CustomerLocationBase {
  id: UUID;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  company?: CustomerCompany;
  businessUnits?: BusinessUnit[];
  
  // Statistics
  businessUnitsCount?: number;
  monthlyOrders?: number;
  monthlyRevenue?: number;
  deliverySuccessRate?: number;
  avgDeliveryTime?: number;
}

// ============================================================================
// Level 4: Business Unit (業務單位) - Actual ordering entity
// ============================================================================

export interface BusinessUnitBase {
  locationId: UUID;
  name: string;
  code: string;
  type?: BusinessUnitType;
  costCenterCode?: string;
  budgetMonthly?: number;
  managerContact?: Contact;
  orderingPermissions?: OrderingPermissions;
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface BusinessUnitCreate extends BusinessUnitBase {
  locationId: UUID;
  code: string;
}

export interface BusinessUnitUpdate extends Partial<BusinessUnitBase> {
  // All fields optional for updates
}

export interface BusinessUnit extends BusinessUnitBase {
  id: UUID;
  code: string;
  isActive: boolean;
  orderingPermissions: OrderingPermissions;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  
  // Relationships
  location?: CustomerLocation;
  
  // Statistics
  monthlySpend?: number;
  monthlyOrders?: number;
  avgOrderValue?: number;
  budgetUtilization?: number;
  orderFrequency?: number;
  lastOrderDate?: Date;
}

// ============================================================================
// 層級樹狀結構 (Hierarchy Tree)
// ============================================================================

export interface HierarchyNode {
  id: UUID;
  name: string;
  type: HierarchyNodeType;
  code?: string;
  isActive: boolean;
  metadata: Record<string, any>;
  
  // Type-specific fields
  taxId?: string;
  taxIdType?: TaxIdType;
  address?: Address;
  coordinates?: Coordinates;
  unitType?: BusinessUnitType;
  budgetMonthly?: number;
  
  // Statistics
  childrenCount: number;
  descendantCount: number;
  
  // Tree structure
  parentId?: UUID;
  parentType?: HierarchyNodeType;
  children: HierarchyNode[];
  depth?: number;
  path?: string[];
}

export interface HierarchyTreeRequest {
  rootId?: UUID;
  rootType?: HierarchyNodeType;
  maxDepth?: number;
  includeInactive?: boolean;
  expandAll?: boolean;
  includeStats?: boolean;
  filterByType?: HierarchyNodeType[];
}

export interface HierarchyTreeResponse {
  tree: HierarchyNode[];
  totalNodes: number;
  maxDepth: number;
  actualDepth: number;
  includeInactive: boolean;
  rootCount: number;
  nodeCountsByType: Record<string, number>;
  activeNodeCounts: Record<string, number>;
}

export interface HierarchyPath {
  entityId: UUID;
  entityType: HierarchyNodeType;
  path: Array<{id: string; name: string; type: string}>;
  fullPathString: string;
  depth: number;
}

export interface HierarchySearchRequest {
  query: string;
  searchTypes?: HierarchyNodeType[];
  includeInactive?: boolean;
  maxResults?: number;
  searchFields?: string[];
}

export interface HierarchySearchResponse {
  results: HierarchySearchResult[];
  totalCount: number;
  searchQuery: string;
  searchTypes: HierarchyNodeType[];
}

export interface HierarchySearchResult {
  entity: HierarchyNode;
  path: HierarchyPath;
  matchScore: number;
  matchedFields: string[];
  highlights: Record<string, string>;
}

// ============================================================================
// 批量操作 (Bulk Operations)
// ============================================================================

export interface BulkOperationRequest<T> {
  operations: Array<{
    action: 'create' | 'update' | 'delete';
    id?: UUID;
    data?: T;
  }>;
  validateOnly?: boolean;
  rollbackOnError?: boolean;
}

export interface BulkOperationResponse {
  success: boolean;
  processedCount: number;
  errorCount: number;
  results: Array<{
    id?: UUID;
    success: boolean;
    error?: string;
    data?: any;
  }>;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// 資料遷移 (Migration)
// ============================================================================

export enum MigrationStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress", 
  COMPLETED = "completed",
  FAILED = "failed",
  ROLLED_BACK = "rolled_back"
}

export interface MigrationRequest {
  customerId: UUID;
  targetStructure: {
    createGroup?: boolean;
    groupName?: string;
    companyName?: string;
    locations?: Array<{
      name: string;
      address: Address;
      businessUnits?: Array<{
        name: string;
        type?: BusinessUnitType;
      }>;
    }>;
  };
  dryRun?: boolean;
}

export interface MigrationResponse {
  migrationId: UUID;
  customerId: UUID;
  status: MigrationStatus;
  oldCustomerData: any;
  newHierarchyData: {
    groupId?: UUID;
    companyId: UUID;
    locationIds: UUID[];
    businessUnitIds: UUID[];
  };
  migrationDate: Date;
  errors: string[];
  warnings: string[];
}

export interface MigrationStatus {
  migrationId: UUID;
  status: MigrationStatus;
  progress: number; // 0-100
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

// ============================================================================
// API 回應格式 (API Response Formats)
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  warnings?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ListResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  isActive?: boolean;
  searchQuery?: string;
  type?: HierarchyNodeType;
  parentId?: UUID;
  createdAfter?: Date;
  createdBefore?: Date;
}

// ============================================================================
// 統計與分析 (Statistics & Analytics)
// ============================================================================

export interface HierarchyStatistics {
  totalNodes: number;
  nodesByType: Record<HierarchyNodeType, number>;
  activeNodes: number;
  inactiveNodes: number;
  averageDepth: number;
  maxDepth: number;
  nodesWithoutChildren: number;
  largestBranch: {
    nodeId: UUID;
    childrenCount: number;
  };
}

export interface CustomerInsights {
  totalCustomers: number;
  activeCustomers: number;
  trialCustomers: number;
  inactiveCustomers: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageLoyaltyScore: number;
  topPerformingCompanies: Array<{
    companyId: UUID;
    companyName: string;
    monthlyRevenue: number;
    orderCount: number;
  }>;
  locationDistribution: Record<string, number>;
  businessUnitTypes: Record<BusinessUnitType, number>;
}

// ============================================================================
// 表單驗證 (Form Validation)
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ============================================================================
// UI 狀態管理 (UI State Management)
// ============================================================================

export interface HierarchyUIState {
  // Tree state
  expandedNodes: Set<UUID>;
  selectedNode?: UUID;
  hoveredNode?: UUID;
  
  // View preferences
  viewMode: 'tree' | 'cards' | 'table';
  showInactive: boolean;
  showStatistics: boolean;
  
  // Filters
  searchQuery: string;
  typeFilter: HierarchyNodeType[];
  locationFilter: string[];
  
  // Selection
  selectedNodes: Set<UUID>;
  bulkActionMode: boolean;
  
  // Navigation
  currentPath: HierarchyPath[];
  breadcrumbs: Array<{id: UUID; name: string; type: HierarchyNodeType}>;
}

export interface NavigationAction {
  type: 'navigate' | 'expand' | 'collapse' | 'select' | 'search' | 'filter';
  payload: any;
}

// ============================================================================
// 匯入/匯出 (Import/Export)
// ============================================================================

export interface ImportTemplate {
  groups?: Partial<CustomerGroupCreate>[];
  companies?: Partial<CustomerCompanyCreate>[];
  locations?: Partial<CustomerLocationCreate>[];
  businessUnits?: Partial<BusinessUnitCreate>[];
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  includeInactive: boolean;
  includeStatistics: boolean;
  levels: HierarchyNodeType[];
  fields: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}