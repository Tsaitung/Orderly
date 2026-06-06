/**
 * Auth Provider Component
 * Manages authentication state and provides context to children
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { SecureStorage } from '@/lib/secure-storage'
import type { LoginFormData } from '@/lib/validation/auth-schemas'
import { AuthContext } from './AuthContext'
import type {
  User,
  Organization,
  ViewMode,
  AuthContextType,
  AuthProviderProps,
  CurrentRole,
  LoginResult,
} from './types'
import {
  safeExecute,
  performLogin,
  performLogout,
  buildUserFromResponse,
  buildUserFromStoredData,
  fetchOrganizations,
  fetchUserOrganization,
  createStagingAdminUser,
  setupStagingAdminSession,
  isStagingenvironment,
  isStagingAdminActive,
} from './services/auth-service'

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>({ isViewingAs: false })

  // Load organizations for platform admin
  const loadOrganizations = useCallback(async (): Promise<void> => {
    const orgs = await fetchOrganizations()
    setOrganizations(orgs)
  }, [])

  // Load user's organization
  const loadUserOrganization = useCallback(async (organizationId: string): Promise<void> => {
    const org = await fetchUserOrganization(organizationId)
    setCurrentOrganization(org)
  }, [])

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async (): Promise<void> => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }

        // Staging environment: priority check for super admin login
        if (isStagingenvironment() && isStagingAdminActive()) {
          console.log('Staging: Creating super admin user (priority check)')

          await setupStagingAdminSession()

          const mockUser = createStagingAdminUser()
          setUser(mockUser)
          setIsAuthenticated(true)

          await safeExecute(loadOrganizations, undefined, 'load organizations')
          setIsLoading(false)
          console.log('Staging admin initialization complete')
          return
        }

        // Check normal stored token
        const storedData = await safeExecute(() => SecureStorage.getTokens(), null, 'get tokens')
        if (!storedData) {
          setIsLoading(false)
          return
        }

        // Create user from stored secure data
        const restoredUser = buildUserFromStoredData(storedData)
        setUser(restoredUser)
        setIsAuthenticated(true)

        // Token refresh check (skipped during development)
        try {
          if (SecureStorage.willExpireSoon()) {
            console.log('Token refresh skipped during development')
          }
        } catch {
          // Ignore refresh errors
        }

        // Load organizations based on role
        if (restoredUser.role === 'platform_admin') {
          await loadOrganizations()
        } else {
          await loadUserOrganization(restoredUser.organizationId)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        await safeExecute(() => SecureStorage.clearTokens(), undefined, 'clear tokens after error')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [loadOrganizations, loadUserOrganization])

  // Login handler
  const login = useCallback(
    async (credentials: LoginFormData): Promise<LoginResult> => {
      setIsLoading(true)
      try {
        const result = await performLogin(credentials)

        if (result.success) {
          // Refetch tokens to get user data
          const storedData = SecureStorage.getTokens()
          if (storedData) {
            const newUser = buildUserFromStoredData(storedData)
            setUser(newUser)
            setIsAuthenticated(true)

            if (newUser.role === 'platform_admin') {
              await loadOrganizations()
            } else {
              await loadUserOrganization(newUser.organizationId)
            }
          }
        }

        return result
      } finally {
        setIsLoading(false)
      }
    },
    [loadOrganizations, loadUserOrganization]
  )

  // Logout handler
  const logout = useCallback((): void => {
    performLogout()
    setUser(null)
    setIsAuthenticated(false)
    setCurrentOrganization(null)
    setOrganizations([])
    setViewMode({ isViewingAs: false })
  }, [])

  // Switch to organization view (super user function)
  const switchToOrganizationView = useCallback(
    async (organizationId: string): Promise<boolean> => {
      if (user?.role !== 'platform_admin') {
        return false
      }

      const targetOrg = organizations.find(org => org.id === organizationId)
      if (!targetOrg) {
        return false
      }

      setViewMode({
        isViewingAs: true,
        targetOrganizationId: organizationId,
        targetRole: targetOrg.type,
        originalPath: window.location.pathname,
      })
      setCurrentOrganization(targetOrg)
      return true
    },
    [user, organizations]
  )

  // Exit view mode
  const exitViewMode = useCallback((): void => {
    const returnPath = viewMode.originalPath || '/platform'
    setViewMode({ isViewingAs: false })
    setCurrentOrganization(null)
    window.location.href = returnPath
  }, [viewMode.originalPath])

  // Refresh organizations
  const refreshOrganizations = useCallback(async (): Promise<void> => {
    if (user?.role === 'platform_admin') {
      await loadOrganizations()
    }
  }, [user, loadOrganizations])

  // Helper: check if platform admin
  const isPlatformAdmin = user?.role === 'platform_admin'

  // Helper functions
  const canAccessPlatform = useCallback((): boolean => isPlatformAdmin, [isPlatformAdmin])

  const canViewAsOrganization = useCallback((): boolean => isPlatformAdmin, [isPlatformAdmin])

  const getCurrentRole = useCallback((): CurrentRole => {
    if (viewMode.isViewingAs && viewMode.targetRole) {
      return viewMode.targetRole
    }
    if (isPlatformAdmin) return 'platform'
    if (user?.role?.startsWith('restaurant_')) return 'restaurant'
    if (user?.role?.startsWith('supplier_')) return 'supplier'
    return 'admin'
  }, [viewMode, isPlatformAdmin, user])

  const getCurrentOrganizationId = useCallback((): string | null => {
    if (viewMode.isViewingAs && viewMode.targetOrganizationId) {
      return viewMode.targetOrganizationId
    }
    return user?.organizationId || null
  }, [viewMode, user])

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    organizations,
    currentOrganization,
    viewMode,
    login,
    logout,
    switchToOrganizationView,
    exitViewMode,
    refreshOrganizations,
    canAccessPlatform,
    canViewAsOrganization,
    getCurrentRole,
    getCurrentOrganizationId,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
