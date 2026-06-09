/**
 * Auth Form Utilities
 * Shared form handling utilities for authentication pages
 */

import { SecureStorage } from '@/lib/secure-storage'
import { AUTH_ROUTES } from './constants'
import type { FormErrors } from './validation'

/**
 * Create form field update handler
 * Clears the error for the field when the user starts typing
 */
export function createFieldUpdater<T extends Record<string, unknown>>(
  setForm: React.Dispatch<React.SetStateAction<T>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>
): (field: keyof T, value: T[keyof T]) => void {
  return (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => {
      if (prev[field as keyof FormErrors]) {
        const newErrors = { ...prev }
        delete newErrors[field as keyof FormErrors]
        return newErrors
      }
      return prev
    })
  }
}

/**
 * Determine redirect path based on user role
 */
export function getRedirectPathForRole(role: string): string {
  if (role === 'platform_admin') {
    return AUTH_ROUTES.platform
  }
  if (role.startsWith('supplier_')) {
    return AUTH_ROUTES.supplier
  }
  if (role.startsWith('restaurant_')) {
    return AUTH_ROUTES.restaurant
  }
  return AUTH_ROUTES.dashboard
}

/**
 * Get redirect path from stored session
 */
export function getRedirectPathFromSession(): string {
  const storedData = SecureStorage.getTokens()
  if (!storedData) {
    return AUTH_ROUTES.dashboard
  }
  return getRedirectPathForRole(storedData.role)
}

/**
 * Check if running in staging environment
 */
export function isStaging(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('staging')
}

/**
 * Execute staging admin quick login
 */
export function executeStagingAdminLogin(): void {
  console.log('Starting staging admin login process')

  // Clear all old data to avoid conflicts
  localStorage.clear()
  sessionStorage.clear()

  // Clear all cookies
  document.cookie.split(';').forEach(cookie => {
    document.cookie = cookie
      .replace(/^ +/, '')
      .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
  })

  // Set staging admin marker
  localStorage.setItem('staging_admin', 'true')

  console.log('Redirecting to staging admin login')
  // Redirect to home and trigger AuthContext logic
  window.location.href = '/?admin=staging'
}

/**
 * Format MFA code input (digits only, max 6)
 */
export function formatMfaCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

/**
 * Create async form submission handler with loading state
 */
export function createSubmitHandler<T>(
  validateFn: () => boolean,
  submitFn: () => Promise<T>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>,
  errorMessage: string
): (e: React.FormEvent) => Promise<void> {
  return async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateFn()) return

    setIsLoading(true)
    try {
      await submitFn()
    } catch {
      setErrors({ submit: errorMessage })
    } finally {
      setIsLoading(false)
    }
  }
}

/**
 * Error banner props interface
 */
export interface ErrorBannerProps {
  message: string | undefined
  className?: string
}

/**
 * Check if there's a submit error to display
 */
export function hasSubmitError(errors: FormErrors): boolean {
  return Boolean(errors.submit)
}

/**
 * Get submit error message
 */
export function getSubmitError(errors: FormErrors): string | undefined {
  return errors.submit
}
