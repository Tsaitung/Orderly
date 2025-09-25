'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Shield, AlertTriangle, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?:
    | 'platform_admin'
    | 'restaurant_admin'
    | 'supplier_admin'
    | 'admin'
    | 'restaurant'
    | 'supplier'
  fallback?: React.ReactNode
  allowSuperUser?: boolean
}

export function AuthGuard({
  children,
  requiredRole = 'platform_admin',
  fallback,
  allowSuperUser = true,
}: AuthGuardProps) {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, viewMode, canViewAsOrganization, getCurrentRole } =
    useAuth()

  // Check authorization
  const checkAuthorization = React.useCallback(() => {
    
    // 🔧 Enhanced debugging for staging admin
    console.log('🔧 AuthGuard Debug:', {
      isAuthenticated,
      user: user ? {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      } : null,
      requiredRole,
      isLoading,
      allowSuperUser,
      viewMode,
      canViewAsOrganization: canViewAsOrganization()
    })
    
    if (!isAuthenticated || !user) {
      console.log('🔧 AuthGuard: Not authenticated or no user')
      return false
    }

    // Platform admin has unrestricted access to all areas
    if (user.role === 'platform_admin') {
      console.log('🔧 AuthGuard: Platform admin access granted')
      return true
    }

    // For platform_admin with super user capabilities
    if (allowSuperUser && canViewAsOrganization()) {
      // If in view mode, check if viewing the correct role
      if (viewMode.isViewingAs) {
        const currentRole = getCurrentRole()

        // Allow if viewing as the required role type
        if (requiredRole === 'restaurant' && currentRole === 'restaurant') {
          return true
        }
        if (requiredRole === 'supplier' && currentRole === 'supplier') {
          return true
        }
        if (requiredRole === 'platform_admin' && currentRole === 'platform') {
          return true
        }
      } else {
        // If not in view mode, allow platform admin to access platform routes
        if (requiredRole === 'platform_admin') {
          return true
        }
      }
    }

    // Standard role-based authorization
    const hasDirectRole = (user.role as string) === requiredRole
    const isAdmin =
      (user.role as string) === 'platform_admin' &&
      requiredRole !== 'restaurant' &&
      requiredRole !== 'supplier'

    // Special cases for role groups
    const hasRestaurantAccess =
      requiredRole === 'restaurant' && user.role?.startsWith('restaurant_')

    const hasSupplierAccess = requiredRole === 'supplier' && user.role?.startsWith('supplier_')

  return hasDirectRole || isAdmin || hasRestaurantAccess || hasSupplierAccess
  }, [
    isAuthenticated,
    user,
    isLoading,
    allowSuperUser,
    canViewAsOrganization,
    viewMode,
    getCurrentRole,
    requiredRole,
  ])

  const [isAuthorized, setIsAuthorized] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login')
        return
      }

      setIsAuthorized(checkAuthorization())
    }
  }, [isLoading, isAuthenticated, checkAuthorization, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
          <p className="text-gray-600">驗證權限中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>
    }

    const getRoleDisplayName = (role: string) => {
      const roleNames = {
        platform_admin: '平台管理員',
        restaurant_admin: '餐廳管理員',
        restaurant_manager: '餐廳經理',
        restaurant_operator: '餐廳操作員',
        supplier_admin: '供應商管理員',
        supplier_manager: '供應商經理',
        restaurant: '餐廳角色',
        supplier: '供應商角色',
      }
      return roleNames[role as keyof typeof roleNames] || role
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">存取被拒絕</h2>
            <p className="mb-4 text-gray-600">
              您沒有存取此頁面的權限。需要 {getRoleDisplayName(requiredRole)} 角色才能訪問此功能。
            </p>

            {/* Show current state */}
            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="text-gray-700">
                <strong>目前使用者:</strong> {user?.name || '未知'}
              </p>
              <p className="text-gray-700">
                <strong>使用者角色:</strong> {getRoleDisplayName(user?.role || '')}
              </p>
              {viewMode.isViewingAs && (
                <div className="mt-2 rounded border border-orange-200 bg-orange-100 p-2">
                  <div className="flex items-center space-x-2">
                    <Eye className="h-4 w-4 text-orange-600" />
                    <span className="font-medium text-orange-800">檢視模式</span>
                  </div>
                  <p className="mt-1 text-xs text-orange-700">
                    目前以 {viewMode.targetRole === 'restaurant' ? '餐廳' : '供應商'} 身份檢視
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {viewMode.isViewingAs ? (
                <Button onClick={() => router.push('/platform')} className="w-full">
                  返回平台管理
                </Button>
              ) : (
                <Button
                  onClick={() =>
                    router.push(
                      user?.role?.startsWith('restaurant_')
                        ? '/restaurant'
                        : user?.role?.startsWith('supplier_')
                          ? '/supplier'
                          : user?.role === 'platform_admin'
                            ? '/platform'
                            : '/dashboard'
                    )
                  }
                  className="w-full"
                >
                  返回儀表板
                </Button>
              )}
              <Button onClick={() => router.push('/login')} variant="outline" className="w-full">
                重新登入
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
