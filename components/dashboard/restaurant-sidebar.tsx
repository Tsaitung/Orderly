'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Receipt, 
  TrendingUp,
  Settings,
  HelpCircle,
  Menu,
  X,
  Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useKeyboardNavigation } from '@/hooks/use-accessibility'

const navigationItems = [
  {
    name: '儀表板總覽',
    href: '/restaurant',
    icon: LayoutDashboard,
    description: '查看餐廳營運概況和重要指標'
  },
  {
    name: '訂單管理',
    href: '/restaurant/orders',
    icon: ShoppingCart,
    description: '管理所有採購訂單'
  },
  {
    name: '驗收管理',
    href: '/restaurant/acceptance',
    icon: Receipt,
    description: '處理供應商送貨驗收'
  },
  {
    name: '供應商管理',
    href: '/restaurant/suppliers',
    icon: Package,
    description: '管理供應商資訊與合作關係'
  },
  {
    name: '財務報表',
    href: '/restaurant/analytics',
    icon: TrendingUp,
    description: '查看財務分析和成本報表'
  },
  {
    name: '系統設定',
    href: '/restaurant/settings',
    icon: Settings,
    description: '配置餐廳和系統設定'
  },
  {
    name: '幫助中心',
    href: '/restaurant/help',
    icon: HelpCircle,
    description: '獲取使用幫助和技術支援'
  }
]

export default function RestaurantSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const [navigationElements, setNavigationElements] = React.useState<HTMLElement[]>([])

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
    // 轉換為原生 KeyboardEvent
    const nativeEvent = event.nativeEvent
    handleKeyDown(nativeEvent)
  }, [handleKeyDown])

  const closeSidebar = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      {/* 移動端選單按鈕 */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10"
        onClick={() => setIsOpen(true)}
        aria-label="開啟主選單"
      >
        <Menu className="h-5 w-5" />
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
          'fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="navigation"
        aria-label="主要導航選單"
      >
        {/* 品牌標題 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">O</span>
            </div>
            <div>
              <h1 className="font-semibold text-sm text-gray-900">Orderly</h1>
              <p className="text-xs text-gray-500">餐廳管理</p>
            </div>
          </div>

          {/* 關閉按鈕 (移動端) */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden w-10 h-10"
            onClick={closeSidebar}
            aria-label="關閉主選單"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 導航選單 */}
        <nav 
          className="p-3 space-y-1"
          ref={navigationRef}
          onKeyDown={handleNavigationKeyDown}
          role="menu"
          aria-label="主要功能選單"
        >
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || 
                           (item.href !== '/restaurant' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                aria-describedby={`${item.name.replace(/\s+/g, '-')}-description`}
                onClick={closeSidebar}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium',
                  'transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  'hover:bg-gray-100',
                  isActive ? 'bg-primary-500 text-white hover:bg-primary-600' : 'text-gray-700'
                )}
              >
                <item.icon className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isActive ? 'text-white' : 'text-gray-500'
                )} />
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <span className="sr-only">目前頁面</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* 使用者資訊 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200">
          <div className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50">
            <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">張</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                張小明的餐廳
              </p>
              <p className="text-xs text-gray-400 truncate">
                restaurant@example.com
              </p>
            </div>
          </div>
        </div>

        {/* 隱藏的描述文字供螢幕閱讀器使用 */}
        <div className="sr-only">
          {navigationItems.map((item) => (
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