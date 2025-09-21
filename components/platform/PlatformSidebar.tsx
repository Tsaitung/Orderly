'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3,
  Building2,
  Users2,
  CreditCard,
  Package,
  TrendingUp,
  FolderTree,
  Settings,
  Database,
  DollarSign,
  Percent,
  Calculator,
  Users,
  Shield,
  Grid3x3,
  LayoutTemplate
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebarItems = [
  {
    title: '總覽',
    href: '/platform',
    icon: BarChart3,
    description: '平台業務總覽'
  },
  {
    title: '業務管理',
    icon: Building2,
    children: [
      {
        title: '供應商管理',
        href: '/platform/suppliers',
        icon: Building2,
        description: '供應商資料與績效'
      },
      {
        title: '客戶管理',
        href: '/platform/customers',
        icon: Users2,
        description: '餐廳客戶分析'
      },
      {
        title: '交易管理',
        href: '/platform/transactions',
        icon: CreditCard,
        description: '交易監控與對帳'
      }
    ]
  },
  {
    title: '產品管理',
    icon: Package,
    children: [
      {
        title: '類別管理',
        href: '/platform/categories',
        icon: FolderTree,
        description: '產品分類標準化'
      },
      {
        title: 'SKU管理',
        href: '/platform/products',
        icon: Package,
        description: 'SKU變體與多供應商管理'
      },
      {
        title: '需求品項',
        href: '/platform/demand-items',
        icon: TrendingUp,
        description: '需求分析與預測'
      }
    ]
  },
  {
    title: '計費管理',
    icon: DollarSign,
    children: [
      {
        title: '計費總覽',
        href: '/platform/billing',
        icon: BarChart3,
        description: '計費機制與系統健康度'
      },
      {
        title: '費率管理',
        href: '/platform/billing/rates',
        icon: Percent,
        description: '分級費率與評級折扣'
      },
      {
        title: '供應商計費',
        href: '/platform/billing/suppliers',
        icon: Calculator,
        description: '供應商計費總覽與分析'
      }
    ]
  },
  {
    title: '系統管理',
    icon: Settings,
    children: [
      {
        title: '使用者管理',
        href: '/platform/users',
        icon: Users,
        description: '使用者帳號與權限管理'
      },
      {
        title: '角色管理',
        href: '/platform/roles',
        icon: Shield,
        description: '角色權限配置與管理'
      },
      {
        title: '權限矩陣',
        href: '/platform/roles/matrix',
        icon: Grid3x3,
        description: '權限對應關係總覽'
      },
      {
        title: '角色模板',
        href: '/platform/roles/templates',
        icon: LayoutTemplate,
        description: '預設角色模板庫'
      },
      {
        title: '資料管理',
        href: '/platform/data',
        icon: Database,
        description: '資料備份與管理'
      }
    ]
  }
]

export function PlatformSidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:bg-white lg:border-r">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="px-3">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <div key={item.title}>
                  {item.href ? (
                    // Single link item
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                        pathname === item.href
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          pathname === item.href
                            ? 'text-primary-500'
                            : 'text-gray-400 group-hover:text-gray-500'
                        )}
                      />
                      <div>
                        <div>{item.title}</div>
                        <div className="text-xs text-gray-500">{item.description}</div>
                      </div>
                    </Link>
                  ) : (
                    // Group with children
                    <div className="mb-4">
                      <div className="flex items-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </div>
                      <div className="mt-1 space-y-1">
                        {item.children?.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'group flex items-center pl-8 pr-3 py-2 text-sm font-medium rounded-md transition-colors',
                              pathname === child.href
                                ? 'bg-primary-100 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            <child.icon
                              className={cn(
                                'mr-3 h-4 w-4 flex-shrink-0',
                                pathname === child.href
                                  ? 'text-primary-500'
                                  : 'text-gray-400 group-hover:text-gray-500'
                              )}
                            />
                            <div>
                              <div>{child.title}</div>
                              <div className="text-xs text-gray-500">{child.description}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}