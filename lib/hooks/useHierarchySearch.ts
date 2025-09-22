// ============================================================================
// useHierarchySearch Hook
// ============================================================================
// Hook for searching across all levels of the customer hierarchy
// Now integrated with Zustand store for centralized state management

'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useDebounce } from 'use-debounce'
import { useCustomerHierarchyStore, useSearchState } from '@/lib/stores/customerHierarchyStore'
import type { SearchResult, HierarchyNodeType, UUID } from '@orderly/types'

interface UseHierarchySearchState {
  // Query state
  query: string
  debouncedQuery: string

  // Results
  results: SearchResult[]
  totalCount: number

  // Loading & error states
  isSearching: boolean
  error: string | null

  // Result grouping
  resultsByType: Record<HierarchyNodeType, SearchResult[]>

  // Recent searches
  recentSearches: string[]

  // Search suggestions
  suggestions: string[]
  isLoadingSuggestions: boolean

  // Computed properties
  hasResults: boolean
  hasActiveFilters: boolean
}

interface SearchFilters {
  types?: HierarchyNodeType[]
  includeInactive?: boolean
  maxResults?: number
}

interface UseHierarchySearchOptions {
  // Debounce configuration
  debounceMs?: number

  // Auto-search
  autoSearch?: boolean
  minQueryLength?: number

  // History configuration
  saveRecentSearches?: boolean
  maxRecentSearches?: number

  // Suggestions
  enableSuggestions?: boolean
  suggestionSources?: ('history' | 'popular' | 'autocomplete')[]
}

interface UseHierarchySearchActions {
  // Basic search
  search: (query: string, filters?: SearchFilters) => Promise<void>
  clearSearch: () => void

  // Query management
  setQuery: (query: string) => void

  // Result navigation
  selectResult: (result: SearchResult) => void

  // History management
  getRecentSearches: () => string[]
  clearRecentSearches: () => void
  searchRecent: (recentQuery: string) => Promise<void>

  // Suggestions
  loadSuggestions: (partial: string) => Promise<void>
  clearSuggestions: () => void
}

const RECENT_SEARCHES_KEY = 'hierarchy-recent-searches'
const MAX_SUGGESTIONS = 10

