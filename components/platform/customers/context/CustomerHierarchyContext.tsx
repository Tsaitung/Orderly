// ============================================================================
// Customer Hierarchy V2 - React Context with useReducer
// ============================================================================
// Clean, predictable state management without Zustand/Immer complexity

'use client'

import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type {
  CustomerHierarchyState,
  CustomerHierarchyAction,
  CustomerHierarchyContextValue,
  HierarchyNode,
  SearchResult,
  LoadingState,
  ErrorState,
  UUID,
} from '../types'
import { customerHierarchyService } from '../services/customerHierarchyService'

// ============================================================================
// Initial State
// ============================================================================

const initialLoadingState: LoadingState = {
  tree: false,
  search: false,
  nodeDetails: false,
  operations: false,
}

const initialErrorState: ErrorState = {
  tree: null,
  search: null,
  nodeDetails: null,
  operations: null,
}

const initialState: CustomerHierarchyState = {
  tree: [],
  selectedNodeId: null,
  expandedNodeIds: [],
  searchQuery: '',
  searchResults: [],
  viewMode: 'cards',
  showFilters: false,
  loading: initialLoadingState,
  errors: initialErrorState,
  lastUpdated: null,
}

// ============================================================================
// Reducer - Pure Functions Only
// ============================================================================

function customerHierarchyReducer(
  state: CustomerHierarchyState,
  action: CustomerHierarchyAction
): CustomerHierarchyState {
  switch (action.type) {
    case 'LOAD_TREE_START':
      return {
        ...state,
        loading: { ...state.loading, tree: true },
        errors: { ...state.errors, tree: null },
      }

    case 'LOAD_TREE_SUCCESS':
      return {
        ...state,
        tree: action.payload,
        loading: { ...state.loading, tree: false },
        errors: { ...state.errors, tree: null },
        lastUpdated: new Date(),
      }

    case 'LOAD_TREE_ERROR':
      return {
        ...state,
        loading: { ...state.loading, tree: false },
        errors: { ...state.errors, tree: action.payload },
      }

    case 'SELECT_NODE':
      return {
        ...state,
        selectedNodeId: action.payload,
      }

    case 'TOGGLE_NODE': {
      const isExpanded = state.expandedNodeIds.includes(action.payload)
      const newExpandedNodes = isExpanded
        ? state.expandedNodeIds.filter(id => id !== action.payload)
        : [...state.expandedNodeIds, action.payload]
      return {
        ...state,
        expandedNodeIds: newExpandedNodes,
      }
    }

    case 'EXPAND_NODE': {
      if (state.expandedNodeIds.includes(action.payload)) {
        return state
      }
      return {
        ...state,
        expandedNodeIds: [...state.expandedNodeIds, action.payload],
      }
    }

    case 'COLLAPSE_NODE': {
      return {
        ...state,
        expandedNodeIds: state.expandedNodeIds.filter(id => id !== action.payload),
      }
    }

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      }

    case 'SEARCH_START':
      return {
        ...state,
        loading: { ...state.loading, search: true },
        errors: { ...state.errors, search: null },
      }

    case 'SEARCH_SUCCESS':
      return {
        ...state,
        searchResults: action.payload,
        loading: { ...state.loading, search: false },
        errors: { ...state.errors, search: null },
      }

    case 'SEARCH_ERROR':
      return {
        ...state,
        searchResults: [],
        loading: { ...state.loading, search: false },
        errors: { ...state.errors, search: action.payload },
      }

    case 'CLEAR_SEARCH':
      return {
        ...state,
        searchQuery: '',
        searchResults: [],
        errors: { ...state.errors, search: null },
      }

    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      }

    case 'SET_SHOW_FILTERS':
      return {
        ...state,
        showFilters: action.payload,
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload]: null },
      }

    case 'RESET_STATE':
      return {
        ...initialState,
        expandedNodeIds: [], // Ensure fresh array instance
      }

    default:
      return state
  }
}

// ============================================================================
// Context Creation
// ============================================================================

const CustomerHierarchyContext = createContext<CustomerHierarchyContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

interface CustomerHierarchyProviderProps {
  children: React.ReactNode
}

export function CustomerHierarchyProvider({ children }: CustomerHierarchyProviderProps) {
  const [state, dispatch] = useReducer(customerHierarchyReducer, initialState)

  // ============================================================================
  // Action Creators - All Stable with useCallback
  // ============================================================================

  const loadTree = useCallback(async (): Promise<void> => {
    dispatch({ type: 'LOAD_TREE_START' })

    try {
      const tree = await customerHierarchyService.getTree({ includeInactive: false })
      dispatch({ type: 'LOAD_TREE_SUCCESS', payload: tree })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load tree'
      dispatch({ type: 'LOAD_TREE_ERROR', payload: errorMessage })
    }
  }, [])

  const selectNode = useCallback((nodeId: UUID | null): void => {
    dispatch({ type: 'SELECT_NODE', payload: nodeId })
  }, [])

  const toggleNode = useCallback((nodeId: UUID): void => {
    dispatch({ type: 'TOGGLE_NODE', payload: nodeId })
  }, [])

  const expandNode = useCallback((nodeId: UUID): void => {
    dispatch({ type: 'EXPAND_NODE', payload: nodeId })
  }, [])

  const collapseNode = useCallback((nodeId: UUID): void => {
    dispatch({ type: 'COLLAPSE_NODE', payload: nodeId })
  }, [])

  const search = useCallback(async (query: string): Promise<void> => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })

    if (!query.trim()) {
      dispatch({ type: 'CLEAR_SEARCH' })
      return
    }

    dispatch({ type: 'SEARCH_START' })

    try {
      const results = await customerHierarchyService.search(query)
      dispatch({ type: 'SEARCH_SUCCESS', payload: results })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed'
      dispatch({ type: 'SEARCH_ERROR', payload: errorMessage })
    }
  }, [])

  const clearSearch = useCallback((): void => {
    dispatch({ type: 'CLEAR_SEARCH' })
  }, [])

  const setViewMode = useCallback((mode: 'tree' | 'cards' | 'table'): void => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode })
  }, [])

  const setShowFilters = useCallback((show: boolean): void => {
    dispatch({ type: 'SET_SHOW_FILTERS', payload: show })
  }, [])

  const clearError = useCallback((errorType: keyof ErrorState): void => {
    dispatch({ type: 'CLEAR_ERROR', payload: errorType })
  }, [])

  const resetState = useCallback((): void => {
    dispatch({ type: 'RESET_STATE' })
  }, [])

  // ============================================================================
  // Context Value - Memoized for Performance
  // ============================================================================

  const contextValue = React.useMemo<CustomerHierarchyContextValue>(
    () => ({
      state,
      actions: {
        loadTree,
        selectNode,
        toggleNode,
        expandNode,
        collapseNode,
        search,
        clearSearch,
        setViewMode,
        setShowFilters,
        clearError,
        resetState,
      },
    }),
    [
      state,
      loadTree,
      selectNode,
      toggleNode,
      expandNode,
      collapseNode,
      search,
      clearSearch,
      setViewMode,
      setShowFilters,
      clearError,
      resetState,
    ]
  )

  return (
    <CustomerHierarchyContext.Provider value={contextValue}>
      {children}
    </CustomerHierarchyContext.Provider>
  )
}

// ============================================================================
// Hook for Using Context
// ============================================================================

export function useCustomerHierarchyContext(): CustomerHierarchyContextValue {
  const context = useContext(CustomerHierarchyContext)

  if (!context) {
    throw new Error('useCustomerHierarchyContext must be used within a CustomerHierarchyProvider')
  }

  return context
}
