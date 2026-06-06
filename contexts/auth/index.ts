/**
 * Auth Module Index
 * Central export point for authentication module
 */

// Context
export { AuthContext } from './AuthContext'

// Provider
export { AuthProvider } from './AuthProvider'

// Types
export type {
  User,
  UserRole,
  Organization,
  OrganizationType,
  ViewMode,
  CurrentRole,
  AuthContextType,
  AuthProviderProps,
  LoginResult,
  StoredTokenData,
  LoginApiResponse,
  OrganizationsApiResponse,
} from './types'

// Hooks
export {
  useAuth,
  useCurrentRole,
  useOrganization,
  useViewMode,
  useCanViewAsOrganization,
} from './hooks'

// Services (for advanced use cases)
export {
  performLogin,
  performLogout,
  fetchOrganizations,
  fetchUserOrganization,
  safeExecute,
} from './services/auth-service'
