// ============================================================================
// useHierarchyFilter Hook
// ============================================================================
// Hook for advanced filtering across all levels of the customer hierarchy

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type {
  HierarchyNodeType,
  TaxIdType,
  BusinessUnitType,
  UUID,
  FilterParams,
} from '@orderly/types'

interface HierarchyFilterState {
  // Basic filters
  searchQuery: string
  isActive: boolean | null // null = all, true = active only, false = inactive only
  nodeTypes: HierarchyNodeType[]

  // Date filters
  createdAfter: Date | null
  createdBefore: Date | null
  updatedAfter: Date | null
  updatedBefore: Date | null

  // Location-based filters
  countries: string[]
  cities: string[]
  regions: string[]

  // Company-specific filters
  taxIdTypes: TaxIdType[]
  hasMultipleLocations: boolean | null
  creditLimitRange: { min?: number; max?: number } | null

  // Business unit filters
  businessUnitTypes: BusinessUnitType[]
  hasBudget: boolean | null
  budgetRange: { min?: number; max?: number } | null

  // Hierarchy-specific filters
  hasParent: boolean | null
  hasChildren: boolean | null
  hierarchyDepth: { min?: number; max?: number } | null
  parentId: UUID | null
  parentType: HierarchyNodeType | null

  // Advanced filters
  customMetadataFilters: Record<string, any>

  // Performance metrics filters
  monthlyRevenueRange: { min?: number; max?: number } | null
  orderCountRange: { min?: number; max?: number } | null
  loyaltyScoreRange: { min?: number; max?: number } | null

  // Filter state
  isActive_filter: boolean
  appliedCount: number
}

interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: Partial<HierarchyFilterState>
  isPublic: boolean
  createdBy?: string
  createdAt: Date
}

interface UseHierarchyFilterOptions {
  // Persistence
  persistFilters?: boolean
  storageKey?: string

  // Presets
  enablePresets?: boolean
  defaultPresets?: FilterPreset[]

  // Auto-apply
  autoApply?: boolean
  debounceMs?: number

  // Validation
  validateFilters?: boolean
}

interface UseHierarchyFilterActions {
  // Basic filter actions
  setSearchQuery: (query: string) => void
  setIsActive: (active: boolean | null) => void
  setNodeTypes: (types: HierarchyNodeType[]) => void
  addNodeType: (type: HierarchyNodeType) => void
  removeNodeType: (type: HierarchyNodeType) => void

  // Date filter actions
  setCreatedDateRange: (after: Date | null, before: Date | null) => void
  setUpdatedDateRange: (after: Date | null, before: Date | null) => void
  clearDateFilters: () => void

  // Location filter actions
  setCountries: (countries: string[]) => void
  setCities: (cities: string[]) => void
  setRegions: (regions: string[]) => void
  addLocation: (type: 'country' | 'city' | 'region', value: string) => void
  removeLocation: (type: 'country' | 'city' | 'region', value: string) => void
  clearLocationFilters: () => void

  // Company filter actions
  setTaxIdTypes: (types: TaxIdType[]) => void
  setHasMultipleLocations: (has: boolean | null) => void
  setCreditLimitRange: (min?: number, max?: number) => void
  clearCompanyFilters: () => void

  // Business unit filter actions
  setBusinessUnitTypes: (types: BusinessUnitType[]) => void
  setHasBudget: (has: boolean | null) => void
  setBudgetRange: (min?: number, max?: number) => void
  clearBusinessUnitFilters: () => void

  // Hierarchy filter actions
  setHasParent: (has: boolean | null) => void
  setHasChildren: (has: boolean | null) => void
  setHierarchyDepthRange: (min?: number, max?: number) => void
  setParentFilter: (parentId: UUID | null, parentType: HierarchyNodeType | null) => void
  clearHierarchyFilters: () => void

  // Custom metadata filters
  setCustomMetadataFilter: (key: string, value: any) => void
  removeCustomMetadataFilter: (key: string) => void
  clearCustomMetadataFilters: () => void

  // Performance metrics filters
  setMonthlyRevenueRange: (min?: number, max?: number) => void
  setOrderCountRange: (min?: number, max?: number) => void
  setLoyaltyScoreRange: (min?: number, max?: number) => void
  clearMetricsFilters: () => void

  // Filter management
  applyFilters: () => void
  clearAllFilters: () => void
  resetToDefaults: () => void

  // Preset management
  saveAsPreset: (name: string, description?: string, isPublic?: boolean) => FilterPreset
  loadPreset: (preset: FilterPreset) => void
  deletePreset: (presetId: string) => void
  getPresets: () => FilterPreset[]

