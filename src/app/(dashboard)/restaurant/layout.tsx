'use client'

import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Settings,
  HelpCircle,
  Package,
} from 'lucide-react'
import { DashboardLayout, NavigationItem, UserInfo } from '@/components/layouts/core'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuth, useViewMode } from '@/contexts/AuthContext'

interface RestaurantLayoutProps {
  children: React.ReactNode
}

// 餐廳端導航配置
const restaurantNavigation: NavigationItem[] = [
  {
    title: '儀表板總覽',
    href: '/restaurant',
    icon: LayoutDashboard,
    description: '查看餐廳營運概況和重要指標',
  },
  {
    title: '訂單管理',
    href: '/restaurant/orders',
    icon: ShoppingCart,
    description: '管理所有採購訂單',
  },
  {
    title: '驗收管理',
    href: '/restaurant/acceptance',
    icon: Receipt,
    description: '處理供應商送貨驗收',
  },
  {
    title: '供應商管理',
    href: '/restaurant/suppliers',
    icon: Package,
    description: '管理供應商資訊與合作關係',
  },
  {
    title: '財務報表',
    href: '/restaurant/analytics',
    icon: TrendingUp,
    description: '查看財務分析和成本報表',
  },
  {
    title: '系統設定',
    href: '/restaurant/settings',
    icon: Settings,
    description: '配置餐廳和系統設定',
  },
  {
    title: '幫助中心',
    href: '/restaurant/help',
    icon: HelpCircle,
    description: '獲取使用幫助和技術支援',
  },
]

function RestaurantLayoutContent({ children }: RestaurantLayoutProps) {
  const { user, currentOrganization } = useAuth()
  const viewMode = useViewMode()

  // Generate user info based on auth context
  const restaurantUserInfo: UserInfo = {
    name:
      viewMode.isViewingAs && currentOrganization
        ? `${currentOrganization.name} (檢視模式)`
        : user?.name || '餐廳管理員',
    email: user?.email || 'restaurant@example.com',
    avatar: '/avatars/restaurant-user.png',
    role: viewMode.isViewingAs ? '平台管理員 - 檢視模式' : '餐廳管理員',
    id: viewMode.isViewingAs
      ? currentOrganization?.id || 'viewing-mode'
      : user?.id || 'restaurant-001',
  }

  return (
    <DashboardLayout
      role="restaurant"
      navigationItems={restaurantNavigation}
      userInfo={restaurantUserInfo}
      title={
        viewMode.isViewingAs ? `${currentOrganization?.name || '餐廳'} - 檢視模式` : '餐廳管理系統'
      }
      subtitle={viewMode.isViewingAs ? '平台管理員正在檢視此餐廳介面' : '數位供應鏈管理平台'}
      spacing="normal"
      showDemoMode={!viewMode.isViewingAs} // Hide demo mode when in super user view
    >
      {/* 無障礙跳轉連結 */}
      <a
        href="#main-content"
        className="sr-only rounded-md bg-restaurant-500 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        跳到主要內容
      </a>

      {/* 主要內容 */}
      <div id="main-content" role="main" aria-label="餐廳管理儀表板主要內容">
        {children}
      </div>

      {/* Toast 通知區域 */}
      <div
        id="toast-container"
        className="fixed bottom-4 right-4 z-40 space-y-2"
        aria-live="polite"
        aria-label="系統通知"
      />
    </DashboardLayout>
  )
}

export default function RestaurantLayout({ children }: RestaurantLayoutProps) {
  return (
    <AuthGuard requiredRole="restaurant" allowSuperUser={true}>
      <RestaurantLayoutContent>{children}</RestaurantLayoutContent>
    </AuthGuard>
  )
}
