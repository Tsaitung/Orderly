'use client'

import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  MessageSquare,
  BarChart3,
  Settings,
  HelpCircle,
  Package,
  Users,
  DollarSign,
  Calendar,
  Truck
} from 'lucide-react'
import { DashboardLayout, NavigationItem, UserInfo } from '@/components/layouts/core'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useAuth, useViewMode } from '@/contexts/AuthContext'

interface SupplierLayoutProps {
  children: React.ReactNode
}

// 供應商端導航配置 (合併相關功能，簡化導航)
const supplierNavigation: NavigationItem[] = [
  {
    title: '供應商總覽',
    href: '/supplier',
    icon: LayoutDashboard,
    description: '查看訂單概況、營收統計和重要提醒'
  },
  {
    title: '訂單管理',
    href: '/supplier/orders',
    icon: ShoppingCart,
    description: '處理新訂單、確認交期、更新訂單狀態',
    badge: 12
  },
  {
    title: '產品目錄',
    href: '/supplier/products',
    icon: Package,
    description: '管理產品資訊、價格和庫存'
  },
  {
    title: '物流配送',
    href: '/supplier/logistics',
    icon: Truck,
    description: '配送排程、運輸狀態追蹤',
    badge: 5
  },
  {
    title: '財務管理',
    href: '/supplier/finance',
    icon: FileText,
    description: '應收帳款、發票開立、對帳管理',
    badge: 3
  },
  {
    title: '客戶關係',
    href: '/supplier/customers',
    icon: Users,
    description: '查看合作餐廳、客戶偏好分析'
  },
  {
    title: '即時溝通',
    href: '/supplier/messages',
    icon: MessageSquare,
    description: '與餐廳客戶即時對話、技術支援',
    badge: 8
  },
  {
    title: '數據分析',
    href: '/supplier/analytics',
    icon: BarChart3,
    description: '營收分析、付款週期、獲利報告'
  },
  {
    title: '系統設定',
    href: '/supplier/settings',
    icon: Settings,
    description: '帳戶設定、通知偏好、API 配置'
  },
  {
    title: '幫助支援',
    href: '/supplier/help',
    icon: HelpCircle,
    description: '使用指南、常見問題、技術支援'
  }
]

function SupplierLayoutContent({ children }: SupplierLayoutProps) {
  const { user, currentOrganization } = useAuth()
  const viewMode = useViewMode()

  // Generate user info based on auth context
  const supplierUserInfo: UserInfo = {
    name: viewMode.isViewingAs && currentOrganization ? 
      `${currentOrganization.name} (檢視模式)` : 
      (user?.name || '優質食材供應商'),
    email: user?.email || 'supplier@example.com',
    avatar: '/avatars/supplier-user.png',
    role: viewMode.isViewingAs ? '平台管理員 - 檢視模式' : '供應商管理員',
    id: viewMode.isViewingAs ? 
      currentOrganization?.id || 'viewing-mode' : 
      (user?.id || 'sup-2024-001')
  }

  return (
    <DashboardLayout
      role="supplier"
      navigationItems={supplierNavigation}
      userInfo={supplierUserInfo}
      title={viewMode.isViewingAs ? 
        `${currentOrganization?.name || '供應商'} - 檢視模式` : 
        "供應商管理中心"
      }
      subtitle={viewMode.isViewingAs ? 
        "平台管理員正在檢視此供應商介面" : 
        "數位供應鏈協作平台"
      }
      spacing="normal"
      showDemoMode={!viewMode.isViewingAs} // Hide demo mode when in super user view
    >
      {/* 供應商專用無障礙跳轉 */}
      <a 
        href="#supplier-main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-supplier-500 text-white px-4 py-2 rounded-md"
      >
        跳到供應商主要內容
      </a>

      {/* 主要內容 */}
      <div id="supplier-main-content" role="main" aria-label="供應商管理平台主要內容">
        {children}
      </div>

      {/* 供應商專用通知區域 */}
      <div 
        id="supplier-notification-container"
        className="fixed bottom-4 right-4 z-40 space-y-2"
        aria-live="polite"
        aria-label="供應商系統通知"
      />

      {/* 即時聊天支援 */}
      <div 
        id="supplier-chat-widget"
        className="fixed bottom-4 left-4 z-40"
        aria-label="即時客服支援"
      />
    </DashboardLayout>
  )
}

export default function SupplierLayout({ children }: SupplierLayoutProps) {
  return (
    <AuthGuard requiredRole="supplier" allowSuperUser={true}>
      <SupplierLayoutContent>
        {children}
      </SupplierLayoutContent>
    </AuthGuard>
  )
}