  // Export/Import
  exportFilters: () => string
  importFilters: (filterString: string) => boolean

  // Validation
  validateCurrentFilters: () => { isValid: boolean; errors: string[] }

  // Conversion to API format
  toApiFilter: () => FilterParams
  toUrlParams: () => URLSearchParams
  fromUrlParams: (params: URLSearchParams) => void
}

const DEFAULT_FILTER_STATE: HierarchyFilterState = {
  searchQuery: '',
  isActive: null,
  nodeTypes: ['group', 'company', 'location', 'business_unit'],
  createdAfter: null,
  createdBefore: null,
  updatedAfter: null,
  updatedBefore: null,
  countries: [],
  cities: [],
  regions: [],
  taxIdTypes: [],
  hasMultipleLocations: null,
  creditLimitRange: null,
  businessUnitTypes: [],
  hasBudget: null,
  budgetRange: null,
  hasParent: null,
  hasChildren: null,
  hierarchyDepth: null,
  parentId: null,
  parentType: null,
  customMetadataFilters: {},
  monthlyRevenueRange: null,
  orderCountRange: null,
  loyaltyScoreRange: null,
  isActive_filter: false,
  appliedCount: 0,
}

const STORAGE_KEY_DEFAULT = 'hierarchy-filters'
const PRESETS_STORAGE_KEY = 'hierarchy-filter-presets'