export function useHierarchySearch(
  options: UseHierarchySearchOptions = {}
): UseHierarchySearchState & UseHierarchySearchActions {
  const {
    debounceMs = 300,
    autoSearch = true,
    minQueryLength = 2,
    saveRecentSearches = true,
    maxRecentSearches = 20,
    enableSuggestions = true,
    suggestionSources = ['history', 'autocomplete'],
  } = options

  // Use Zustand store for search state
  const searchState = useSearchState()
  const performStoreSearch = useCustomerHierarchyStore(s => s.search)
  const clearStoreSearch = useCustomerHierarchyStore(s => s.clearSearch)
  const setSearchQuery = useCustomerHierarchyStore(s => s.setSearchQuery)

  // Ref to track if component is mounted
  const isMountedRef = useRef<boolean>(true)

  // Ref to store recent searches to avoid circular dependencies
  const recentSearchesRef = useRef<string[]>([])

  // Local state for UI-specific features
  const [localState, setLocalState] = useState({
    suggestions: [] as string[],
    isLoadingSuggestions: false,
  })

  // Debounce search query
  const [debouncedQuery] = useDebounce(searchState.query, debounceMs)

  // Load recent searches from localStorage
  useEffect(() => {
    if (saveRecentSearches && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
        if (stored) {
          const recentSearches = JSON.parse(stored)
          recentSearchesRef.current = recentSearches
        }
      } catch (error) {
        console.warn('Failed to load recent searches:', error)
      }
    }
  }, [saveRecentSearches])

  // Save recent searches to localStorage
  const saveRecentSearches_fn = useCallback(
    (searches: string[]) => {
      if (saveRecentSearches && typeof window !== 'undefined') {
        try {
          localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
        } catch (error) {
          console.warn('Failed to save recent searches:', error)
        }
      }
    },
    [saveRecentSearches]
  )

  // Group results by type
  const resultsByType = useMemo((): Record<HierarchyNodeType, SearchResult[]> => {
    const grouped = {
      group: [],
      company: [],
      location: [],
      business_unit: [],
    } as Record<HierarchyNodeType, SearchResult[]>

    for (const result of searchState.results) {
      if (grouped[result.entity.type]) {
        grouped[result.entity.type].push(result)
      }
    }

    return grouped
  }, [searchState.results])

  // Perform search using store (removed circular dependency)
  const performSearch = useCallback(
    async (query: string, filters: SearchFilters = {}) => {
      if (!query || query.length < minQueryLength) {
        clearStoreSearch()
        return
      }

      // Add to recent searches if this is a user-initiated search
      const trimmedQuery = query.trim()
      if (trimmedQuery && !recentSearchesRef.current.includes(trimmedQuery)) {
        const newRecentSearches = [trimmedQuery, ...recentSearchesRef.current].slice(
          0,
          maxRecentSearches
        )
        recentSearchesRef.current = newRecentSearches
        saveRecentSearches_fn(newRecentSearches)
      }

      // Use store search method
      await performStoreSearch(trimmedQuery)
    },
    [minQueryLength, maxRecentSearches, saveRecentSearches_fn, performStoreSearch, clearStoreSearch]
  )

  // Cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Auto-search when debounced query changes (stabilized dependencies)
  useEffect(() => {
    if (!isMountedRef.current) return

    if (autoSearch && debouncedQuery && debouncedQuery.length >= minQueryLength) {
      performSearch(debouncedQuery)
    } else if (autoSearch && (!debouncedQuery || debouncedQuery.length < minQueryLength)) {
      clearStoreSearch()
    }
  }, [debouncedQuery, autoSearch, minQueryLength])

  // Search function (manual trigger)
  const search = useCallback(
    async (query: string, filters?: SearchFilters): Promise<void> => {
      await performSearch(query, filters)
    },
    [performSearch]
  )

  // Clear search
  const clearSearch = useCallback(() => {
    clearStoreSearch()
    if (isMountedRef.current) {
      setLocalState(prev => ({ ...prev, suggestions: [] }))
    }
  }, [clearStoreSearch])

  // Query management - use store method
  const setQuery = useCallback(
    (query: string) => {
      setSearchQuery(query)
    },
    [setSearchQuery]
  )

  // Result selection (can be used for navigation)
  const selectResult = useCallback((result: SearchResult) => {
    // This can be extended to integrate with navigation
    console.log('Selected result:', result)
  }, [])

  // History management (using refs to avoid circular dependencies)
  const getRecentSearches = useCallback((): string[] => {
    return [...recentSearchesRef.current]
  }, [])

  const clearRecentSearches = useCallback(() => {
    recentSearchesRef.current = []
    if (saveRecentSearches && typeof window !== 'undefined') {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    }
  }, [saveRecentSearches])

  const searchRecent = useCallback(
    async (recentQuery: string): Promise<void> => {
      await search(recentQuery)
    },
    [search]
  )

  // Load suggestions (removed circular dependency)
  const loadSuggestions = useCallback(
    async (partial: string): Promise<void> => {
      if (!isMountedRef.current || !enableSuggestions || !partial || partial.length < 1) {
        if (isMountedRef.current) {
          setLocalState(prev => ({ ...prev, suggestions: [] }))
        }
        return
      }

      if (isMountedRef.current) {
        setLocalState(prev => ({ ...prev, isLoadingSuggestions: true }))
      }

      try {
        const suggestions: string[] = []

        // Add suggestions from recent searches
        if (suggestionSources.includes('history')) {
          const recentMatches = recentSearchesRef.current
            .filter(search => search.toLowerCase().includes(partial.toLowerCase()))
            .slice(0, 5)
          suggestions.push(...recentMatches)
        }

        // Add autocomplete suggestions (this could be enhanced with a dedicated API)
        if (suggestionSources.includes('autocomplete')) {
          // For now, we'll use a simple autocomplete based on common terms
          const commonTerms = [
            '餐廳',
            '公司',
            '地點',
            '廚房',
            '總公司',
            '分店',
            '營業處',
            '業務部',
            'restaurant',
            'company',
            'location',
            'kitchen',
            'headquarters',
            'branch',
          ]

          const autoCompleteMatches = commonTerms
            .filter(term => term.toLowerCase().includes(partial.toLowerCase()))
            .map(term => `${partial} ${term}`)
            .slice(0, 3)

          suggestions.push(...autoCompleteMatches)
        }

        // Remove duplicates and limit
        const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, MAX_SUGGESTIONS)

        if (isMountedRef.current) {
          setLocalState(prev => ({
            ...prev,
            suggestions: uniqueSuggestions,
            isLoadingSuggestions: false,
          }))
        }
      } catch (error) {
        if (isMountedRef.current) {
          setLocalState(prev => ({
            ...prev,
            suggestions: [],
            isLoadingSuggestions: false,
          }))
        }
      }
    },
    [enableSuggestions, suggestionSources]
  )

  const clearSuggestions = useCallback(() => {
    if (isMountedRef.current) {
      setLocalState(prev => ({ ...prev, suggestions: [] }))
    }
  }, [])

  // Computed values
  const hasResults = useMemo(() => searchState.results.length > 0, [searchState.results.length])
  const hasActiveFilters = useMemo(() => false, []) // Simplified for now

  return {
    // State from store
    query: searchState.query,
    debouncedQuery,
    results: searchState.results,
    totalCount: searchState.results.length,
    isSearching: searchState.isSearching,
    error: null, // Using simplified error handling
    resultsByType,

    // Local state
    recentSearches: recentSearchesRef.current,
    suggestions: localState.suggestions,
    isLoadingSuggestions: localState.isLoadingSuggestions,

    // Computed properties
    hasResults,
    hasActiveFilters,

    // Actions
    search,
    clearSearch,
    setQuery,

    // Result actions
    selectResult,

    // History actions
    getRecentSearches,
    clearRecentSearches,
    searchRecent,

    // Suggestion actions
    loadSuggestions,
    clearSuggestions,
  }
}
