/**
 * Shared Utility Functions and Hooks for Supplier API
 */

import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { getErrorMessage } from './errors'

// ============================================================================
// Hook Types
// ============================================================================

export interface UseAsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  mutate: (newData: T | null) => void
}

export interface UseAsyncMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
  successMessage?: string
  errorMessage?: string
}

export interface UseAsyncMutation<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  data: TData | null
  loading: boolean
  error: string | null
  reset: () => void
}

// ============================================================================
// Generic Async State Hook
// ============================================================================

/**
 * Generic async state hook with error handling
 *
 * @param asyncFunction - The async function to execute
 * @param dependencies - Dependencies array for re-fetching
 * @param immediate - Whether to execute immediately on mount
 */
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  dependencies: unknown[] = [],
  immediate: boolean = true
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(immediate)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await asyncFunction()
      setData(result)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      setError(errorMessage)
      console.error('Async operation failed:', err)
    } finally {
      setLoading(false)
    }
  }, [asyncFunction])

  // Execute on mount and when dependencies change
  // Note: Using useEffect in the actual hook implementations
  // This base hook provides the state management

  const mutate = useCallback((newData: T | null) => {
    setData(newData)
  }, [])

  return {
    data,
    loading,
    error,
    refetch: execute,
    mutate,
  }
}

// ============================================================================
// Generic Mutation Hook
// ============================================================================

/**
 * Generic mutation hook with error handling and success notifications
 *
 * @param mutationFunction - The mutation function to execute
 * @param options - Configuration options
 */
export function useAsyncMutation<TData, TVariables>(
  mutationFunction: (variables: TVariables) => Promise<TData>,
  options: UseAsyncMutationOptions<TData, TVariables> = {}
): UseAsyncMutation<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      try {
        setLoading(true)
        setError(null)

        const result = await mutationFunction(variables)
        setData(result)

        if (options.successMessage) {
          toast.success(options.successMessage)
        }

        options.onSuccess?.(result, variables)
        return result
      } catch (err) {
        const errorMessage = options.errorMessage || getErrorMessage(err)
        setError(errorMessage)
        toast.error(errorMessage)
        options.onError?.(err as Error, variables)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [mutationFunction, options]
  )

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    mutate,
    data,
    loading,
    error,
    reset,
  }
}

// ============================================================================
// File Handling Utilities
// ============================================================================

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type)
}

/**
 * File type constants
 */
export const FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  document: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
} as const

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

// ============================================================================
// Pagination Utilities
// ============================================================================

export interface PaginationInfo {
  total_count: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_previous: boolean
}

/**
 * Create pagination info from response data
 */
export function extractPaginationInfo<T extends Partial<PaginationInfo>>(
  data: T | null
): PaginationInfo | null {
  if (!data) {return null}

  return {
    total_count: data.total_count ?? 0,
    page: data.page ?? 1,
    page_size: data.page_size ?? 20,
    total_pages: data.total_pages ?? 1,
    has_next: data.has_next ?? false,
    has_previous: data.has_previous ?? false,
  }
}

// ============================================================================
// Date Utilities
// ============================================================================

/**
 * Format date for API queries (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format date for display (localized)
 */
export function formatDateForDisplay(dateString: string, locale: string = 'zh-TW'): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format datetime for display (localized)
 */
export function formatDateTimeForDisplay(dateString: string, locale: string = 'zh-TW'): string {
  const date = new Date(dateString)
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============================================================================
// Currency Utilities
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'TWD',
  locale: string = 'zh-TW'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================================================
// Debounce Utility
// ============================================================================

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {clearTimeout(timeout)}
    timeout = setTimeout(() => func(...args), wait)
  }
}
