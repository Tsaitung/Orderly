import React from 'react'

export interface ProductStats {
  totalProducts: number
  activeProducts: number
  categoriesCount: number
  avgPrice: number
  productsWithSKUs?: number
  productsWithAllergenTracking?: number
  productsWithNutrition?: number
  categoryBreakdown?: Record<string, number>
  stateBreakdown?: Record<string, number>
  taxStatusBreakdown?: Record<string, number>
}

export interface Product {
  id: string
  name: string
  nameEn?: string
  code: string
  brand?: string
  description?: string
  categoryId?: string
  origin?: string
  productState: string
  taxStatus: string
  isActive: boolean
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductSearchParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  brand?: string
  origin?: string
  productState?: string
  taxStatus?: string
  isActive?: boolean
  isPublic?: boolean
  supplierId?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ProductSearchResponse {
  success: boolean
  data: {
    products: Product[]
    pagination: {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
    }
  }
}

// 產品統計 API 服務
export class ProductService {
  private static baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin + '/api/bff'
      : 'http://localhost:3000/api/bff'

  /**
   * 獲取產品統計資訊
   */
  static async getProductStats(supplierId?: string): Promise<ProductStats> {
    const url = new URL(`${this.baseUrl}/products/stats`)
    if (supplierId) {
      url.searchParams.append('supplierId', supplierId)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch product stats: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch product stats')
    }

    return result.data
  }

  /**
   * 搜尋產品
   */
  static async searchProducts(params: ProductSearchParams = {}): Promise<ProductSearchResponse> {
    const url = new URL(`${this.baseUrl}/products`)

    // 添加查詢參數
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to search products: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to search products')
    }

    return result
  }

  /**
   * 獲取產品詳情
   */
  static async getProductById(productId: string): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products/${productId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch product: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch product')
    }

    return result.data
  }

  /**
   * 獲取SKU統計資訊
   */
  static async getSKUStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/products/skus/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch SKU stats: ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch SKU stats')
    }

    return result.data
  }
}

// 實用工具函數
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Hook for React components
export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value)

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
