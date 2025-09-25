// ============================================================================
// Customer Hierarchy V2 - Simplified Hook
// ============================================================================
// Single hook that consolidates all hierarchy functionality

'use client'

import { useEffect, useCallback, useMemo, useRef } from 'react'
import { useCustomerHierarchyContext } from '../context/CustomerHierarchyContext'
import { customerHierarchyService } from '../services/customerHierarchyService'
import type { HierarchyNode, UUID, HierarchyNodeType } from '../types'

interface UseCustomerHierarchyOptions {
  autoLoad?: boolean
  includeInactive?: boolean
}

interface UseCustomerHierarchyReturn {
  // State
  tree: HierarchyNode[]
  selectedNodeId: UUID | null
  expandedNodeIds: UUID[]
  searchQuery: string
  searchResults: Array<{
    entity: HierarchyNode
    score: number
    matchType: string
    breadcrumb: string[]
  }>
  viewMode: 'tree' | 'cards' | 'table'
  showFilters: boolean

  // Loading states
  isLoading: boolean
  isSearching: boolean

  // Error states
  error: string | null
  searchError: string | null

  // Computed data
  selectedNode: HierarchyNode | null
  breadcrumbs: Array<{ id: UUID; name: string; type: HierarchyNodeType }>
  flatNodes: HierarchyNode[]
  totalNodes: number

  // Actions
  loadTree: () => Promise<void>
  selectNode: (nodeId: UUID | null) => void
  toggleNode: (nodeId: UUID) => void
  expandNode: (nodeId: UUID) => void
  collapseNode: (nodeId: UUID) => void
  search: (query: string) => Promise<void>
  clearSearch: () => void
  setViewMode: (mode: 'tree' | 'cards' | 'table') => void
  setShowFilters: (show: boolean) => void
  clearError: () => void
  resetState: () => void

  // Utilities
  findNode: (nodeId: UUID) => HierarchyNode | null
  getNodePath: (nodeId: UUID) => HierarchyNode[]
  getNodeChildren: (nodeId: UUID) => HierarchyNode[]
}

export function useCustomerHierarchy(
  options: UseCustomerHierarchyOptions = {}
): UseCustomerHierarchyReturn {
  const { autoLoad = true, includeInactive = false } = options
  const { state, actions } = useCustomerHierarchyContext()

  const {
    loadTree,
    selectNode,
    toggleNode,
    expandNode,
    collapseNode,
    search,
    clearSearch,
    setViewMode,
    setShowFilters,
    resetState,
    clearError: clearContextError,
  } = actions

  // Stable reference to track if we've already loaded
  const hasLoadedRef = useRef(false)

  // ============================================================================
  // Auto-load effect (only once, predictable)
  // ============================================================================

  useEffect(() => {
    if (autoLoad && !hasLoadedRef.current && !state.loading.tree && state.tree.length === 0) {
      hasLoadedRef.current = true
      loadTree()
    }
  }, [autoLoad, loadTree, state.loading.tree, state.tree.length])

  // ============================================================================
  // Computed values (memoized for performance)
  // ============================================================================

  const selectedNode = useMemo((): HierarchyNode | null => {
    if (!state.selectedNodeId) return null
    return customerHierarchyService.findNodeInTree(state.tree, state.selectedNodeId)
  }, [state.selectedNodeId, state.tree])

  const breadcrumbs = useMemo(() => {
    if (!state.selectedNodeId) return []

    const path = customerHierarchyService.getNodePath(state.tree, state.selectedNodeId)
    return path.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
    }))
  }, [state.selectedNodeId, state.tree])

  const flatNodes = useMemo(() => {
    return customerHierarchyService.flattenTree(state.tree)
  }, [state.tree])

  const totalNodes = useMemo(() => flatNodes.length, [flatNodes.length])

  // ============================================================================
  // Utility functions (stable with useCallback)
  // ============================================================================

  const findNode = useCallback(
    (nodeId: UUID): HierarchyNode | null => {
      return customerHierarchyService.findNodeInTree(state.tree, nodeId)
    },
    [state.tree]
  )

  const getNodePath = useCallback(
    (nodeId: UUID): HierarchyNode[] => {
      return customerHierarchyService.getNodePath(state.tree, nodeId)
    },
    [state.tree]
  )

  const getNodeChildren = useCallback(
    (nodeId: UUID): HierarchyNode[] => {
      const node = findNode(nodeId)
      return node ? node.children : []
    },
    [findNode]
  )

  const clearError = useCallback(() => {
    clearContextError('tree')
    clearContextError('search')
  }, [clearContextError])

  // ============================================================================
  // Return interface - all stable references
  // ============================================================================

  return {
    // State
    tree: state.tree,
    selectedNodeId: state.selectedNodeId,
    expandedNodeIds: state.expandedNodeIds,
    searchQuery: state.searchQuery,
    searchResults: state.searchResults,
    viewMode: state.viewMode,
    showFilters: state.showFilters,

    // Loading states
    isLoading: state.loading.tree,
    isSearching: state.loading.search,

    // Error states
    error: state.errors.tree,
    searchError: state.errors.search,

    // Computed data
    selectedNode,
    breadcrumbs,
    flatNodes,
    totalNodes,

    // Actions (from context, already stable)
    loadTree,
    selectNode,
    toggleNode,
    expandNode,
    collapseNode,
    search,
    clearSearch,
    setViewMode,
    setShowFilters,
    resetState,

    // Utilities (stable with useCallback)
    findNode,
    getNodePath,
    getNodeChildren,
    clearError,
  }
}
