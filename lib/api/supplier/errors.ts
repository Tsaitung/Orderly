/**
 * Unified Supplier API Error Classes
 *
 * Consolidates SupplierApiError and InvitationApiError into a single error hierarchy
 */

/**
 * Base error class for all supplier-related API errors
 */
export class SupplierError extends Error {
  public readonly status: number
  public readonly errorCode: string
  public readonly details?: Record<string, unknown>

  constructor(
    message: string,
    status: number,
    errorCode: string = 'UNKNOWN_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SupplierError'
    this.status = status
    this.errorCode = errorCode
    this.details = details
  }
}

/**
 * Error codes for supplier API operations
 */
export const SupplierErrorCode = {
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Invitation errors
  INVALID_INVITATION: 'INVALID_INVITATION',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  DUPLICATE_TAX_ID: 'DUPLICATE_TAX_ID',
  INVALID_TAX_ID: 'INVALID_TAX_ID',

  // Auth errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Operation errors
  IMPORT_ERROR: 'IMPORT_ERROR',
  EXPORT_ERROR: 'EXPORT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const

export type SupplierErrorCodeType = (typeof SupplierErrorCode)[keyof typeof SupplierErrorCode]

/**
 * Wrap unknown error into SupplierError
 */
export function wrapError(error: unknown): SupplierError {
  if (error instanceof SupplierError) {
    return error
  }

  if (error instanceof Error) {
    const match = error.message.match(/HTTP (\d+)/)
    const status = match ? parseInt(match[1], 10) : 0
    return new SupplierError(error.message, status, SupplierErrorCode.API_ERROR)
  }

  return new SupplierError('Network error occurred', 0, SupplierErrorCode.NETWORK_ERROR)
}

/**
 * Type guard to check if error is a SupplierError
 */
export function isSupplierError(error: unknown): error is SupplierError {
  return error instanceof SupplierError
}

/**
 * Get user-friendly error message in Traditional Chinese
 */
export function getErrorMessage(error: unknown): string {
  if (isSupplierError(error)) {
    switch (error.errorCode) {
      case SupplierErrorCode.INVALID_INVITATION:
        return '邀請代碼無效或已過期'
      case SupplierErrorCode.INVITATION_EXPIRED:
        return '邀請已過期'
      case SupplierErrorCode.DUPLICATE_TAX_ID:
        return '此統一編號已被使用'
      case SupplierErrorCode.INVALID_TAX_ID:
        return '統一編號格式不正確'
      case SupplierErrorCode.UNAUTHORIZED:
        return '請重新登入'
      case SupplierErrorCode.FORBIDDEN:
        return '您沒有權限執行此操作'
      case SupplierErrorCode.NOT_FOUND:
        return '找不到請求的資源'
      case SupplierErrorCode.NETWORK_ERROR:
        return '網路連線錯誤，請稍後再試'
      case SupplierErrorCode.IMPORT_ERROR:
        return '匯入失敗'
      case SupplierErrorCode.EXPORT_ERROR:
        return '匯出失敗'
      case SupplierErrorCode.VALIDATION_ERROR:
        return '資料驗證失敗'
      default:
        return error.message || '發生未知錯誤'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return '發生未知錯誤'
}

/**
 * Retry API request with exponential backoff
 */
export async function retryRequest<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      lastError = error as Error

      // Don't retry client errors (4xx)
      if (isSupplierError(error) && error.status >= 400 && error.status < 500) {
        throw error
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

// Legacy exports for backward compatibility
export { SupplierError as SupplierApiError }
export { SupplierError as InvitationApiError }
