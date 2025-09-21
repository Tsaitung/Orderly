// ============================================================================
// Customer Hierarchy API Client
// ============================================================================
// Type-safe API client for 4-level customer hierarchy management system
// 集團 → 公司 → 地點 → 業務單位

import { http } from './http';
import type {
  // Core entities
  CustomerGroup, CustomerGroupCreate, CustomerGroupUpdate,
  CustomerCompany, CustomerCompanyCreate, CustomerCompanyUpdate,
  CustomerLocation, CustomerLocationCreate, CustomerLocationUpdate,
  BusinessUnit, BusinessUnitCreate, BusinessUnitUpdate,
  
  // Hierarchy management
  HierarchyNode, HierarchyTreeRequest, HierarchyTreeResponse,
  HierarchySearchRequest, HierarchySearchResponse,
  HierarchyPath,
  
  // Operations
  BulkOperationRequest, BulkOperationResponse,
  MigrationRequest, MigrationResponse, MigrationStatus,
  
  // Responses
  ApiResponse, ListResponse, PaginationParams, FilterParams,
  HierarchyStatistics, CustomerInsights,
  
  // Enums
  HierarchyNodeType, TaxIdType, BusinessUnitType,
  UUID
} from '@orderly/types';

// ============================================================================
// Configuration
// ============================================================================

const CUSTOMER_HIERARCHY_BASE_URL = process.env.NEXT_PUBLIC_CUSTOMER_HIERARCHY_API_URL || '/api/bff/v2';

const customerHierarchyHttp = {
  get: <T>(path: string) => http.get<T>(path, { baseUrl: CUSTOMER_HIERARCHY_BASE_URL }),
  post: <T>(path: string, body?: any) => http.post<T>(path, body, { baseUrl: CUSTOMER_HIERARCHY_BASE_URL }),
  patch: <T>(path: string, body?: any) => http.patch<T>(path, body, { baseUrl: CUSTOMER_HIERARCHY_BASE_URL }),
  delete: <T>(path: string) => http.request<T>(path, { method: 'DELETE' }, { baseUrl: CUSTOMER_HIERARCHY_BASE_URL })
};

// ============================================================================
// Groups API (Level 1: 集團)
// ============================================================================

