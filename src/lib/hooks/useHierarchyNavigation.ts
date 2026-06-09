// ============================================================================
// useHierarchyNavigation Hook
// ============================================================================
// Hook for managing navigation within the customer hierarchy system

'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { customerHierarchyApi } from '@/lib/api/customer-hierarchy'
import type { HierarchyNode, HierarchyPath, HierarchyNodeType, UUID } from '@orderly/types'

interface BreadcrumbItem {
  id: UUID
  name: string
  type: HierarchyNodeType
  path: string
}

interface NavigationState {
  currentNode: HierarchyNode | null
  breadcrumbs: BreadcrumbItem[]
  isLoading: boolean
  error: string | null
}

interface NavigationHistory {
  nodeId: UUID
  nodeType: HierarchyNodeType
  nodeName: string
  timestamp: Date
}

interface UseHierarchyNavigationOptions {
  // Route configuration
  basePath?: string

  // History configuration
  maxHistorySize?: number
  persistHistory?: boolean

  // Auto-navigation
  autoLoadFromUrl?: boolean
}

interface UseHierarchyNavigationActions {
  // Navigation
  navigateToNode: (nodeId: UUID, nodeType: HierarchyNodeType) => Promise<void>
  navigateToPath: (path: string) => Promise<void>
  navigateBack: () => void
  navigateForward: () => void

  // Breadcrumb actions
  navigateToBreadcrumb: (index: number) => Promise<void>

  // History management
  getHistory: () => NavigationHistory[]
  clearHistory: () => void
  navigateToHistoryItem: (item: NavigationHistory) => Promise<void>

  // Quick navigation
  navigateToParent: () => Promise<void>
  navigateToChild: (childId: UUID) => Promise<void>
  navigateToSibling: (siblingId: UUID) => Promise<void>

  // URL sync
  updateUrl: (nodeId: UUID, nodeType: HierarchyNodeType) => void
  parseUrlParams: () => { nodeId?: UUID; nodeType?: HierarchyNodeType }
}

const STORAGE_KEY = 'hierarchy-navigation-history'

