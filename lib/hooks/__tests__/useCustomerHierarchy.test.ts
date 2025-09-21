// ============================================================================
// useCustomerHierarchy Hook Tests
// ============================================================================

import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomerHierarchy } from '../useCustomerHierarchy';
import { useCustomerHierarchyStore } from '@/lib/stores/customerHierarchyStore';

// Mock the Zustand store
jest.mock('@/lib/stores/customerHierarchyStore', () => ({
  useCustomerHierarchyStore: jest.fn(),
  useHierarchyTree: jest.fn(),
  useHierarchyLoading: jest.fn(),
  useHierarchyErrors: jest.fn(),
  useSelectedNode: jest.fn(),
  useExpandedNodes: jest.fn(),
}));

// Mock the API
jest.mock('@/lib/api/customer-hierarchy', () => ({
  customerHierarchyApi: {
    hierarchy: {
      getTree: jest.fn(),
    },
    groups: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    companies: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    locations: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    businessUnits: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockStoreActions = {
  loadTree: jest.fn(),
  refreshTree: jest.fn(),
  selectNode: jest.fn(),
  expandNode: jest.fn(),
  collapseNode: jest.fn(),
  toggleNode: jest.fn(),
  createNode: jest.fn(),
  updateNode: jest.fn(),
  deleteNode: jest.fn(),
  findNode: jest.fn(),
  getNodePath: jest.fn(),
  getNodeChildren: jest.fn(),
  setCacheSettings: jest.fn(),
};

const mockHierarchyTree = [
  {
    id: 'group-1',
    name: '測試集團',
    type: 'group' as const,
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    children: [
      {
        id: 'company-1',
        name: '測試公司',
        type: 'company' as const,
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        children: [],
      },
    ],
  },
];

const mockLoadingState = {
  tree: false,
  search: false,
  entity: false,
  statistics: false,
  mutation: false,
};

const mockErrorState = {
  tree: null,
  search: null,
  entity: null,
  statistics: null,
  mutation: null,
};

describe('useCustomerHierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (useCustomerHierarchyStore as jest.Mock).mockReturnValue(mockStoreActions);
    
    const { useHierarchyTree, useHierarchyLoading, useHierarchyErrors, useSelectedNode, useExpandedNodes } = 
      require('@/lib/stores/customerHierarchyStore');
    
    useHierarchyTree.mockReturnValue(mockHierarchyTree);
    useHierarchyLoading.mockReturnValue(mockLoadingState);
    useHierarchyErrors.mockReturnValue(mockErrorState);
    useSelectedNode.mockReturnValue(null);
    useExpandedNodes.mockReturnValue(new Set());
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      expect(result.current.tree).toEqual(mockHierarchyTree);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.selectedNode).toBe(null);
      expect(result.current.expandedNodes).toEqual(new Set());
    });

    it('should call loadTree on mount when autoLoad is true', () => {
      renderHook(() => useCustomerHierarchy({ autoLoad: true }));

      expect(mockStoreActions.loadTree).toHaveBeenCalledWith({ includeInactive: false });
    });

    it('should not call loadTree on mount when autoLoad is false', () => {
      renderHook(() => useCustomerHierarchy({ autoLoad: false }));

      expect(mockStoreActions.loadTree).not.toHaveBeenCalled();
    });

    it('should set refresh interval settings', () => {
      const refreshInterval = 600000; // 10 minutes
      renderHook(() => useCustomerHierarchy({ refreshInterval }));

      expect(mockStoreActions.setCacheSettings).toHaveBeenCalledWith({ refreshInterval });
    });
  });

  describe('tree data processing', () => {
    it('should flatten tree data correctly', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      expect(result.current.flatNodes).toHaveLength(2);
      expect(result.current.flatNodes[0]).toEqual(
        expect.objectContaining({
          id: 'group-1',
          name: '測試集團',
          type: 'group',
          childrenCount: 1,
        })
      );
    });

    it('should calculate node counts by type', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      expect(result.current.nodeCountsByType).toEqual({
        group: 1,
        company: 1,
        location: 0,
        business_unit: 0,
      });
    });

    it('should calculate total nodes correctly', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      expect(result.current.totalNodes).toBe(2);
    });
  });

  describe('CRUD operations', () => {
    it('should create entity', async () => {
      mockStoreActions.createNode.mockResolvedValue({
        id: 'new-company',
        name: '新公司',
        type: 'company',
      });

      const { result } = renderHook(() => useCustomerHierarchy());

      await act(async () => {
        const entity = await result.current.createEntity('group-1', 'company', {
          name: '新公司',
        });
        expect(entity).toEqual(
          expect.objectContaining({
            id: 'new-company',
            name: '新公司',
            type: 'company',
          })
        );
      });

      expect(mockStoreActions.createNode).toHaveBeenCalledWith('group-1', 'company', {
        name: '新公司',
      });
    });

    it('should update entity', async () => {
      mockStoreActions.updateNode.mockResolvedValue({
        id: 'company-1',
        name: '更新公司',
        type: 'company',
      });

      const { result } = renderHook(() => useCustomerHierarchy());

      await act(async () => {
        const entity = await result.current.updateEntity('company-1', 'company', {
          name: '更新公司',
        });
        expect(entity).toEqual(
          expect.objectContaining({
            id: 'company-1',
            name: '更新公司',
            type: 'company',
          })
        );
      });

      expect(mockStoreActions.updateNode).toHaveBeenCalledWith('company-1', 'company', {
        name: '更新公司',
      });
    });

    it('should delete entity', async () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      await act(async () => {
        await result.current.deleteEntity('company-1', 'company');
      });

      expect(mockStoreActions.deleteNode).toHaveBeenCalledWith('company-1', 'company');
    });
  });

  describe('tree navigation', () => {
    it('should expand node', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      act(() => {
        result.current.expandNode('group-1');
      });

      expect(mockStoreActions.expandNode).toHaveBeenCalledWith('group-1');
    });

    it('should collapse node', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      act(() => {
        result.current.collapseNode('group-1');
      });

      expect(mockStoreActions.collapseNode).toHaveBeenCalledWith('group-1');
    });

    it('should toggle node', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      act(() => {
        result.current.toggleNode('group-1');
      });

      expect(mockStoreActions.toggleNode).toHaveBeenCalledWith('group-1');
    });

    it('should select node', () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      act(() => {
        result.current.selectNode('group-1');
      });

      expect(mockStoreActions.selectNode).toHaveBeenCalledWith('group-1');
    });
  });

  describe('utility functions', () => {
    it('should find node', () => {
      mockStoreActions.findNode.mockReturnValue(mockHierarchyTree[0]);

      const { result } = renderHook(() => useCustomerHierarchy());

      const foundNode = result.current.findNode('group-1');
      expect(foundNode).toEqual(mockHierarchyTree[0]);
      expect(mockStoreActions.findNode).toHaveBeenCalledWith('group-1');
    });

    it('should get node path', () => {
      const mockPath = [mockHierarchyTree[0], mockHierarchyTree[0].children[0]];
      mockStoreActions.getNodePath.mockReturnValue(mockPath);

      const { result } = renderHook(() => useCustomerHierarchy());

      const path = result.current.getNodePath('company-1');
      expect(path).toEqual(mockPath);
      expect(mockStoreActions.getNodePath).toHaveBeenCalledWith('company-1');
    });

    it('should get node children', () => {
      const mockChildren = mockHierarchyTree[0].children;
      mockStoreActions.getNodeChildren.mockReturnValue(mockChildren);

      const { result } = renderHook(() => useCustomerHierarchy());

      const children = result.current.getNodeChildren('group-1');
      expect(children).toEqual(mockChildren);
      expect(mockStoreActions.getNodeChildren).toHaveBeenCalledWith('group-1');
    });
  });

  describe('loading and error states', () => {
    it('should reflect loading state from store', () => {
      const { useHierarchyLoading } = require('@/lib/stores/customerHierarchyStore');
      useHierarchyLoading.mockReturnValue({ ...mockLoadingState, tree: true });

      const { result } = renderHook(() => useCustomerHierarchy());

      expect(result.current.isLoading).toBe(true);
    });

    it('should reflect error state from store', () => {
      const { useHierarchyErrors } = require('@/lib/stores/customerHierarchyStore');
      useHierarchyErrors.mockReturnValue({ ...mockErrorState, tree: 'Load failed' });

      const { result } = renderHook(() => useCustomerHierarchy());

      expect(result.current.error).toBe('Load failed');
    });
  });

  describe('refresh functionality', () => {
    it('should call refreshTree', async () => {
      const { result } = renderHook(() => useCustomerHierarchy());

      await act(async () => {
        await result.current.refreshTree();
      });

      expect(mockStoreActions.refreshTree).toHaveBeenCalled();
    });
  });
});