export function useHierarchyFilter(
  options: UseHierarchyFilterOptions = {}
): HierarchyFilterState & UseHierarchyFilterActions {
  const {
    persistFilters = true,
    storageKey = STORAGE_KEY_DEFAULT,
    enablePresets = true,
    defaultPresets = [],
    autoApply = false,
    debounceMs = 300,
    validateFilters = true,
  } = options

  const [state, setState] = useState<HierarchyFilterState>(DEFAULT_FILTER_STATE)
  const [presets, setPresets] = useState<FilterPreset[]>(defaultPresets)

  // Load filters from localStorage on mount
  useEffect(() => {
    if (persistFilters && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsedFilters = JSON.parse(stored)
          setState(prev => ({ ...prev, ...parsedFilters }))
        }
      } catch (error) {
        console.warn('Failed to load stored filters:', error)
      }
    }
  }, [persistFilters, storageKey])

  // Load presets from localStorage
  useEffect(() => {
    if (enablePresets && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
        if (stored) {
          const parsedPresets = JSON.parse(stored).map((preset: any) => ({
            ...preset,
            createdAt: new Date(preset.createdAt),
          }))
          setPresets(prev => [...defaultPresets, ...parsedPresets])
        }
      } catch (error) {
        console.warn('Failed to load filter presets:', error)
      }
    }
  }, [enablePresets, defaultPresets])

  // Save filters to localStorage
  const saveFilters = useCallback(() => {
    if (persistFilters && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state))
      } catch (error) {
        console.warn('Failed to save filters:', error)
      }
    }
  }, [persistFilters, storageKey, state])

  // Calculate applied filter count
  const calculateAppliedCount = useCallback((filterState: HierarchyFilterState): number => {
    let count = 0

    if (filterState.searchQuery) count++
    if (filterState.isActive !== null) count++
    if (filterState.nodeTypes.length !== 4) count++ // Default is all 4 types
    if (filterState.createdAfter || filterState.createdBefore) count++
    if (filterState.updatedAfter || filterState.updatedBefore) count++
    if (filterState.countries.length > 0) count++
    if (filterState.cities.length > 0) count++
    if (filterState.regions.length > 0) count++
    if (filterState.taxIdTypes.length > 0) count++
    if (filterState.hasMultipleLocations !== null) count++
    if (filterState.creditLimitRange) count++
    if (filterState.businessUnitTypes.length > 0) count++
    if (filterState.hasBudget !== null) count++
    if (filterState.budgetRange) count++
    if (filterState.hasParent !== null) count++
    if (filterState.hasChildren !== null) count++
    if (filterState.hierarchyDepth) count++
    if (filterState.parentId) count++
    if (Object.keys(filterState.customMetadataFilters).length > 0) count++
    if (filterState.monthlyRevenueRange) count++
    if (filterState.orderCountRange) count++
    if (filterState.loyaltyScoreRange) count++

    return count
  }, [])

  // Update applied count when state changes
  useEffect(() => {
    const appliedCount = calculateAppliedCount(state)
    setState(prev => ({ ...prev, appliedCount }))
  }, [state, calculateAppliedCount])

  // Basic filter actions
  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }))
  }, [])

  const setIsActive = useCallback((active: boolean | null) => {
    setState(prev => ({ ...prev, isActive: active }))
  }, [])

  const setNodeTypes = useCallback((types: HierarchyNodeType[]) => {
    setState(prev => ({ ...prev, nodeTypes: types }))
  }, [])

  const addNodeType = useCallback((type: HierarchyNodeType) => {
    setState(prev => ({
      ...prev,
      nodeTypes: [...prev.nodeTypes.filter(t => t !== type), type],
    }))
  }, [])

  const removeNodeType = useCallback((type: HierarchyNodeType) => {
    setState(prev => ({
      ...prev,
      nodeTypes: prev.nodeTypes.filter(t => t !== type),
    }))
  }, [])

  // Date filter actions
  const setCreatedDateRange = useCallback((after: Date | null, before: Date | null) => {
    setState(prev => ({ ...prev, createdAfter: after, createdBefore: before }))
  }, [])

  const setUpdatedDateRange = useCallback((after: Date | null, before: Date | null) => {
    setState(prev => ({ ...prev, updatedAfter: after, updatedBefore: before }))
  }, [])

  const clearDateFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      createdAfter: null,
      createdBefore: null,
      updatedAfter: null,
      updatedBefore: null,
    }))
  }, [])

  // Location filter actions
  const setCountries = useCallback((countries: string[]) => {
    setState(prev => ({ ...prev, countries }))
  }, [])

  const setCities = useCallback((cities: string[]) => {
    setState(prev => ({ ...prev, cities }))
  }, [])

  const setRegions = useCallback((regions: string[]) => {
    setState(prev => ({ ...prev, regions }))
  }, [])

  const addLocation = useCallback((type: 'country' | 'city' | 'region', value: string) => {
    setState(prev => {
      const currentValues =
        prev[type === 'country' ? 'countries' : type === 'city' ? 'cities' : 'regions']
      return {
        ...prev,
        [type === 'country' ? 'countries' : type === 'city' ? 'cities' : 'regions']: [
          ...currentValues.filter(v => v !== value),
          value,
        ],
      }
    })
  }, [])

  const removeLocation = useCallback((type: 'country' | 'city' | 'region', value: string) => {
    setState(prev => {
      const currentValues =
        prev[type === 'country' ? 'countries' : type === 'city' ? 'cities' : 'regions']
      return {
        ...prev,
        [type === 'country' ? 'countries' : type === 'city' ? 'cities' : 'regions']:
          currentValues.filter(v => v !== value),
      }
    })
  }, [])

  const clearLocationFilters = useCallback(() => {
    setState(prev => ({ ...prev, countries: [], cities: [], regions: [] }))
  }, [])

  // Company filter actions
  const setTaxIdTypes = useCallback((types: TaxIdType[]) => {
    setState(prev => ({ ...prev, taxIdTypes: types }))
  }, [])

  const setHasMultipleLocations = useCallback((has: boolean | null) => {
    setState(prev => ({ ...prev, hasMultipleLocations: has }))
  }, [])

  const setCreditLimitRange = useCallback((min?: number, max?: number) => {
    setState(prev => ({
      ...prev,
      creditLimitRange: min !== undefined || max !== undefined ? { min, max } : null,
    }))
  }, [])

  const clearCompanyFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      taxIdTypes: [],
      hasMultipleLocations: null,
      creditLimitRange: null,
    }))
  }, [])

  // Business unit filter actions
  const setBusinessUnitTypes = useCallback((types: BusinessUnitType[]) => {
    setState(prev => ({ ...prev, businessUnitTypes: types }))
  }, [])

  const setHasBudget = useCallback((has: boolean | null) => {
    setState(prev => ({ ...prev, hasBudget: has }))
  }, [])

  const setBudgetRange = useCallback((min?: number, max?: number) => {
    setState(prev => ({
      ...prev,
      budgetRange: min !== undefined || max !== undefined ? { min, max } : null,
    }))
  }, [])

  const clearBusinessUnitFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      businessUnitTypes: [],
      hasBudget: null,
      budgetRange: null,
    }))
  }, [])

  // Hierarchy filter actions
  const setHasParent = useCallback((has: boolean | null) => {
    setState(prev => ({ ...prev, hasParent: has }))
  }, [])

  const setHasChildren = useCallback((has: boolean | null) => {
    setState(prev => ({ ...prev, hasChildren: has }))
  }, [])

  const setHierarchyDepthRange = useCallback((min?: number, max?: number) => {
    setState(prev => ({
      ...prev,
      hierarchyDepth: min !== undefined || max !== undefined ? { min, max } : null,
    }))
  }, [])

  const setParentFilter = useCallback(
    (parentId: UUID | null, parentType: HierarchyNodeType | null) => {
      setState(prev => ({ ...prev, parentId, parentType }))
    },
    []
  )

  const clearHierarchyFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasParent: null,
      hasChildren: null,
      hierarchyDepth: null,
      parentId: null,
      parentType: null,
    }))
  }, [])

  // Custom metadata filters
  const setCustomMetadataFilter = useCallback((key: string, value: any) => {
    setState(prev => ({
      ...prev,
      customMetadataFilters: { ...prev.customMetadataFilters, [key]: value },
    }))
  }, [])

  const removeCustomMetadataFilter = useCallback((key: string) => {
    setState(prev => {
      const { [key]: removed, ...rest } = prev.customMetadataFilters
      return { ...prev, customMetadataFilters: rest }
    })
  }, [])

  const clearCustomMetadataFilters = useCallback(() => {
    setState(prev => ({ ...prev, customMetadataFilters: {} }))
  }, [])

  // Performance metrics filters
  const setMonthlyRevenueRange = useCallback((min?: number, max?: number) => {
    setState(prev => ({
      ...prev,
      monthlyRevenueRange: min !== undefined || max !== undefined ? { min, max } : null,
    }))
  }, [])

  const setOrderCountRange = useCallback((min?: number, max?: number) => {
    setState(prev => ({
      ...prev,
      orderCountRange: min !== undefined || max !== undefined ? { min, max } : null,
    }))
  }, [])

  const setLoyaltyScoreRange = useCallback((min?: number, max?: number) => {
    setState(prev => ({
      ...prev,
      loyaltyScoreRange: min !== undefined || max !== undefined ? { min, max } : null,
    }))
  }, [])

  const clearMetricsFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      monthlyRevenueRange: null,
      orderCountRange: null,
      loyaltyScoreRange: null,
    }))
  }, [])

  // Filter management
  const applyFilters = useCallback(() => {
    setState(prev => ({ ...prev, isActive_filter: true }))
    saveFilters()
  }, [saveFilters])

  const clearAllFilters = useCallback(() => {
    setState(DEFAULT_FILTER_STATE)
  }, [])

  const resetToDefaults = useCallback(() => {
    setState(DEFAULT_FILTER_STATE)
  }, [])

  // Preset management
  const saveAsPreset = useCallback(
    (name: string, description?: string, isPublic: boolean = false): FilterPreset => {
      const preset: FilterPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        filters: { ...state },
        isPublic,
        createdAt: new Date(),
      }

      const newPresets = [...presets, preset]
      setPresets(newPresets)

      if (enablePresets && typeof window !== 'undefined') {
        try {
          const userPresets = newPresets.filter(p => !defaultPresets.includes(p))
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(userPresets))
        } catch (error) {
          console.warn('Failed to save preset:', error)
        }
      }

      return preset
    },
    [state, presets, enablePresets, defaultPresets]
  )

  const loadPreset = useCallback((preset: FilterPreset) => {
    setState(prev => ({ ...prev, ...preset.filters }))
  }, [])

  const deletePreset = useCallback(
    (presetId: string) => {
      const newPresets = presets.filter(p => p.id !== presetId)
      setPresets(newPresets)

      if (enablePresets && typeof window !== 'undefined') {
        try {
          const userPresets = newPresets.filter(p => !defaultPresets.includes(p))
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(userPresets))
        } catch (error) {
          console.warn('Failed to delete preset:', error)
        }
      }
    },
    [presets, enablePresets, defaultPresets]
  )

  const getPresets = useCallback((): FilterPreset[] => {
    return [...presets]
  }, [presets])

  // Export/Import
  const exportFilters = useCallback((): string => {
    return JSON.stringify(state, null, 2)
  }, [state])

  const importFilters = useCallback((filterString: string): boolean => {
    try {
      const imported = JSON.parse(filterString)
      setState(prev => ({ ...prev, ...imported }))
      return true
    } catch (error) {
      console.warn('Failed to import filters:', error)
      return false
    }
  }, [])

  // Validation
  const validateCurrentFilters = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Validate date ranges
    if (state.createdAfter && state.createdBefore && state.createdAfter > state.createdBefore) {
      errors.push('Created date range is invalid: start date must be before end date')
    }

    if (state.updatedAfter && state.updatedBefore && state.updatedAfter > state.updatedBefore) {
      errors.push('Updated date range is invalid: start date must be before end date')
    }

    // Validate numeric ranges
    if (
      state.creditLimitRange &&
      state.creditLimitRange.min &&
      state.creditLimitRange.max &&
      state.creditLimitRange.min > state.creditLimitRange.max
    ) {
      errors.push('Credit limit range is invalid: minimum must be less than maximum')
    }

    if (
      state.budgetRange &&
      state.budgetRange.min &&
      state.budgetRange.max &&
      state.budgetRange.min > state.budgetRange.max
    ) {
      errors.push('Budget range is invalid: minimum must be less than maximum')
    }

    if (
      state.hierarchyDepth &&
      state.hierarchyDepth.min &&
      state.hierarchyDepth.max &&
      state.hierarchyDepth.min > state.hierarchyDepth.max
    ) {
      errors.push('Hierarchy depth range is invalid: minimum must be less than maximum')
    }

    // Validate parent filter consistency
    if (state.parentId && !state.parentType) {
      errors.push('Parent type must be specified when parent ID is set')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }, [state])

  // Conversion to API format
  const toApiFilter = useCallback((): FilterParams => {
    return {
      searchQuery: state.searchQuery || undefined,
      isActive: state.isActive === null ? undefined : state.isActive,
      type: state.nodeTypes.length === 4 ? undefined : state.nodeTypes[0], // Simplified for API
      parentId: state.parentId || undefined,
      createdAfter: state.createdAfter || undefined,
      createdBefore: state.createdBefore || undefined,
    }
  }, [state])

  // URL params conversion
  const toUrlParams = useCallback((): URLSearchParams => {
    const params = new URLSearchParams()

    if (state.searchQuery) params.set('q', state.searchQuery)
    if (state.isActive !== null) params.set('active', state.isActive.toString())
    if (state.nodeTypes.length !== 4) params.set('types', state.nodeTypes.join(','))
    if (state.createdAfter) params.set('created_after', state.createdAfter.toISOString())
    if (state.createdBefore) params.set('created_before', state.createdBefore.toISOString())
    if (state.parentId) params.set('parent_id', state.parentId)
    if (state.parentType) params.set('parent_type', state.parentType)

    return params
  }, [state])

  const fromUrlParams = useCallback((params: URLSearchParams) => {
    const updates: Partial<HierarchyFilterState> = {}

    const query = params.get('q')
    if (query) updates.searchQuery = query

    const active = params.get('active')
    if (active) updates.isActive = active === 'true'

    const types = params.get('types')
    if (types) updates.nodeTypes = types.split(',') as HierarchyNodeType[]

    const createdAfter = params.get('created_after')
    if (createdAfter) updates.createdAfter = new Date(createdAfter)

    const createdBefore = params.get('created_before')
    if (createdBefore) updates.createdBefore = new Date(createdBefore)

    const parentId = params.get('parent_id')
    if (parentId) updates.parentId = parentId

    const parentType = params.get('parent_type')
    if (parentType) updates.parentType = parentType as HierarchyNodeType

    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Computed values
  const hasActiveFilters = useMemo(() => state.appliedCount > 0, [state.appliedCount])
  const isValidState = useMemo(() => validateCurrentFilters().isValid, [validateCurrentFilters])

  return {
    // State
    ...state,

    // Computed properties
    hasActiveFilters,
    isValidState,

    // Basic actions
    setSearchQuery,
    setIsActive,
    setNodeTypes,
    addNodeType,
    removeNodeType,

    // Date actions
    setCreatedDateRange,
    setUpdatedDateRange,
    clearDateFilters,

    // Location actions
    setCountries,
    setCities,
    setRegions,
    addLocation,
    removeLocation,
    clearLocationFilters,

    // Company actions
    setTaxIdTypes,
    setHasMultipleLocations,
    setCreditLimitRange,
    clearCompanyFilters,

    // Business unit actions
    setBusinessUnitTypes,
    setHasBudget,
    setBudgetRange,
    clearBusinessUnitFilters,

    // Hierarchy actions
    setHasParent,
    setHasChildren,
    setHierarchyDepthRange,
    setParentFilter,
    clearHierarchyFilters,

    // Custom metadata actions
    setCustomMetadataFilter,
    removeCustomMetadataFilter,
    clearCustomMetadataFilters,

    // Metrics actions
    setMonthlyRevenueRange,
    setOrderCountRange,
    setLoyaltyScoreRange,
    clearMetricsFilters,

    // Filter management
    applyFilters,
    clearAllFilters,
    resetToDefaults,

    // Preset management
    saveAsPreset,
    loadPreset,
    deletePreset,
    getPresets,

    // Export/Import
    exportFilters,
    importFilters,

    // Validation
    validateCurrentFilters,

    // Conversion
    toApiFilter,
    toUrlParams,
    fromUrlParams,
  }
}
