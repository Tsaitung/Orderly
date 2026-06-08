/**
 * Authentication Service
 * Handles all API calls related to authentication
 */

import { SecureStorage } from '@/lib/secure-storage'
import { AuthValidation, type LoginFormData } from '@/lib/validation/auth-schemas'
import type {
  User,
  Organization,
  LoginResult,
  LoginApiResponse,
  OrganizationsApiResponse,
} from '../types'

/**
 * Safe execution wrapper for non-critical operations
 * Supports both sync and async functions
 */
export async function safeExecute<T>(
  fn: (() => T) | (() => Promise<T>),
  fallback: T,
  label: string
): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn(`AuthService: ${label} failed:`, e)
    return fallback
  }
}

/**
 * Perform login with credentials
 */
export async function performLogin(credentials: LoginFormData): Promise<LoginResult> {
  // Validate input
  const validation = AuthValidation.validateLogin(credentials)
  if (!validation.success) {
    const firstError = Object.values(validation.errors)[0]
    return { success: false, error: firstError }
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: validation.data.email,
        password: validation.data.password,
        rememberMe: validation.data.rememberMe,
      }),
    })

    const data: LoginApiResponse = await response.json()

    if (response.ok && data.success) {
      // Store tokens securely
      SecureStorage.setTokens({
        token: 'session_cookie',
        refreshToken: undefined,
        userId: data.user.id,
        email: data.user.email,
        role: data.user.role,
        organizationId: data.user.organization.id,
        organizationType: data.user.organization.type,
        rememberMe: validation.data.rememberMe,
        expiresIn: 7 * 24 * 60 * 60 * 1000,
      })

      return { success: true }
    }

    return { success: false, error: data.message || '登入失敗' }
  } catch (error) {
    console.error('Login failed:', error)
    return { success: false, error: '網路錯誤，請稍後再試' }
  }
}

/**
 * Build user object from login response
 */
export function buildUserFromResponse(data: LoginApiResponse): User {
  return {
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
    organizationId: data.user.organization.id,
    name: data.user.name || data.user.email.split('@')[0],
    isActive: true,
  }
}

/**
 * Build user object from stored token data
 */
export function buildUserFromStoredData(storedData: {
  userId: string
  email: string
  role: string
  organizationId: string
}): User {
  return {
    id: storedData.userId,
    email: storedData.email,
    role: storedData.role as User['role'],
    organizationId: storedData.organizationId,
    name: storedData.email.split('@')[0] || 'User',
    avatar: '/avatars/default.png',
    isActive: true,
  }
}

/**
 * Perform logout
 */
export async function performLogout(): Promise<void> {
  await safeExecute(
    () => fetch('/api/auth/logout', { method: 'POST' }),
    undefined,
    'logout API call'
  )
  SecureStorage.clearTokens()
}

/**
 * Fetch all organizations (for platform admin)
 */
export async function fetchOrganizations(): Promise<Organization[]> {
  try {
    const response = await fetch('/api/bff/v1/organizations')
    if (!response.ok) {
      throw new Error('Failed to fetch organizations')
    }
    const data: OrganizationsApiResponse = await response.json()

    return data.organizations.map(org => ({
      id: org.id,
      name: org.name,
      type: org.type as 'restaurant' | 'supplier',
      isActive: org.isActive,
    }))
  } catch (error) {
    console.error('Failed to load organizations:', error)
    return []
  }
}

/**
 * Fetch user's organization
 */
export async function fetchUserOrganization(organizationId: string): Promise<Organization> {
  // Mock organization data - in production, fetch from API
  return {
    id: organizationId,
    name: '用戶組織',
    type: 'restaurant',
    isActive: true,
  }
}

/**
 * Create staging admin mock user
 */
export function createStagingAdminUser(): User {
  return {
    id: 'platform-admin-staging',
    email: 'admin@staging.orderly.com',
    role: 'platform_admin',
    organizationId: 'platform',
    name: '平台管理員 (Staging)',
    avatar: '/avatars/admin.png',
    isActive: true,
  }
}

/**
 * Setup staging admin session
 */
export async function setupStagingAdminSession(): Promise<void> {
  await safeExecute(() => SecureStorage.clearTokens(), undefined, 'clear tokens')

  await safeExecute(
    () =>
      SecureStorage.setTokens({
        token: 'staging-mock-token',
        userId: 'platform-admin-staging',
        email: 'admin@staging.orderly.com',
        role: 'platform_admin',
        organizationId: 'platform',
        organizationType: 'supplier',
        rememberMe: true,
      }),
    undefined,
    'set tokens'
  )

  await safeExecute(
    () => {
      document.cookie = 'orderly_session=staging-admin-session; path=/; max-age=86400; SameSite=Lax'
    },
    undefined,
    'set cookie'
  )

  await safeExecute(
    () => localStorage.setItem('staging_admin', 'true'),
    undefined,
    'set localStorage'
  )
}

/**
 * Check if current environment is staging
 */
export function isStagingenvironment(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname.includes('staging')
}

/**
 * Check if staging admin mode is active
 */
export function isStagingAdminActive(): boolean {
  if (typeof window === 'undefined') return false
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('admin') === 'staging' || localStorage.getItem('staging_admin') === 'true'
}
