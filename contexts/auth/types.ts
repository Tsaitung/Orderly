/**
 * Authentication Types
 * Central type definitions for the authentication module
 */

import type { LoginFormData } from '@/lib/validation/auth-schemas'

// User role union type
export type UserRole =
  | 'restaurant_admin'
  | 'restaurant_manager'
  | 'restaurant_operator'
  | 'supplier_admin'
  | 'supplier_manager'
  | 'platform_admin'

// Organization type
export type OrganizationType = 'restaurant' | 'supplier'

// Current role (simplified for routing/UI)
export type CurrentRole = 'restaurant' | 'supplier' | 'platform' | 'admin'

// Organization interface
export interface Organization {
  id: string
  name: string
  type: OrganizationType
  isActive: boolean
}

// User interface
export interface User {
  id: string
  email: string
  role: UserRole
  organizationId: string
  name: string
  avatar?: string
  isActive: boolean
}

// View mode for super user organization switching
export interface ViewMode {
  isViewingAs: boolean
  targetOrganizationId?: string
  targetRole?: OrganizationType
  originalPath?: string
}

// Login result from auth service
export interface LoginResult {
  success: boolean
  error?: string
}

// Auth context type definition
export interface AuthContextType {
  // Core authentication state
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean

  // Organization management
  organizations: Organization[]
  currentOrganization: Organization | null

  // Super user view switching
  viewMode: ViewMode

  // Actions
  login: (credentials: LoginFormData) => Promise<LoginResult>
  logout: () => void
  switchToOrganizationView: (organizationId: string) => Promise<boolean>
  exitViewMode: () => void
  refreshOrganizations: () => Promise<void>

  // Helper functions
  canAccessPlatform: () => boolean
  canViewAsOrganization: () => boolean
  getCurrentRole: () => CurrentRole
  getCurrentOrganizationId: () => string | null
}

// Auth provider props
export interface AuthProviderProps {
  children: React.ReactNode
}

// Stored token data (from SecureStorage)
export interface StoredTokenData {
  token: string
  refreshToken?: string
  userId: string
  email: string
  role: string
  organizationId: string
  organizationType: OrganizationType
  expiresAt: number
  rememberMe: boolean
}

// API response types
export interface LoginApiResponse {
  success: boolean
  user: {
    id: string
    email: string
    role: UserRole
    name?: string
    organization: {
      id: string
      type: OrganizationType
    }
  }
  message?: string
}

export interface OrganizationsApiResponse {
  organizations: Array<{
    id: string
    name: string
    type: string
    isActive: boolean
  }>
}
