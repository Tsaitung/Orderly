/**
 * Auth Context - Backwards Compatibility Re-export
 *
 * This file re-exports from the new modular auth structure for backwards compatibility.
 * New code should import directly from '@/contexts/auth' or '@/contexts/auth/hooks'.
 *
 * @deprecated Import from '@/contexts/auth' instead
 */

'use client'

// Re-export everything from the new modular structure
export {
  // Context
  AuthContext,
  // Provider
  AuthProvider,
  // Types
  type User,
  type UserRole,
  type Organization,
  type OrganizationType,
  type ViewMode,
  type CurrentRole,
  type AuthContextType,
  type AuthProviderProps,
  type LoginResult,
  // Hooks
  useAuth,
  useCurrentRole,
  useViewMode,
  useCanViewAsOrganization,
  useOrganization,
} from './auth'
