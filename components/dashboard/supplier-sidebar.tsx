'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  MessageSquare,
  BarChart3,
  Settings,
  HelpCircle,
  Menu,
  X,
  Package,
  Users,
  DollarSign,
  Bell,
  Calendar,
  Truck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useKeyboardNavigation } from '@/hooks/use-accessibility'

const supplierNavigationItems = [
  {
    name: '供應商儀表板',
    href: '/supplier',
    icon: LayoutDashboard,
    description: '查看訂單概況、營收統計和重要提醒',
    badge: null
  },
  {
    name: '訂單管理',
    href: '/supplier/orders',
    icon: ShoppingCart,
    description: '處理新訂單、確認交期、更新訂單狀態',
    badge: { count: 12, variant: 'info' as const }
  },
  {
    name: '帳務管理',
    href: '/supplier/finance',
    icon: FileText,
    description: '應收帳款、發票開立、對帳管理',
    badge: { count: 3, variant: 'warning' as const }
  },
  {
    name: '產品目錄',
    href: '/supplier/products',
    icon: Package,
    description: '管理產品資訊、價格和庫存',
    badge: null
  },
  {
    name: '客戶關係',
    href: '/supplier/customers',
    icon: Users,
    description: '查看合作餐廳、客戶偏好分析',
    badge: null
  },
  {
    name: '物流追蹤',
    href: '/supplier/logistics',
    icon: Truck,
    description: '配送排程、運輸狀態追蹤',
    badge: { count: 5, variant: 'success' as const }
  },
  {
    name: '即時溝通',
    href: '/supplier/messages',
    icon: MessageSquare,
    description: '與餐廳客戶即時對話、技術支援',
    badge: { count: 8, variant: 'destructive' as const }
  },
  {
    name: '財務報表',
    href: '/supplier/analytics',
    icon: BarChart3,
    description: '營收分析、付款週期、獲利報告',
    badge: null
  },
  {
    name: '排程管理',
    href: '/supplier/schedule',
    icon: Calendar,
    description: '生產排程、交期規劃、產能管理',
    badge: null
  },
  {
    name: '營收結算',
    href: '/supplier/billing',
    icon: DollarSign,
    description: '帳款管理、付款追蹤、稅務處理',
    badge: { count: 2, variant: 'warning' as const }
  },
  {
    name: '系統設定',
    href: '/supplier/settings',
    icon: Settings,
    description: '帳戶設定、通知偏好、API 配置',
    badge: null
  },
  {
    name: '幫助支援',
    href: '/supplier/help',
    icon: HelpCircle,
    description: '使用指南、常見問題、技術支援',
    badge: null
  }
]

export default function SupplierSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const [navigationElements, setNavigationElements] = React.useState<HTMLElement[]>([])
  const [unreadNotifications, setUnreadNotifications] = React.useState(23)

  // 收集導航元素用於鍵盤導航
  const navigationRef = React.useCallback((node: HTMLElement | null) => {
    if (node) {
      const links = Array.from(node.querySelectorAll('a[role="menuitem"]')) as HTMLElement[]
      setNavigationElements(links)
    }
  }, [])

  const { handleKeyDown } = useKeyboardNavigation(navigationElements, {
    orientation: 'vertical',
    loop: true
  })

  // 處理鍵盤導航
  const handleNavigationKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    const nativeEvent = event.nativeEvent
    handleKeyDown(nativeEvent)
  }, [handleKeyDown])

  const closeSidebar = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  // 計算總徽章數量
  const totalBadgeCount = React.useMemo(() => {
    return supplierNavigationItems.reduce((sum, item) => {
      return sum + (item.badge?.count || 0)
    }, 0)
  }, [])

  const getBadgeVariantClass = (variant: 'info' | 'warning' | 'success' | 'destructive') => {
    switch (variant) {
      case 'info': return 'bg-blue-500'
      case 'warning': return 'bg-yellow-500'
      case 'success': return 'bg-green-500'
      case 'destructive': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <>
      {/* 移動端選單按鈕 */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 lg:hidden bg-white shadow-md"
        onClick={() => setIsOpen(true)}
        aria-label="開啟供應商選單"
      >
        <Menu className="h-6 w-6" />
        {totalBadgeCount > 0 && (
          <Badge 
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
          </Badge>
        )}
      </Button>

      {/* 背景遮罩 (移動端) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* 側邊選單 */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-blue-200 shadow-lg',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="供應商主要導航選單"
      >
        {/* 供應商品牌標題 */}
        <div className="flex items-center justify-between p-6 border-b border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
              <span className="text-blue-600 font-bold text-lg">O</span>
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">Orderly</h1>
              <p className="text-xs text-blue-100">供應商入口</p>
            </div>
          </div>

          {/* 通知鈴鐺 */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-500/20"
              aria-label={`系統通知，${unreadNotifications} 則未讀`}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <Badge 
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </Badge>
              )}
            </Button>
          </div>

          {/* 關閉按鈕 (移動端) */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-blue-500/20"
            onClick={closeSidebar}
            aria-label="關閉供應商選單"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 供應商資訊摘要 */}
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">優</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                優質食材供應商
              </p>
              <p className="text-sm text-blue-600 truncate">
                供應商 ID: SUP-2024-001
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">營運中</span>
                <Badge variant="success" size="sm" className="ml-1">
                  認證
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 導航選單 */}
        <nav 
          className="p-4 space-y-1 flex-1 overflow-y-auto"
          ref={navigationRef}
          onKeyDown={handleNavigationKeyDown}
          role="menu"
          aria-label="供應商功能選單"
        >
          {supplierNavigationItems.map((item) => {
            const isActive = pathname === item.href || 
                           (item.href !== '/supplier' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                aria-describedby={`${item.name.replace(/\s+/g, '-')}-description`}
                onClick={closeSidebar}
                className={cn(
                  'flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium',
                  'transition-all duration-200 group',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  'hover:bg-blue-100 hover:shadow-sm',
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-gray-700 hover:text-blue-800'
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-blue-600 group-hover:text-blue-700'
                  )} />
                  <span className="flex-1">{item.name}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {item.badge && (
                    <Badge 
                      variant={isActive ? 'outline' : item.badge.variant}
                      size="sm"
                      className={cn(
                        'text-xs',
                        isActive && 'border-white text-white'
                      )}
                    >
                      {item.badge.count}
                    </Badge>
                  )}
                  {isActive && (
                    <span className="sr-only">目前頁面</span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* 供應商支援資訊 */}
        <div className="p-4 border-t border-blue-200 bg-blue-50">
          <div className="space-y-3">
            {/* 快速聯絡 */}
            <div className="text-center">
              <p className="text-sm font-medium text-blue-900 mb-2">需要協助？</p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  即時客服
                </Button>
                <p className="text-xs text-blue-600">
                  服務時間: 週一至週五 8:00-18:00
                </p>
              </div>
            </div>

            {/* 供應商等級 */}
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">供應商等級</span>
                <Badge variant="success" size="sm">金牌</Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">評分</span>
                  <span className="font-medium text-blue-600">4.8/5.0</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">合作時間</span>
                  <span className="font-medium text-gray-900">2年3個月</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">配送準時率</span>
                  <span className="font-medium text-green-600">98.5%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 隱藏的描述文字供螢幕閱讀器使用 */}
        <div className="sr-only">
          {supplierNavigationItems.map((item) => (
            <div 
              key={`${item.name.replace(/\s+/g, '-')}-description`}
              id={`${item.name.replace(/\s+/g, '-')}-description`}
            >
              {item.description}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}