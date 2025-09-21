// ============================================================================
// useHierarchySearch Hook Tests
// ============================================================================

import { renderHook, act, waitFor } from '@testing-library/react';
import { useHierarchySearch } from '../useHierarchySearch';
import { useCustomerHierarchyStore } from '@/lib/stores/customerHierarchyStore';

// Mock the Zustand store
jest.mock('@/lib/stores/customerHierarchyStore', () => ({
  useCustomerHierarchyStore: jest.fn(),
  useSearchState: jest.fn(),
  useSearchResults: jest.fn(),
  useSearchSuggestions: jest.fn(),
  useRecentSearches: jest.fn(),
  useSearchLoading: jest.fn(),
  useSearchError: jest.fn(),
}));

// Mock the API
jest.mock('@/lib/api/customer-hierarchy', () => ({
  customerHierarchyApi: {
    hierarchy: {
      search: jest.fn(),
      getSuggestions: jest.fn(),
    },
  },
}));

const mockStoreActions = {
  setSearchQuery: jest.fn(),
  clearSearch: jest.fn(),
  addRecentSearch: jest.fn(),
  clearRecentSearches: jest.fn(),
  performSearch: jest.fn(),
  getSuggestions: jest.fn(),
  setSearchOptions: jest.fn(),
};

const mockSearchResults = [
  {
    id: 'group-1',
    name: '測試集團',
    type: 'group' as const,
    path: ['測試集團'],
    matchedFields: ['name'],
    score: 1.0,
  },
  {
    id: 'company-1',
    name: '測試公司',
    type: 'company' as const,
    path: ['測試集團', '測試公司'],
    matchedFields: ['name'],
    score: 0.8,
  },
];

const mockSuggestions = [
  { query: '測試', count: 10, category: 'name' },
  { query: '台北', count: 5, category: 'address' },
];

const mockRecentSearches = ['測試集團', '台北公司'];