export function useHierarchyNavigation(
  options: UseHierarchyNavigationOptions = {}
): NavigationState & UseHierarchyNavigationActions {
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    basePath = '/platform/customers',
    maxHistorySize = 50,
    persistHistory = true,
    autoLoadFromUrl = true,
  } = options

  const [state, setState] = useState<NavigationState>({
    currentNode: null,
    breadcrumbs: [],
    isLoading: false,
    error: null,
  })

  const [history, setHistory] = useState<NavigationHistory[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Load navigation history from localStorage
  useEffect(() => {
    if (persistHistory && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsedHistory = JSON.parse(stored).map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }))
          setHistory(parsedHistory)
        }
      } catch (error) {
        console.warn('Failed to load navigation history:', error)
      }
    }
  }, [persistHistory])

  // Save navigation history to localStorage
  useEffect(() => {
    if (persistHistory && typeof window !== 'undefined' && history.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
      } catch (error) {
        console.warn('Failed to save navigation history:', error)
      }
    }
  }, [history, persistHistory])

  // Parse URL parameters - stabilized to prevent re-creation
  const parseUrlParams = useCallback((): { nodeId?: UUID; nodeType?: HierarchyNodeType } => {
    const nodeId = searchParams.get('nodeId') || undefined
    const nodeType = (searchParams.get('nodeType') as HierarchyNodeType) || undefined

    return { nodeId, nodeType }
  }, [searchParams])

  // Update URL with current navigation state
  const updateUrl = useCallback(
    (nodeId: UUID, nodeType: HierarchyNodeType) => {
      const params = new URLSearchParams(searchParams)
      params.set('nodeId', nodeId)
      params.set('nodeType', nodeType)

      router.push(`${basePath}?${params.toString()}`, { scroll: false })
    },
    [router, basePath, searchParams]
  )

  // Load node data and build breadcrumbs
  const loadNodeData = useCallback(
    async (nodeId: UUID, nodeType: HierarchyNodeType): Promise<void> => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        // Get the node path for breadcrumbs
        const pathResponse = await customerHierarchyApi.hierarchy.getPath(nodeId, nodeType)
        const hierarchyPath = pathResponse.data

        // Get current node details
        let currentNode: HierarchyNode | null = null

        try {
          switch (nodeType) {
            case 'group':
              const groupResponse = await customerHierarchyApi.groups.get(nodeId)
              currentNode = {
                id: groupResponse.data.id,
                name: groupResponse.data.name,
                type: 'group' as HierarchyNodeType,
                code: groupResponse.data.code,
                isActive: groupResponse.data.isActive,
                metadata: groupResponse.data.metadata,
                childrenCount: groupResponse.data.companiesCount || 0,
                descendantCount: 0,
                children: [],
              }
              break

            case 'company':
              const companyResponse = await customerHierarchyApi.companies.get(nodeId)
              currentNode = {
                id: companyResponse.data.id,
                name: companyResponse.data.name,
                type: 'company' as HierarchyNodeType,
                isActive: companyResponse.data.isActive,
                metadata: companyResponse.data.extraData,
                taxId: companyResponse.data.taxId,
                taxIdType: companyResponse.data.taxIdType,
                childrenCount: companyResponse.data.locationsCount || 0,
                descendantCount: 0,
                children: [],
              }
              break

            case 'location':
              const locationResponse = await customerHierarchyApi.locations.get(nodeId)
              currentNode = {
                id: locationResponse.data.id,
                name: locationResponse.data.name,
                type: 'location' as HierarchyNodeType,
                code: locationResponse.data.code,
                isActive: locationResponse.data.isActive,
                metadata: locationResponse.data.metadata,
                address: locationResponse.data.address,
                coordinates: locationResponse.data.coordinates,
                childrenCount: locationResponse.data.businessUnitsCount || 0,
                descendantCount: 0,
                children: [],
              }
              break

            case 'business_unit':
              const unitResponse = await customerHierarchyApi.businessUnits.get(nodeId)
              currentNode = {
                id: unitResponse.data.id,
                name: unitResponse.data.name,
                type: 'business_unit' as HierarchyNodeType,
                code: unitResponse.data.code,
                isActive: unitResponse.data.isActive,
                metadata: unitResponse.data.metadata,
                unitType: unitResponse.data.type,
                budgetMonthly: unitResponse.data.budgetMonthly,
                childrenCount: 0,
                descendantCount: 0,
                children: [],
              }
              break
          }
        } catch (nodeError) {
          console.warn('Failed to load node details, using path data:', nodeError)
        }

        // Build breadcrumbs from hierarchy path
        const breadcrumbs: BreadcrumbItem[] = hierarchyPath.path.map((item, index) => ({
          id: item.id,
          name: item.name,
          type: item.type as HierarchyNodeType,
          path: `${basePath}?nodeId=${item.id}&nodeType=${item.type}`,
        }))

        setState(prev => ({
          ...prev,
          currentNode,
          breadcrumbs,
          isLoading: false,
          error: null,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load navigation data',
        }))
      }
    },
    [basePath]
  )

  // Add to navigation history
  const addToHistory = useCallback(
    (nodeId: UUID, nodeType: HierarchyNodeType, nodeName: string) => {
      const historyItem: NavigationHistory = {
        nodeId,
        nodeType,
        nodeName,
        timestamp: new Date(),
      }

      setHistory(prev => {
        // Remove existing entry for this node if it exists
        const filtered = prev.filter(item => item.nodeId !== nodeId)

        // Add new entry at the beginning
        const newHistory = [historyItem, ...filtered]

        // Limit history size
        return newHistory.slice(0, maxHistorySize)
      })
    },
    [maxHistorySize]
  )

  // Navigate to a specific node
  const navigateToNode = useCallback(
    async (nodeId: UUID, nodeType: HierarchyNodeType): Promise<void> => {
      await loadNodeData(nodeId, nodeType)
      updateUrl(nodeId, nodeType)

      // Add to history with the nodeId (we'll get the name from the loaded data)
      addToHistory(nodeId, nodeType, `Node ${nodeId}`)
    },
    [loadNodeData, updateUrl, addToHistory]
  )

  // Navigate using path string
  const navigateToPath = useCallback(
    async (path: string): Promise<void> => {
      const url = new URL(path, window.location.origin)
      const nodeId = url.searchParams.get('nodeId')
      const nodeType = url.searchParams.get('nodeType') as HierarchyNodeType

      if (nodeId && nodeType) {
        await navigateToNode(nodeId, nodeType)
      }
    },
    [navigateToNode]
  )

  // Navigate to breadcrumb item
  const navigateToBreadcrumb = useCallback(
    async (index: number): Promise<void> => {
      if (index >= 0 && index < state.breadcrumbs.length) {
        const breadcrumb = state.breadcrumbs[index]
        await navigateToNode(breadcrumb.id, breadcrumb.type)
      }
    },
    [state.breadcrumbs, navigateToNode]
  )

  // History navigation
  const navigateBack = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const item = history[nextIndex]
      setHistoryIndex(nextIndex)
      navigateToNode(item.nodeId, item.nodeType)
    }
  }, [history, historyIndex, navigateToNode])

  const navigateForward = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1
      const item = history[nextIndex]
      setHistoryIndex(nextIndex)
      navigateToNode(item.nodeId, item.nodeType)
    }
  }, [history, historyIndex, navigateToNode])

  const navigateToHistoryItem = useCallback(
    async (item: NavigationHistory): Promise<void> => {
      await navigateToNode(item.nodeId, item.nodeType)
      const index = history.findIndex(h => h.nodeId === item.nodeId)
      if (index !== -1) {
        setHistoryIndex(index)
      }
    },
    [navigateToNode, history]
  )

  // Get navigation history
  const getHistory = useCallback((): NavigationHistory[] => {
    return [...history]
  }, [history])

  // Clear navigation history
  const clearHistory = useCallback(() => {
    setHistory([])
    setHistoryIndex(-1)
    if (persistHistory && typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [persistHistory])

  // Quick navigation helpers
  const navigateToParent = useCallback(async (): Promise<void> => {
    if (state.breadcrumbs.length > 1) {
      const parentBreadcrumb = state.breadcrumbs[state.breadcrumbs.length - 2]
      await navigateToNode(parentBreadcrumb.id, parentBreadcrumb.type)
    }
  }, [state.breadcrumbs, navigateToNode])

  const navigateToChild = useCallback(
    async (childId: UUID): Promise<void> => {
      if (state.currentNode) {
        const child = state.currentNode.children.find(c => c.id === childId)
        if (child) {
          await navigateToNode(child.id, child.type)
        }
      }
    },
    [state.currentNode, navigateToNode]
  )

  const navigateToSibling = useCallback(
    async (siblingId: UUID): Promise<void> => {
      if (state.currentNode?.parentId) {
        // For now, we'll need to get the parent and find the sibling
        // This could be optimized by maintaining sibling relationships
        await navigateToNode(siblingId, state.currentNode.type)
      }
    },
    [state.currentNode, navigateToNode]
  )

  // Memoized values for performance
  const canNavigateBack = useMemo(
    () => historyIndex < history.length - 1,
    [historyIndex, history.length]
  )
  const canNavigateForward = useMemo(() => historyIndex > 0, [historyIndex])
  const hasParent = useMemo(() => state.breadcrumbs.length > 1, [state.breadcrumbs.length])

  // Track if we've already loaded from URL to prevent repeated loading
  const hasLoadedFromUrl = useRef(false)

  // Load current node from URL parameters - only execute once
  useEffect(() => {
    if (autoLoadFromUrl && !hasLoadedFromUrl.current) {
      hasLoadedFromUrl.current = true
      const params = parseUrlParams()
      if (params.nodeId && params.nodeType) {
        navigateToNode(params.nodeId, params.nodeType)
      }
    }
  }, [autoLoadFromUrl, navigateToNode, parseUrlParams])

  return {
    // State
    ...state,

    // Navigation actions
    navigateToNode,
    navigateToPath,
    navigateBack,
    navigateForward,
    navigateToBreadcrumb,

    // History management
    getHistory,
    clearHistory,
    navigateToHistoryItem,

    // Quick navigation
    navigateToParent,
    navigateToChild,
    navigateToSibling,

    // URL management
    updateUrl,
    parseUrlParams,

    // Computed properties
    canNavigateBack,
    canNavigateForward,
    hasParent,
  }
}
