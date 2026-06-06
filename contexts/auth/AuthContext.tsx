/**
 * Auth Context
 * Creates the authentication context with default values
 */

'use client'

import { createContext } from 'react'
import type { AuthContextType } from './types'

// Default context value (used when not within provider)
const defaultContextValue: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  organizations: [],
  currentOrganization: null,
  viewMode: { isViewingAs: false },
  login: async () => ({ success: false, error: 'AuthProvider not initialized' }),
  logout: () => {},
  switchToOrganizationView: async () => false,
  exitViewMode: () => {},
  refreshOrganizations: async () => {},
  canAccessPlatform: () => false,
  canViewAsOrganization: () => false,
  getCurrentRole: () => 'admin',
  getCurrentOrganizationId: () => null,
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Re-export for convenience
export { defaultContextValue }