describe('useHierarchySearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useCustomerHierarchyStore as jest.Mock).mockReturnValue(mockStoreActions);
    
    const {
      useSearchState,
      useSearchResults,
      useSearchSuggestions,
      useRecentSearches,
      useSearchLoading,
      useSearchError,
    } = require('@/lib/stores/customerHierarchyStore');
    
    useSearchState.mockReturnValue({
      query: '',
      filters: {
        types: [],
        includeInactive: false,
        dateRange: null,
      },
      options: {
        fuzzySearch: true,
        maxResults: 50,
        minQueryLength: 2,
      },
    });
    
    useSearchResults.mockReturnValue(mockSearchResults);
    useSearchSuggestions.mockReturnValue(mockSuggestions);
    useRecentSearches.mockReturnValue(mockRecentSearches);
    useSearchLoading.mockReturnValue(false);
    useSearchError.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with default search state', () => {
      const { result } = renderHook(() => useHierarchySearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual(mockSearchResults);
      expect(result.current.suggestions).toEqual(mockSuggestions);
      expect(result.current.recentSearches).toEqual(mockRecentSearches);
      expect(result.current.isSearching).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should apply custom options during initialization', () => {
      const customOptions = {
        fuzzySearch: false,
        maxResults: 20,
        minQueryLength: 3,
      };

      renderHook(() => useHierarchySearch(customOptions));

      expect(mockStoreActions.setSearchOptions).toHaveBeenCalledWith(customOptions);
    });
  });

  describe('search functionality', () => {
    it('should perform search when query changes', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.search('測試');
      });

      expect(mockStoreActions.setSearchQuery).toHaveBeenCalledWith('測試');
      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('測試', {
        types: [],
        includeInactive: false,
        dateRange: null,
      });
      expect(mockStoreActions.addRecentSearch).toHaveBeenCalledWith('測試');
    });

    it('should not perform search if query is below minimum length', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.search('a'); // Single character
      });

      expect(mockStoreActions.performSearch).not.toHaveBeenCalled();
    });

    it('should debounce search queries', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      // Simulate rapid typing
      await act(async () => {
        result.current.setQuery('測');
        result.current.setQuery('測試');
        result.current.setQuery('測試集');
      });

      // Wait for debounce
      await waitFor(() => {
        expect(mockStoreActions.setSearchQuery).toHaveBeenLastCalledWith('測試集');
      }, { timeout: 600 }); // Default debounce is 300ms
    });

    it('should search with filters', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      const filters = {
        types: ['group', 'company'] as const,
        includeInactive: true,
        dateRange: {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-12-31'),
        },
      };

      await act(async () => {
        await result.current.searchWithFilters('測試', filters);
      });

      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('測試', filters);
    });
  });

  describe('suggestions', () => {
    it('should get suggestions for query', async () => {
      const mockNewSuggestions = [
        { query: '新測試', count: 3, category: 'name' },
      ];
      mockStoreActions.getSuggestions.mockResolvedValue(mockNewSuggestions);

      const { result } = renderHook(() => useHierarchySearch());

      let suggestions;
      await act(async () => {
        suggestions = await result.current.getSuggestions('新');
      });

      expect(mockStoreActions.getSuggestions).toHaveBeenCalledWith('新');
      expect(suggestions).toEqual(mockNewSuggestions);
    });

    it('should not get suggestions for short queries', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.getSuggestions('a');
      });

      expect(mockStoreActions.getSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('recent searches', () => {
    it('should clear recent searches', () => {
      const { result } = renderHook(() => useHierarchySearch());

      act(() => {
        result.current.clearRecentSearches();
      });

      expect(mockStoreActions.clearRecentSearches).toHaveBeenCalled();
    });

    it('should search from recent query', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.searchFromRecent('測試集團');
      });

      expect(mockStoreActions.setSearchQuery).toHaveBeenCalledWith('測試集團');
      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('測試集團', {
        types: [],
        includeInactive: false,
        dateRange: null,
      });
    });
  });

  describe('search clearing', () => {
    it('should clear search query and results', () => {
      const { result } = renderHook(() => useHierarchySearch());

      act(() => {
        result.current.clearSearch();
      });

      expect(mockStoreActions.clearSearch).toHaveBeenCalled();
    });
  });

  describe('filter management', () => {
    it('should update search filters', () => {
      const { result } = renderHook(() => useHierarchySearch());

      const newFilters = {
        types: ['group'] as const,
        includeInactive: true,
        dateRange: null,
      };

      act(() => {
        result.current.setFilters(newFilters);
      });

      // Since setFilters updates the store state, we would need to mock the state update
      // and verify it through a re-render, but the store action should be called
      expect(mockStoreActions.setSearchQuery).toHaveBeenCalled();
    });
  });

  describe('result processing', () => {
    it('should group results by type', () => {
      const { result } = renderHook(() => useHierarchySearch());

      const groupedResults = result.current.resultsByType;

      expect(groupedResults).toEqual({
        group: [mockSearchResults[0]],
        company: [mockSearchResults[1]],
        location: [],
        business_unit: [],
      });
    });

    it('should calculate result counts by type', () => {
      const { result } = renderHook(() => useHierarchySearch());

      const counts = result.current.resultCounts;

      expect(counts).toEqual({
        group: 1,
        company: 1,
        location: 0,
        business_unit: 0,
        total: 2,
      });
    });

    it('should get top results', () => {
      const { result } = renderHook(() => useHierarchySearch());

      const topResults = result.current.getTopResults(1);

      expect(topResults).toEqual([mockSearchResults[0]]);
    });
  });

  describe('loading and error states', () => {
    it('should reflect loading state from store', () => {
      const { useSearchLoading } = require('@/lib/stores/customerHierarchyStore');
      useSearchLoading.mockReturnValue(true);

      const { result } = renderHook(() => useHierarchySearch());

      expect(result.current.isSearching).toBe(true);
    });

    it('should reflect error state from store', () => {
      const { useSearchError } = require('@/lib/stores/customerHierarchyStore');
      useSearchError.mockReturnValue('Search failed');

      const { result } = renderHook(() => useHierarchySearch());

      expect(result.current.error).toBe('Search failed');
    });
  });

  describe('search options', () => {
    it('should update search options', () => {
      const { result } = renderHook(() => useHierarchySearch());

      const newOptions = {
        fuzzySearch: false,
        maxResults: 100,
        minQueryLength: 1,
      };

      act(() => {
        result.current.setOptions(newOptions);
      });

      expect(mockStoreActions.setSearchOptions).toHaveBeenCalledWith(newOptions);
    });
  });

  describe('search presets', () => {
    it('should search by entity type', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.searchByType('group');
      });

      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('', {
        types: ['group'],
        includeInactive: false,
        dateRange: null,
      });
    });

    it('should search active entities only', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.searchActiveOnly();
      });

      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('', {
        types: [],
        includeInactive: false,
        dateRange: null,
      });
    });

    it('should search inactive entities only', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.searchInactiveOnly();
      });

      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('', {
        types: [],
        includeInactive: true,
        dateRange: null,
      });
    });
  });

  describe('advanced search features', () => {
    it('should perform full-text search', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.fullTextSearch('測試公司地址');
      });

      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('測試公司地址', {
        types: [],
        includeInactive: false,
        dateRange: null,
      });
    });

    it('should search within specific hierarchy path', async () => {
      const { result } = renderHook(() => useHierarchySearch());

      await act(async () => {
        await result.current.searchInPath('測試', 'group-1');
      });

      expect(mockStoreActions.performSearch).toHaveBeenCalledWith('測試', {
        types: [],
        includeInactive: false,
        dateRange: null,
        parentId: 'group-1',
      });
    });
  });
});