export const groupsApi = {
  /**
   * List all customer groups with optional filtering and pagination
   */
  list: async (params?: PaginationParams & FilterParams): Promise<ListResponse<CustomerGroup>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sort_by', params.sortBy);
    if (params?.sortOrder) searchParams.set('sort_order', params.sortOrder);
    if (params?.isActive !== undefined) searchParams.set('is_active', params.isActive.toString());
    if (params?.searchQuery) searchParams.set('search', params.searchQuery);
    if (params?.createdAfter) searchParams.set('created_after', params.createdAfter.toISOString());
    if (params?.createdBefore) searchParams.set('created_before', params.createdBefore.toISOString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<CustomerGroup>>(`/groups${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single customer group by ID
   */
  get: async (id: UUID): Promise<ApiResponse<CustomerGroup>> => {
    return customerHierarchyHttp.get<ApiResponse<CustomerGroup>>(`/groups/${id}`);
  },

  /**
   * Create a new customer group
   */
  create: async (data: CustomerGroupCreate): Promise<ApiResponse<CustomerGroup>> => {
    return customerHierarchyHttp.post<ApiResponse<CustomerGroup>>('/groups', data);
  },

  /**
   * Update an existing customer group
   */
  update: async (id: UUID, data: CustomerGroupUpdate): Promise<ApiResponse<CustomerGroup>> => {
    return customerHierarchyHttp.patch<ApiResponse<CustomerGroup>>(`/groups/${id}`, data);
  },

  /**
   * Delete a customer group (soft delete)
   */
  delete: async (id: UUID): Promise<ApiResponse<{ id: UUID }>> => {
    return customerHierarchyHttp.delete<ApiResponse<{ id: UUID }>>(`/groups/${id}`);
  },

  /**
   * Get companies belonging to a group
   */
  getCompanies: async (groupId: UUID, params?: PaginationParams): Promise<ListResponse<CustomerCompany>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<CustomerCompany>>(`/groups/${groupId}/companies${query ? `?${query}` : ''}`);
  }
};

// ============================================================================
// Companies API (Level 2: 公司)
// ============================================================================

export const companiesApi = {
  /**
   * List all customer companies with optional filtering and pagination
   */
  list: async (params?: PaginationParams & FilterParams & { groupId?: UUID }): Promise<ListResponse<CustomerCompany>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sort_by', params.sortBy);
    if (params?.sortOrder) searchParams.set('sort_order', params.sortOrder);
    if (params?.isActive !== undefined) searchParams.set('is_active', params.isActive.toString());
    if (params?.searchQuery) searchParams.set('search', params.searchQuery);
    if (params?.groupId) searchParams.set('group_id', params.groupId);
    if (params?.createdAfter) searchParams.set('created_after', params.createdAfter.toISOString());
    if (params?.createdBefore) searchParams.set('created_before', params.createdBefore.toISOString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<CustomerCompany>>(`/companies${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single customer company by ID
   */
  get: async (id: UUID): Promise<ApiResponse<CustomerCompany>> => {
    return customerHierarchyHttp.get<ApiResponse<CustomerCompany>>(`/companies/${id}`);
  },

  /**
   * Create a new customer company
   */
  create: async (data: CustomerCompanyCreate): Promise<ApiResponse<CustomerCompany>> => {
    return customerHierarchyHttp.post<ApiResponse<CustomerCompany>>('/companies', data);
  },

  /**
   * Update an existing customer company
   */
  update: async (id: UUID, data: CustomerCompanyUpdate): Promise<ApiResponse<CustomerCompany>> => {
    return customerHierarchyHttp.patch<ApiResponse<CustomerCompany>>(`/companies/${id}`, data);
  },

  /**
   * Delete a customer company (soft delete)
   */
  delete: async (id: UUID): Promise<ApiResponse<{ id: UUID }>> => {
    return customerHierarchyHttp.delete<ApiResponse<{ id: UUID }>>(`/companies/${id}`);
  },

  /**
   * Get locations belonging to a company
   */
  getLocations: async (companyId: UUID, params?: PaginationParams): Promise<ListResponse<CustomerLocation>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<CustomerLocation>>(`/companies/${companyId}/locations${query ? `?${query}` : ''}`);
  },

  /**
   * Validate tax ID format
   */
  validateTaxId: async (taxId: string, taxIdType: TaxIdType): Promise<ApiResponse<{ isValid: boolean; message?: string }>> => {
    return customerHierarchyHttp.post<ApiResponse<{ isValid: boolean; message?: string }>>('/companies/validate-tax-id', {
      tax_id: taxId,
      tax_id_type: taxIdType
    });
  }
};

// ============================================================================
// Locations API (Level 3: 地點)
// ============================================================================

export const locationsApi = {
  /**
   * List all customer locations with optional filtering and pagination
   */
  list: async (params?: PaginationParams & FilterParams & { companyId?: UUID }): Promise<ListResponse<CustomerLocation>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sort_by', params.sortBy);
    if (params?.sortOrder) searchParams.set('sort_order', params.sortOrder);
    if (params?.isActive !== undefined) searchParams.set('is_active', params.isActive.toString());
    if (params?.searchQuery) searchParams.set('search', params.searchQuery);
    if (params?.companyId) searchParams.set('company_id', params.companyId);
    if (params?.createdAfter) searchParams.set('created_after', params.createdAfter.toISOString());
    if (params?.createdBefore) searchParams.set('created_before', params.createdBefore.toISOString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<CustomerLocation>>(`/locations${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single customer location by ID
   */
  get: async (id: UUID): Promise<ApiResponse<CustomerLocation>> => {
    return customerHierarchyHttp.get<ApiResponse<CustomerLocation>>(`/locations/${id}`);
  },

  /**
   * Create a new customer location
   */
  create: async (data: CustomerLocationCreate): Promise<ApiResponse<CustomerLocation>> => {
    return customerHierarchyHttp.post<ApiResponse<CustomerLocation>>('/locations', data);
  },

  /**
   * Update an existing customer location
   */
  update: async (id: UUID, data: CustomerLocationUpdate): Promise<ApiResponse<CustomerLocation>> => {
    return customerHierarchyHttp.patch<ApiResponse<CustomerLocation>>(`/locations/${id}`, data);
  },

  /**
   * Delete a customer location (soft delete)
   */
  delete: async (id: UUID): Promise<ApiResponse<{ id: UUID }>> => {
    return customerHierarchyHttp.delete<ApiResponse<{ id: UUID }>>(`/locations/${id}`);
  },

  /**
   * Get business units belonging to a location
   */
  getBusinessUnits: async (locationId: UUID, params?: PaginationParams): Promise<ListResponse<BusinessUnit>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<BusinessUnit>>(`/locations/${locationId}/business-units${query ? `?${query}` : ''}`);
  },

  /**
   * Validate and geocode address
   */
  validateAddress: async (address: {
    street: string;
    city: string;
    postalCode?: string;
    country: string;
  }): Promise<ApiResponse<{
    isValid: boolean;
    normalized?: any;
    coordinates?: { latitude: number; longitude: number };
    suggestions?: any[];
  }>> => {
    return customerHierarchyHttp.post<ApiResponse<any>>('/locations/validate-address', address);
  }
};

// ============================================================================
// Business Units API (Level 4: 業務單位)
// ============================================================================

export const businessUnitsApi = {
  /**
   * List all business units with optional filtering and pagination
   */
  list: async (params?: PaginationParams & FilterParams & { 
    locationId?: UUID; 
    type?: BusinessUnitType;
  }): Promise<ListResponse<BusinessUnit>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sort_by', params.sortBy);
    if (params?.sortOrder) searchParams.set('sort_order', params.sortOrder);
    if (params?.isActive !== undefined) searchParams.set('is_active', params.isActive.toString());
    if (params?.searchQuery) searchParams.set('search', params.searchQuery);
    if (params?.locationId) searchParams.set('location_id', params.locationId);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.createdAfter) searchParams.set('created_after', params.createdAfter.toISOString());
    if (params?.createdBefore) searchParams.set('created_before', params.createdBefore.toISOString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<BusinessUnit>>(`/business-units${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single business unit by ID
   */
  get: async (id: UUID): Promise<ApiResponse<BusinessUnit>> => {
    return customerHierarchyHttp.get<ApiResponse<BusinessUnit>>(`/business-units/${id}`);
  },

  /**
   * Create a new business unit
   */
  create: async (data: BusinessUnitCreate): Promise<ApiResponse<BusinessUnit>> => {
    return customerHierarchyHttp.post<ApiResponse<BusinessUnit>>('/business-units', data);
  },

  /**
   * Update an existing business unit
   */
  update: async (id: UUID, data: BusinessUnitUpdate): Promise<ApiResponse<BusinessUnit>> => {
    return customerHierarchyHttp.patch<ApiResponse<BusinessUnit>>(`/business-units/${id}`, data);
  },

  /**
   * Delete a business unit (soft delete)
   */
  delete: async (id: UUID): Promise<ApiResponse<{ id: UUID }>> => {
    return customerHierarchyHttp.delete<ApiResponse<{ id: UUID }>>(`/business-units/${id}`);
  },

  /**
   * Validate business unit code uniqueness within location
   */
  validateCode: async (locationId: UUID, code: string, excludeId?: UUID): Promise<ApiResponse<{ isUnique: boolean }>> => {
    const params = new URLSearchParams({ location_id: locationId, code });
    if (excludeId) params.set('exclude_id', excludeId);
    
    return customerHierarchyHttp.get<ApiResponse<{ isUnique: boolean }>>(`/business-units/validate-code?${params}`);
  }
};

// ============================================================================
// Hierarchy Management API
// ============================================================================

export const hierarchyApi = {
  /**
   * Get hierarchy tree structure
   */
  getTree: async (request?: HierarchyTreeRequest): Promise<HierarchyTreeResponse> => {
    return customerHierarchyHttp.post<HierarchyTreeResponse>('/hierarchy/tree', request || {});
  },

  /**
   * Search across hierarchy levels
   */
  search: async (request: HierarchySearchRequest): Promise<HierarchySearchResponse> => {
    return customerHierarchyHttp.post<HierarchySearchResponse>('/hierarchy/search', request);
  },

  /**
   * Get path from root to entity
   */
  getPath: async (entityId: UUID, entityType: HierarchyNodeType): Promise<ApiResponse<HierarchyPath>> => {
    return customerHierarchyHttp.get<ApiResponse<HierarchyPath>>(`/hierarchy/path/${entityType}/${entityId}`);
  },

  /**
   * Move entity within hierarchy
   */
  moveEntity: async (entityId: UUID, entityType: HierarchyNodeType, newParentId: UUID): Promise<ApiResponse<HierarchyNode>> => {
    return customerHierarchyHttp.post<ApiResponse<HierarchyNode>>('/hierarchy/move', {
      entity_id: entityId,
      entity_type: entityType,
      new_parent_id: newParentId
    });
  },

  /**
   * Validate hierarchy structure
   */
  validate: async (entityId?: UUID): Promise<ApiResponse<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>> => {
    const path = entityId ? `/hierarchy/validate/${entityId}` : '/hierarchy/validate';
    return customerHierarchyHttp.get<ApiResponse<any>>(path);
  },

  /**
   * Get hierarchy statistics
   */
  getStatistics: async (): Promise<ApiResponse<HierarchyStatistics>> => {
    return customerHierarchyHttp.get<ApiResponse<HierarchyStatistics>>('/hierarchy/statistics');
  },

  /**
   * Export hierarchy structure
   */
  exportStructure: async (options: {
    format: 'json' | 'csv' | 'excel';
    includeInactive?: boolean;
    levels?: HierarchyNodeType[];
  }): Promise<Blob> => {
    const response = await fetch(`${CUSTOMER_HIERARCHY_BASE_URL}/hierarchy/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  }
};

// ============================================================================
// Bulk Operations API
// ============================================================================

export const bulkApi = {
  /**
   * Bulk create groups
   */
  createGroups: async (request: BulkOperationRequest<CustomerGroupCreate>): Promise<BulkOperationResponse> => {
    return customerHierarchyHttp.post<BulkOperationResponse>('/bulk/groups', request);
  },

  /**
   * Bulk create companies
   */
  createCompanies: async (request: BulkOperationRequest<CustomerCompanyCreate>): Promise<BulkOperationResponse> => {
    return customerHierarchyHttp.post<BulkOperationResponse>('/bulk/companies', request);
  },

  /**
   * Bulk create locations
   */
  createLocations: async (request: BulkOperationRequest<CustomerLocationCreate>): Promise<BulkOperationResponse> => {
    return customerHierarchyHttp.post<BulkOperationResponse>('/bulk/locations', request);
  },

  /**
   * Bulk create business units
   */
  createBusinessUnits: async (request: BulkOperationRequest<BusinessUnitCreate>): Promise<BulkOperationResponse> => {
    return customerHierarchyHttp.post<BulkOperationResponse>('/bulk/business-units', request);
  },

  /**
   * Bulk update entities
   */
  updateEntities: async (
    entityType: HierarchyNodeType, 
    updates: Array<{ id: UUID; data: any }>
  ): Promise<BulkOperationResponse> => {
    return customerHierarchyHttp.post<BulkOperationResponse>(`/bulk/${entityType}/update`, {
      operations: updates.map(u => ({ action: 'update', id: u.id, data: u.data }))
    });
  },

  /**
   * Bulk delete entities
   */
  deleteEntities: async (entityType: HierarchyNodeType, ids: UUID[]): Promise<BulkOperationResponse> => {
    return customerHierarchyHttp.post<BulkOperationResponse>(`/bulk/${entityType}/delete`, {
      operations: ids.map(id => ({ action: 'delete', id }))
    });
  }
};

// ============================================================================
// Migration API
// ============================================================================

export const migrationApi = {
  /**
   * Start migration from old customer system
   */
  startMigration: async (request: MigrationRequest): Promise<ApiResponse<MigrationResponse>> => {
    return customerHierarchyHttp.post<ApiResponse<MigrationResponse>>('/migration/start', request);
  },

  /**
   * Get migration status
   */
  getStatus: async (migrationId: UUID): Promise<ApiResponse<MigrationStatus>> => {
    return customerHierarchyHttp.get<ApiResponse<MigrationStatus>>(`/migration/status/${migrationId}`);
  },

  /**
   * Rollback migration
   */
  rollback: async (migrationId: UUID): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return customerHierarchyHttp.post<ApiResponse<any>>(`/migration/rollback/${migrationId}`);
  },

  /**
   * Validate migration data before executing
   */
  validateMigration: async (request: MigrationRequest): Promise<ApiResponse<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    preview: any;
  }>> => {
    return customerHierarchyHttp.post<ApiResponse<any>>('/migration/validate', request);
  },

  /**
   * Get migration history
   */
  getHistory: async (params?: PaginationParams): Promise<ListResponse<MigrationResponse>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const query = searchParams.toString();
    return customerHierarchyHttp.get<ListResponse<MigrationResponse>>(`/migration/history${query ? `?${query}` : ''}`);
  }
};

// ============================================================================
// Analytics & Insights API
// ============================================================================

export const analyticsApi = {
  /**
   * Get customer insights and statistics
   */
  getCustomerInsights: async (params?: {
    dateRange?: {
      start: Date;
      end: Date;
    };
    groupBy?: 'month' | 'week' | 'day';
    includeInactive?: boolean;
  }): Promise<ApiResponse<CustomerInsights>> => {
    return customerHierarchyHttp.post<ApiResponse<CustomerInsights>>('/analytics/insights', params || {});
  },

  /**
   * Get performance metrics by hierarchy level
   */
  getPerformanceMetrics: async (
    entityId: UUID,
    entityType: HierarchyNodeType,
    period: '7d' | '30d' | '90d' | '1y'
  ): Promise<ApiResponse<{
    revenue: number[];
    orders: number[];
    growth: number;
    trends: any[];
  }>> => {
    return customerHierarchyHttp.get<ApiResponse<any>>(`/analytics/performance/${entityType}/${entityId}?period=${period}`);
  },

  /**
   * Get hierarchy health report
   */
  getHealthReport: async (): Promise<ApiResponse<{
    totalEntities: number;
    activeEntities: number;
    entitiesWithIssues: number;
    orphanedEntities: number;
    duplicateNodes: number;
    recommendations: string[];
  }>> => {
    return customerHierarchyHttp.get<ApiResponse<any>>('/analytics/health');
  }
};

// ============================================================================
// Combined Export
// ============================================================================

export const customerHierarchyApi = {
  groups: groupsApi,
  companies: companiesApi,
  locations: locationsApi,
  businessUnits: businessUnitsApi,
  hierarchy: hierarchyApi,
  bulk: bulkApi,
  migration: migrationApi,
  analytics: analyticsApi
};

export default customerHierarchyApi;
