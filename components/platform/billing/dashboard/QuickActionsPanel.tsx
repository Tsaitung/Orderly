'use client'

import Link from 'next/link'
import { 
  Calculator,
  Settings,
  Download,
  Bell,
  BarChart3,
  Users,
  Percent,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'

const quickActions = [
  {
    title: '費率計算器',
    description: '即時計算供應商費率',
    href: '/platform/billing/rates',
    icon: Calculator,
    color: 'bg-blue-500 hover:bg-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100'
  },
  {
    title: '供應商分析',
    description: '查看供應商計費詳情',
    href: '/platform/billing/suppliers',
    icon: Users,
    color: 'bg-green-500 hover:bg-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100'
  },
  {
    title: '費率設定',
    description: '管理分級費率配置',
    href: '/platform/billing/rates',
    icon: Percent,
    color: 'bg-purple-500 hover:bg-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100'
  },
  {
    title: '報表下載',
    description: '匯出計費相關報表',
    href: '/platform/billing/reports',
    icon: Download,
    color: 'bg-orange-500 hover:bg-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100'
  },
  {
    title: '數據分析',
    description: '查看收入趨勢分析',
    href: '/platform/analytics',
    icon: BarChart3,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100'
  },
  {
    title: '通知管理',
    description: '發送計費通知',
    href: '/platform/billing/notifications',
    icon: Bell,
    color: 'bg-yellow-500 hover:bg-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100'
  }
]

export function QuickActionsPanel() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-8 h-8 bg-primary-100 rounded-lg">
          <Settings className="h-4 w-4 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">快速操作</h3>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className={cn(
              'group flex items-center space-x-3 p-3 rounded-lg transition-all duration-200',
              action.bgColor,
              'border border-transparent hover:border-gray-200 hover:shadow-sm'
            )}
          >
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg text-white transition-colors',
              action.color
            )}>
              <action.icon className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                {action.title}
              </p>
              <p className="text-xs text-gray-500 group-hover:text-gray-600">
                {action.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <Link
          href="/platform/billing/settings"
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          <Settings className="h-4 w-4 mr-2" />
          進階設定
        </Link>
      </div>
    </div>
  )
}