/**
 * SKU Service with caching and performance optimizations
 * 提供 SKU 相關的 API 呼叫服務，包含快取機制
 */

import React from 'react'

// Type definitions
interface SKUSearchResult {
  id: string
  code: string
  name: string
  nameEn: string
  isActive: boolean
  isPublic: boolean
  weight: number | null
  packageType: string
  variant: Record<string, any>
  product?: {
    id: string
    name: string
    code: string
  } | null
}

// Type definitions
interface BatchFilters {
  productId?: string
  supplierId?: string
  expiryDate?: string
  status?: string
  limit?: number
  offset?: number
}

interface BatchInfo {
  id: string
  productId: string
  batchNumber: string
  expiryDate: Date
  quantity: number
  status: string
}

interface CreateSKUData {
  productId: string
  skuCode: string
  variant: Record<string, string>
  unitPrice: number
}

interface UpdateSKUData {
  skuCode?: string
  variant?: Record<string, string>
  unitPrice?: number
  isActive?: boolean
}

// Simple in-memory cache implementation
class SimpleCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()

  set(key: string, data: unknown, ttlMs: number = 300000): void { // 預設 5 分鐘 TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear() {
    this.cache.clear()
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  // 清理過期項目
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// 全域快取實例
const cache = new SimpleCache()

// 定期清理過期快取項目
setInterval(() => cache.cleanup(), 60000) // 每分鐘清理一次

interface SKUSearchParams {
  search?: string
  packaging_type?: string
  quality_grade?: string
  processing_method?: string
  origin?: string
  is_active?: boolean
  min_price?: number
  max_price?: number
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

interface SupplierComparisonParams {
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  min_quantity?: number
}

interface PricingAnalysisParams {
  quantity: number
}

export class SKUService {
  private static baseUrl = typeof window !== 'undefined' 
    ? `${process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000'}/api/products`
    : 'http://localhost:8000/api/products'
  private static requestQueue = new Map<string, Promise<any>>()

  /**
   * 防止重複請求的裝飾器
   */
  private static dedupeRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key)!
    }

    const promise = requestFn()
      .finally(() => {
        this.requestQueue.delete(key)
      })

    this.requestQueue.set(key, promise)
    return promise
  }

  /**
   * 基礎 API 請求方法，包含錯誤處理和重試機制
   */
  private static async request<T>(
    url: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超時

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (retries > 0 && error instanceof Error) {
        // 網路錯誤或超時，進行重試
        if (error.name === 'AbortError' || error.message.includes('fetch')) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 等待 1 秒後重試
          return this.request<T>(url, options, retries - 1)
        }
      }
      
      throw error
    }
  }

  /**
   * 搜尋 SKU
   */
  static async searchSKUs(params: SKUSearchParams = {}): Promise<any> {
    const cacheKey = `skus:search:${JSON.stringify(params)}`
    
    // 檢查快取
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached as any
    }

    // 建構查詢參數
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const url = `${this.baseUrl}/skus/search?${searchParams.toString()}`
    
    return this.dedupeRequest(cacheKey, async () => {
      const result = await this.request<any>(url)
      
      // 快取結果（搜尋結果快取較短時間）
      cache.set(cacheKey, result, 120000) // 2 分鐘
      
      return result
    })
  }

  /**
   * 獲取 SKU 詳情
   */
  static async getSKUDetails(skuId: string): Promise<SKUSearchResult | null> {
    const cacheKey = `sku:${skuId}`
    
    // 檢查快取
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached as SKUSearchResult
    }

    const url = `${this.baseUrl}/skus/${skuId}`
    
    return this.dedupeRequest(cacheKey, async () => {
      const result = await this.request<SKUSearchResult>(url)
      
      // SKU 詳情快取較長時間
      cache.set(cacheKey, result, 600000) // 10 分鐘
      
      return result
    })
  }

  /**
   * 獲取供應商比較資料
   */
  static async getSupplierComparison(
    skuId: string, 
    params: SupplierComparisonParams = {}
  ) {
    const cacheKey = `suppliers:${skuId}:${JSON.stringify(params)}`
    
    // 檢查快取
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const url = `${this.baseUrl}/skus/${skuId}/suppliers/compare?${searchParams.toString()}`
    
    return this.dedupeRequest(cacheKey, async () => {
      const result = await this.request(url)
      
      // 供應商資料快取中等時間
      cache.set(cacheKey, result, 300000) // 5 分鐘
      
      return result
    })
  }

  /**
   * 獲取定價分析
   */
  static async getPricingAnalysis(
    skuId: string, 
    params: PricingAnalysisParams
  ) {
    const cacheKey = `pricing:${skuId}:${params.quantity}`
    
    // 檢查快取
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }

    const url = `${this.baseUrl}/skus/${skuId}/suppliers/pricing-analysis?quantity=${params.quantity}`
    
    return this.dedupeRequest(cacheKey, async () => {
      const result = await this.request(url)
      
      // 定價分析快取較短時間（價格可能變動）
      cache.set(cacheKey, result, 180000) // 3 分鐘
      
      return result
    })
  }

  /**
   * 獲取批次資料
   */
  static async getBatches(filters: BatchFilters = {}): Promise<BatchInfo[]> {
    const cacheKey = `batches:${JSON.stringify(filters)}`
    
    // 檢查快取
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached as BatchInfo[]
    }

    const searchParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const url = `${this.baseUrl}/skus/batches?${searchParams.toString()}`
    
    return this.dedupeRequest(cacheKey, async () => {
      const result = await this.request<BatchInfo[]>(url)
      
      // 批次資料快取較短時間
      cache.set(cacheKey, result, 60000) // 1 分鐘
      
      return result
    })
  }

  /**
   * 批量創建 SKU
   */
  static async batchCreateSKUs(productId: string, skus: CreateSKUData[]): Promise<SKUSearchResult[]> {
    const url = `${this.baseUrl}/products/${productId}/skus/batch`
    
    const result = await this.request<SKUSearchResult[]>(url, {
      method: 'POST',
      body: JSON.stringify({ skus })
    })

    // 創建後清理相關快取
    this.clearCacheByPattern('skus:')
    this.clearCacheByPattern(`product:${productId}`)
    
    return result
  }

  /**
   * 更新 SKU
   */
  static async updateSKU(skuId: string, data: UpdateSKUData): Promise<SKUSearchResult> {
    const url = `${this.baseUrl}/skus/${skuId}`
    
    const result = await this.request<SKUSearchResult>(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    })

    // 更新後清理相關快取
    this.clearCacheByPattern('skus:')
    cache.delete(`sku:${skuId}`)
    this.clearCacheByPattern(`suppliers:${skuId}`)
    this.clearCacheByPattern(`pricing:${skuId}`)
    
    return result
  }

  /**
   * 刪除 SKU
   */
  static async deleteSKU(skuId: string): Promise<boolean> {
    const url = `${this.baseUrl}/skus/${skuId}`
    
    const result = await this.request<boolean>(url, {
      method: 'DELETE'
    })

    // 刪除後清理相關快取
    this.clearCacheByPattern('skus:')
    cache.delete(`sku:${skuId}`)
    this.clearCacheByPattern(`suppliers:${skuId}`)
    this.clearCacheByPattern(`pricing:${skuId}`)
    
    return result
  }

  /**
   * 根據模式清理快取
   */
  private static clearCacheByPattern(pattern: string) {
    const keysToDelete: string[] = []
    
    // 注意：這個實作僅適用於我們的簡單快取
    // 在生產環境中，可能需要使用更專業的快取解決方案
    cache['cache'].forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => cache.delete(key))
  }

  /**
   * 清理所有快取
   */
  static clearAllCache() {
    cache.clear()
  }

  /**
   * 預載入常用資料
   */
  static async preloadCommonData() {
    try {
      // 預載入活躍 SKU 列表（不指定搜尋條件）
      await this.searchSKUs({ is_active: true, page_size: 20 })
      
      // 可以根據使用模式預載入其他常用資料
    } catch (error) {
      console.warn('預載入資料失敗:', error)
    }
  }
}

/**
 * 自定義 Hook：使用防抖的 SKU 搜尋
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 自定義 Hook：SKU 搜尋狀態管理
 */
export function useSKUSearch() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filters, setFilters] = React.useState<Partial<SKUSearchParams>>({})
  const [results, setResults] = React.useState<SKUSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  // Use ref to track if component is mounted to prevent memory leaks
  const mountedRef = React.useRef(true)
  
  React.useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])
  
  const search = React.useCallback(async () => {
    if (!debouncedSearchTerm && !Object.values(filters).some(v => v)) {
      if (mountedRef.current) {
        setResults([])
      }
      return
    }

    try {
      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }
      
      const searchParams: SKUSearchParams = {
        ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
        ...filters
      }
      
      const result = await SKUService.searchSKUs(searchParams)
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        setResults(result?.data || [])
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : '搜尋失敗')
        setResults([])
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [debouncedSearchTerm, filters])

  React.useEffect(() => {
    search()
  }, [search])

  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    results,
    loading,
    error,
    refresh: search
  }
}

// 匯出給其他模組使用
export { cache as SKUCache }