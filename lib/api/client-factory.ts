/**
 * 井然 Orderly - API 客戶端工廠
 *
 * 提供統一的 API 客戶端建立模式，自動處理：
 * - 認證 Token
 * - Correlation ID
 * - 錯誤處理
 * - 請求/回應攔截
 *
 * @example
 * const ordersApi = createApiClient('/api/orders')
 * const orders = await ordersApi.get<Order[]>('/list')
 *
 * @example
 * const productsApi = createApiClient('https://api.example.com/products', {
 *   getAuthToken: () => localStorage.getItem('token'),
 *   onError: (error) => console.error(error),
 * })
 */

import { v4 as uuidv4 } from 'uuid'
import { http, buildQueryString, HttpOptions } from './http'

// ==================== Types ====================

export interface ApiClientOptions {
  /**
   * 取得認證 Token 的函數
   * 如果提供，會自動添加到每個請求的 Authorization header
   */
  getAuthToken?: () => string | null | undefined

  /**
   * 是否自動添加 Correlation ID
   * @default true
   */
  includeCorrelationId?: boolean

  /**
   * 請求前的攔截器
   */
  onRequest?: (path: string, init: RequestInit) => RequestInit | Promise<RequestInit>

  /**
   * 回應後的攔截器
   */
  onResponse?: <T>(response: T, path: string) => T | Promise<T>

  /**
   * 錯誤處理函數
   */
  onError?: (error: ApiError, path: string) => void

  /**
   * 預設的請求選項
   */
  defaultOptions?: HttpOptions
}

export interface ApiError {
  status: number
  statusText: string
  message: string
  path: string
  correlationId?: string
}

export interface ApiClient {
  /**
   * GET 請求
   */
  get: <T>(path: string, params?: Record<string, unknown>) => Promise<T>

  /**
   * POST 請求
   */
  post: <T>(path: string, body?: unknown) => Promise<T>

  /**
   * PUT 請求
   */
  put: <T>(path: string, body?: unknown) => Promise<T>

  /**
   * PATCH 請求
   */
  patch: <T>(path: string, body?: unknown) => Promise<T>

  /**
   * DELETE 請求
   */
  delete: <T>(path: string) => Promise<T>

  /**
   * 通用請求方法
   */
  request: <T>(path: string, init?: RequestInit) => Promise<T>
}

// ==================== Implementation ====================

/**
 * 建立 API 客戶端
 *
 * @param baseUrl - API 基礎 URL
 * @param options - 客戶端選項
 * @returns API 客戶端實例
 *
 * @example
 * // 基本用法
 * const api = createApiClient('/api/orders')
 * const orders = await api.get<Order[]>('/list')
 *
 * @example
 * // 帶認證
 * const api = createApiClient('/api/orders', {
 *   getAuthToken: () => sessionStorage.getItem('accessToken'),
 * })
 *
 * @example
 * // 帶錯誤處理
 * const api = createApiClient('/api/orders', {
 *   onError: (error) => {
 *     if (error.status === 401) {
 *       // 重新導向登入頁
 *     }
 *   },
 * })
 */
export function createApiClient(baseUrl: string, options: ApiClientOptions = {}): ApiClient {
  const {
    getAuthToken,
    includeCorrelationId = true,
    onRequest,
    onResponse,
    onError,
    defaultOptions = {},
  } = options

  /**
   * 建構請求 headers
   */
  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {}

    // 添加認證 Token
    if (getAuthToken) {
      const token = getAuthToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    // 添加 Correlation ID
    if (includeCorrelationId) {
      headers['X-Correlation-ID'] = uuidv4()
    }

    return headers
  }

  /**
   * 執行請求
   */
  const executeRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const correlationId = includeCorrelationId ? uuidv4() : undefined

    // 合併 headers
    const headers = {
      ...buildHeaders(),
      ...((init.headers as Record<string, string>) || {}),
    }

    if (correlationId) {
      headers['X-Correlation-ID'] = correlationId
    }

    let requestInit: RequestInit = {
      ...init,
      headers,
    }

    // 應用請求攔截器
    if (onRequest) {
      requestInit = await onRequest(path, requestInit)
    }

    const httpOptions: HttpOptions = {
      ...defaultOptions,
      baseUrl,
      headers,
    }

    try {
      let response = await http.request<T>(path, requestInit, httpOptions)

      // 應用回應攔截器
      if (onResponse) {
        response = await onResponse(response, path)
      }

      return response
    } catch (error) {
      // 建構 ApiError
      const apiError: ApiError = {
        status: 0,
        statusText: 'Unknown Error',
        message: error instanceof Error ? error.message : String(error),
        path: `${baseUrl}${path}`,
        correlationId,
      }

      // 嘗試從錯誤訊息中提取 HTTP 狀態碼
      if (error instanceof Error) {
        const match = error.message.match(/HTTP (\d+) ([^:]+)/)
        if (match) {
          apiError.status = parseInt(match[1], 10)
          apiError.statusText = match[2]
        }
      }

      // 呼叫錯誤處理函數
      if (onError) {
        onError(apiError, path)
      }

      throw apiError
    }
  }

  return {
    get: <T>(path: string, params?: Record<string, unknown>) => {
      const queryString = buildQueryString(params)
      return executeRequest<T>(`${path}${queryString}`, { method: 'GET' })
    },

    post: <T>(path: string, body?: unknown) =>
      executeRequest<T>(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),

    put: <T>(path: string, body?: unknown) =>
      executeRequest<T>(path, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      }),

    patch: <T>(path: string, body?: unknown) =>
      executeRequest<T>(path, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      }),

    delete: <T>(path: string) => executeRequest<T>(path, { method: 'DELETE' }),

    request: executeRequest,
  }
}

// ==================== Pre-configured Clients ====================

/**
 * 取得認證 Token（從 sessionStorage）
 */
const getSessionToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('accessToken')
}

/**
 * 預設的錯誤處理
 */
const defaultErrorHandler = (error: ApiError, _path: string): void => {
  // 可以在這裡添加全域錯誤處理邏輯
  // 例如：401 時重新導向登入頁
  if (error.status === 401) {
    // window.location.href = '/login'
  }

  console.error(`[API Error] ${error.path}:`, error.message)
}

/**
 * 預配置的 BFF API 客戶端
 * 用於前端到 BFF 的請求
 */
export const bffApi = createApiClient('/api/bff', {
  getAuthToken: getSessionToken,
  onError: defaultErrorHandler,
})

/**
 * 預配置的 V2 API 客戶端
 * 用於前端到 V2 API 的請求
 */
export const v2Api = createApiClient('/api/bff/v2', {
  getAuthToken: getSessionToken,
  onError: defaultErrorHandler,
})

// 重新導出 buildQueryString 以便使用
export { buildQueryString } from './http'
