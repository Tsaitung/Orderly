'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3,
  Users,
  Shield,
  Settings,
  Activity,
  AlertTriangle,
  FileText,
  CreditCard,
  Database,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

const sidebarItems = [
  {
    title: '儀表板',
    href: '/admin/dashboard',
    icon: BarChart3,
    description: '即時業務指標監控'
  },
  {
    title: '系統監控',
    icon: Activity,
    children: [
      {
        title: '系統健康',
        href: '/admin/system/health',
        icon: Activity,
        description: '服務狀態監控'
      },
      {
        title: '系統配置',
        href: '/admin/system/config',
        icon: Settings,
        description: '平台參數設定'
      }
    ]
  },
  {
    title: '用戶管理',
    icon: Users,
    children: [
      {
        title: '用戶列表',
        href: '/admin/users',
        icon: Users,
        description: '管理所有用戶'
      },
      {
        title: '權限管理',
        href: '/admin/users/permissions',
        icon: Shield,
        description: '角色權限設定'
      }
    ]
  },
  {
    title: '財務管理',
    icon: CreditCard,
    children: [
      {
        title: '交易監控',
        href: '/admin/financial/transactions',
        icon: CreditCard,
        description: '即時交易監控'
      },
      {
        title: '收入分析',
        href: '/admin/financial/revenue',
        icon: BarChart3,
        description: '收入報表分析'
      }
    ]
  },
  {
    title: '合規安全',
    icon: Shield,
    children: [
      {
        title: '審計日誌',
        href: '/admin/compliance/audit',
        icon: FileText,
        description: '系統審計追蹤'
      },
      {
        title: '安全監控',
        href: '/admin/compliance/security',
        icon: Shield,
        description: '安全事件監控'
      }
    ]
  },
  {
    title: '營運工具',
    icon: Settings,
    children: [
      {
        title: '警報管理',
        href: '/admin/operations/alerts',
        icon: AlertTriangle,
        description: '系統警報管理'
      },
      {
        title: '通知中心',
        href: '/admin/operations/notifications',
        icon: Bell,
        description: '用戶通知管理'
      }
    ]
  },
  {
    title: '資料管理',
    href: '/admin/data',
    icon: Database,
    description: '資料備份與管理'
  }
]

export function AdminSidebar() {
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
                      {item.title}
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