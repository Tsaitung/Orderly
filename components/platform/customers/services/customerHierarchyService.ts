// ============================================================================
// Customer Hierarchy V2 - API Service Layer
// ============================================================================
// Clean API abstraction without complex caching or state management

import type { 
  HierarchyNode, 
  SearchResult, 
  TreeResponse, 
  SearchResponse,
  UUID,
  HierarchyNodeType 
} from '../types';

class CustomerHierarchyService {
  // Prefer dedicated hierarchy base (can be '/api/bff/v2' or direct 'http://localhost:3007/api/v2')
  private baseUrl =
    process.env.NEXT_PUBLIC_CUSTOMER_HIERARCHY_API_URL ||
    '/api/bff';
  private requestMap = new Map<string, Promise<any>>();

  // Tree operations with request deduplication
  async getTree(options: { includeInactive?: boolean } = {}): Promise<HierarchyNode[]> {
    const params = new URLSearchParams();
    if (options.includeInactive) {
      params.append('include_inactive', 'true');
    }

    const qp = params.toString() ? `?${params}` : '';
    const path = this.baseUrl.endsWith('/v2')
      ? `/hierarchy/tree${qp}`
      : (this.baseUrl.endsWith('/bff')
          ? `/v2/hierarchy/tree${qp}`
          : `/api/v2/hierarchy/tree${qp}`);
    const url = `${this.baseUrl}${path}`;
    const requestKey = `getTree-${url}`;
    
    // Check for existing request
    if (this.requestMap.has(requestKey)) {
      return this.requestMap.get(requestKey)!;
    }
    
    const request = this.performTreeRequest(url, requestKey);
    this.requestMap.set(requestKey, request);
    
    return request;
  }
  
  private async performTreeRequest(url: string, requestKey: string): Promise<HierarchyNode[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch tree: ${response.statusText}`);
      }
      
      const data: TreeResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching tree:', error);
      throw new Error('Failed to load hierarchy tree');
    } finally {
      // Remove from map after completion
      this.requestMap.delete(requestKey);
    }
  }

  // Search operations with request deduplication
  async search(query: string, options: { limit?: number } = {}): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const params = new URLSearchParams({
      q: query.trim(),
      limit: (options.limit || 50).toString()
    });

    const path = this.baseUrl.endsWith('/v2')
      ? `/hierarchy/search?${params}`
      : (this.baseUrl.endsWith('/bff')
          ? `/v2/hierarchy/search?${params}`
          : `/api/v2/hierarchy/search?${params}`);
    const url = `${this.baseUrl}${path}`;
    const requestKey = `search-${url}`;
    
    // Check for existing request
    if (this.requestMap.has(requestKey)) {
      return this.requestMap.get(requestKey)!;
    }
    
    const request = this.performSearchRequest(url, requestKey);
    this.requestMap.set(requestKey, request);
    
    return request;
  }
  
  private async performSearchRequest(url: string, requestKey: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data: SearchResponse = await response.json();
      return data.results;
    } catch (error) {
      console.error('Error searching:', error);
      throw new Error('Search request failed');
    } finally {
      // Remove from map after completion
      this.requestMap.delete(requestKey);
    }
  }

  // Node operations
  async getNode(nodeId: UUID, nodeType: HierarchyNodeType): Promise<HierarchyNode> {
    const nodePath = this.baseUrl.endsWith('/v2')
      ? `/hierarchy/${nodeType}s/${nodeId}`
      : (this.baseUrl.endsWith('/bff')
          ? `/v2/hierarchy/${nodeType}s/${nodeId}`
          : `/api/v2/hierarchy/${nodeType}s/${nodeId}`);
    const url = `${this.baseUrl}${nodePath}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch node: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching node:', error);
      throw new Error(`Failed to load ${nodeType}`);
    }
  }

  async createNode(
    nodeType: HierarchyNodeType, 
    data: Partial<HierarchyNode>
  ): Promise<HierarchyNode> {
    const createPath = this.baseUrl.endsWith('/v2')
      ? `/hierarchy/${nodeType}s`
      : (this.baseUrl.endsWith('/bff')
          ? `/v2/hierarchy/${nodeType}s`
          : `/api/v2/hierarchy/${nodeType}s`);
    const url = `${this.baseUrl}${createPath}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create ${nodeType}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error creating node:', error);
      throw new Error(`Failed to create ${nodeType}`);
    }
  }

  async updateNode(
    nodeId: UUID,
    nodeType: HierarchyNodeType,
    data: Partial<HierarchyNode>
  ): Promise<HierarchyNode> {
    const updatePath = this.baseUrl.endsWith('/v2')
      ? `/hierarchy/${nodeType}s/${nodeId}`
      : (this.baseUrl.endsWith('/bff')
          ? `/v2/hierarchy/${nodeType}s/${nodeId}`
          : `/api/v2/hierarchy/${nodeType}s/${nodeId}`);
    const url = `${this.baseUrl}${updatePath}`;
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update ${nodeType}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating node:', error);
      throw new Error(`Failed to update ${nodeType}`);
    }
  }

  async deleteNode(nodeId: UUID, nodeType: HierarchyNodeType): Promise<void> {
    const deletePath = this.baseUrl.endsWith('/v2')
      ? `/hierarchy/${nodeType}s/${nodeId}`
      : (this.baseUrl.endsWith('/bff')
          ? `/v2/hierarchy/${nodeType}s/${nodeId}`
          : `/api/v2/hierarchy/${nodeType}s/${nodeId}`);
    const url = `${this.baseUrl}${deletePath}`;
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete ${nodeType}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting node:', error);
      throw new Error(`Failed to delete ${nodeType}`);
    }
  }

  // Utility methods
  findNodeInTree(tree: HierarchyNode[], nodeId: UUID): HierarchyNode | null {
    for (const node of tree) {
      if (node.id === nodeId) {
        return node;
      }
      if (node.children.length > 0) {
        const found = this.findNodeInTree(node.children, nodeId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  getNodePath(tree: HierarchyNode[], nodeId: UUID): HierarchyNode[] {
    const findPath = (nodes: HierarchyNode[], path: HierarchyNode[] = []): HierarchyNode[] | null => {
      for (const node of nodes) {
        const currentPath = [...path, node];
        if (node.id === nodeId) {
          return currentPath;
        }
        if (node.children.length > 0) {
          const found = findPath(node.children, currentPath);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    return findPath(tree) || [];
  }

  flattenTree(tree: HierarchyNode[]): HierarchyNode[] {
    const result: HierarchyNode[] = [];
    
    const flatten = (nodes: HierarchyNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children.length > 0) {
          flatten(node.children);
        }
      }
    };
    
    flatten(tree);
    return result;
  }
}

// Export singleton instance
export const customerHierarchyService = new CustomerHierarchyService();
