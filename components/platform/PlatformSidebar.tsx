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
  Store,
  Grid3x3,
  LayoutTemplate,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebarItems = [
  {
    title: '總覽',
    href: '/platform',
    icon: BarChart3,
    description: '平台業務總覽',
  },
  {
    title: '業務管理',
    icon: Building2,
    children: [
      {
        title: '供應商管理',
        href: '/platform/suppliers',
        icon: Building2,
        description: '供應商資料與績效',
      },
      {
        title: '客戶管理',
        href: '/platform/customers',
        icon: Users2,
        description: '餐廳客戶分析',
      },
    ],
  },
  {
    title: '產品管理',
    icon: Package,
    children: [
      {
        title: '類別管理',
        href: '/platform/categories',
        icon: FolderTree,
        description: '產品分類標準化',
      },
      {
        title: 'SKU管理',
        href: '/platform/products',
        icon: Package,
        description: 'SKU變體與多供應商管理',
      },
    ],
  },
  {
    title: '計費管理',
    icon: DollarSign,
    children: [
      {
        title: '計費總覽',
        href: '/platform/billing/overview',
        icon: BarChart3,
        description: '收入統計與系統健康度',
      },
      {
        title: '供應商合約',
        href: '/platform/billing/supplier-contracts',
        icon: Building2,
        description: '🔵 供應商交易費率與合約管理',
        badge: '供應商',
      },
      {
        title: '餐廳方案',
        href: '/platform/billing/restaurant-contracts',
        icon: Store,
        description: '🟢 餐廳訂閱方案與功能管理',
        badge: '餐廳',
      },
      {
        title: '對帳管理',
        href: '/platform/billing/reconciliation',
        icon: Calculator,
        description: '自動對帳與異常處理',
      },
    ],
  },
  {
    title: '系統管理',
    icon: Settings,
    children: [
      {
        title: '使用者管理',
        href: '/platform/users',
        icon: Users,
        description: '使用者帳號與權限管理',
      },
      {
        title: '角色管理',
        href: '/platform/roles',
        icon: Shield,
        description: '角色權限配置與管理',
      },
      {
        title: '權限矩陣',
        href: '/platform/roles/matrix',
        icon: Grid3x3,
        description: '權限對應關係總覽',
      },
    ],
  },
]

export function PlatformSidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:bg-white lg:pt-16">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
          <div className="px-3">
            <div className="space-y-1">
              {sidebarItems.map(item => (
                <div key={item.title}>
                  {item.href ? (
                    // Single link item
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
                      <div className="flex items-center px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </div>
                      <div className="mt-1 space-y-1">
                        {item.children?.map(child => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'group flex items-center rounded-md py-2 pl-8 pr-3 text-sm font-medium transition-colors',
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
