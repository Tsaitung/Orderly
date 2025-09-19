'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types for authentication context
export interface Organization {
  id: string
  name: string
  type: 'restaurant' | 'supplier'
  isActive: boolean
}

export interface User {
  id: string
  email: string
  role: 'restaurant_admin' | 'restaurant_manager' | 'restaurant_operator' | 'supplier_admin' | 'supplier_manager' | 'platform_admin'
  organizationId: string
  name: string
  avatar?: string
  isActive: boolean
}

export interface ViewMode {
  isViewingAs: boolean
  targetOrganizationId?: string
  targetRole?: 'restaurant' | 'supplier'
  originalPath?: string
}

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
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  switchToOrganizationView: (organizationId: string) => Promise<boolean>
  exitViewMode: () => void
  refreshOrganizations: () => Promise<void>
  
  // Helper functions
  canAccessPlatform: () => boolean
  canViewAsOrganization: () => boolean
  getCurrentRole: () => 'restaurant' | 'supplier' | 'platform' | 'admin'
  getCurrentOrganizationId: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>({
    isViewingAs: false
  })

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing token
        const token = localStorage.getItem('access_token')
        if (!token) {
          setIsLoading(false)
          return
        }

        // Mock user data - in production, this should decode JWT token
        const mockUser: User = {
          id: 'platform-admin-001',
          email: 'admin@orderly.com',
          role: 'platform_admin',
          organizationId: 'platform-org',
          name: '平台管理員',
          avatar: '/avatars/admin.png',
          isActive: true
        }

        setUser(mockUser)
        setIsAuthenticated(true)

        // Load organizations if platform admin
        if (mockUser.role === 'platform_admin') {
          await loadOrganizations()
        } else {
          // Load current organization for non-platform users
          await loadUserOrganization(mockUser.organizationId)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        localStorage.removeItem('access_token')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Load all organizations for platform admin
  const loadOrganizations = async () => {
    try {
      // Mock organizations data - in production, fetch from API
      const mockOrganizations: Organization[] = [
        {
          id: 'restaurant-001',
          name: '美味餐廳',
          type: 'restaurant',
          isActive: true
        },
        {
          id: 'restaurant-002', 
          name: '快樂小館',
          type: 'restaurant',
          isActive: true
        },
        {
          id: 'supplier-001',
          name: '新鮮供應商',
          type: 'supplier',
          isActive: true
        },
        {
          id: 'supplier-002',
          name: '優質食材行',
          type: 'supplier',
          isActive: true
        }
      ]
      
      setOrganizations(mockOrganizations)
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  // Load specific organization for non-platform users
  const loadUserOrganization = async (organizationId: string) => {
    try {
      // Mock organization data - in production, fetch from API
      const mockOrganization: Organization = {
        id: organizationId,
        name: '用戶組織',
        type: 'restaurant', // This would be determined by API
        isActive: true
      }
      
      setCurrentOrganization(mockOrganization)
    } catch (error) {
      console.error('Failed to load user organization:', error)
    }
  }

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      
      // Mock login - in production, make API call
      if (email === 'admin@orderly.com' && password === 'password') {
        const token = 'mock-jwt-token'
        localStorage.setItem('access_token', token)
        
        const mockUser: User = {
          id: 'platform-admin-001',
          email: email,
          role: 'platform_admin',
          organizationId: 'platform-org',
          name: '平台管理員',
          isActive: true
        }
        
        setUser(mockUser)
        setIsAuthenticated(true)
        await loadOrganizations()
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
    setIsAuthenticated(false)
    setCurrentOrganization(null)
    setOrganizations([])
    setViewMode({ isViewingAs: false })
  }

  // Switch to organization view (super user function)
  const switchToOrganizationView = async (organizationId: string): Promise<boolean> => {
    if (!canViewAsOrganization()) {
      return false
    }

    try {
      const targetOrg = organizations.find(org => org.id === organizationId)
      if (!targetOrg) {
        return false
      }

      setViewMode({
        isViewingAs: true,
        targetOrganizationId: organizationId,
        targetRole: targetOrg.type,
        originalPath: window.location.pathname
      })

      setCurrentOrganization(targetOrg)
      return true
    } catch (error) {
      console.error('Failed to switch organization view:', error)
      return false
    }
  }

  // Exit view mode and return to platform
  const exitViewMode = () => {
    setViewMode({ isViewingAs: false })
    setCurrentOrganization(null)
    
    // Navigate back to platform or original path
    const returnPath = viewMode.originalPath || '/platform'
    window.location.href = returnPath
  }

  // Refresh organizations list
  const refreshOrganizations = async () => {
    if (user?.role === 'platform_admin') {
      await loadOrganizations()
    }
  }

  // Helper functions
  const canAccessPlatform = (): boolean => {
    return user?.role === 'platform_admin'
  }

  const canViewAsOrganization = (): boolean => {
    return user?.role === 'platform_admin'
  }

  const getCurrentRole = (): 'restaurant' | 'supplier' | 'platform' | 'admin' => {
    if (viewMode.isViewingAs && viewMode.targetRole) {
      return viewMode.targetRole
    }
    
    if (user?.role === 'platform_admin') {
      return 'platform'
    }
    
    if (user?.role?.startsWith('restaurant_')) {
      return 'restaurant'
    }
    
    if (user?.role?.startsWith('supplier_')) {
      return 'supplier'
    }
    
    return 'admin'
  }

  const getCurrentOrganizationId = (): string | null => {
    if (viewMode.isViewingAs && viewMode.targetOrganizationId) {
      return viewMode.targetOrganizationId
    }
    
    return user?.organizationId || null
  }

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
    getCurrentOrganizationId
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hooks for specific use cases
export function useCurrentRole(): 'restaurant' | 'supplier' | 'platform' | 'admin' {
  const { getCurrentRole } = useAuth()
  return getCurrentRole()
}

export function useViewMode(): ViewMode {
  const { viewMode } = useAuth()
  return viewMode
}

export function useCanViewAsOrganization(): boolean {
  const { canViewAsOrganization } = useAuth()
  return canViewAsOrganization()
}