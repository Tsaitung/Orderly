'use client'

import * as React from 'react'
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Clock,
  Star,
  Users,
  Package,
  Truck,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface SupplierMetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period: string
  }
  icon: React.ReactNode
  status?: 'excellent' | 'good' | 'warning' | 'critical'
  description?: string
  target?: {
    current: number
    goal: number
    unit: string
  }
}

function SupplierMetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  status = 'good', 
  description,
  target 
}: SupplierMetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getChangeIcon = () => {
    if (!change) return null
    return change.type === 'increase' ? '↗' : '↘'
  }

  const getChangeColor = () => {
    if (!change) return ''
    // 對於營收、訂單數量，增加是好的；對於退貨率、延遲率，減少是好的
    const isGoodChange = (title.includes('營收') || title.includes('訂單') || title.includes('評分')) 
      ? change.type === 'increase' 
      : change.type === 'decrease'
    return isGoodChange ? 'text-green-600' : 'text-red-600'
  }

  const getTargetProgress = () => {
    if (!target) return null
    return Math.min((target.current / target.goal) * 100, 100)
  }

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={cn('p-2 rounded-lg bg-opacity-10', getStatusColor())}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold text-gray-900">
            {value}
          </div>
          
          {change && (
            <div className="flex items-center space-x-1">
              <span className={cn('text-sm font-medium', getChangeColor())}>
                {getChangeIcon()} {Math.abs(change.value)}%
              </span>
              <span className="text-sm text-gray-500">
                vs {change.period}
              </span>
            </div>
          )}
          
          {target && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>目標進度</span>
                <span>{target.current} / {target.goal} {target.unit}</span>
              </div>
              <Progress 
                value={getTargetProgress()!} 
                className="h-2"
                variant={
                  getTargetProgress()! >= 100 ? 'success' :
                  getTargetProgress()! >= 80 ? 'default' :
                  getTargetProgress()! >= 60 ? 'warning' : 'destructive'
                }
              />
            </div>
          )}
          
          {description && (
            <p className="text-xs text-gray-500 leading-relaxed">
              {description}
            </p>
          )}

          {status !== 'good' && (
            <Badge 
              variant={
                status === 'excellent' ? 'success' : 
                status === 'warning' ? 'warning' : 'destructive'
              }
              size="sm"
              className="mt-2"
            >
              {status === 'excellent' ? '優秀' : 
               status === 'warning' ? '需關注' : '需改善'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function SupplierOverview() {
  // 模擬供應商數據
  const supplierMetrics = [
    {
      title: '今日新訂單',
      value: 12,
      change: { value: 25, type: 'increase' as const, period: '昨日' },
      icon: <ShoppingCart className="h-5 w-5" />,
      status: 'excellent' as const,
      description: '新增優質餐廳客戶，訂單量穩步成長'
    },
    {
      title: '本月營收',
      value: 'NT$ 125.6K',
      change: { value: 18.3, type: 'increase' as const, period: '上月' },
      icon: <DollarSign className="h-5 w-5" />,
      status: 'excellent' as const,
      target: { current: 125600, goal: 150000, unit: 'NT$' },
      description: '距離月度目標還差 24.4K，有望達成'
    },
    {
      title: '客戶滿意度',
      value: '4.8★',
      change: { value: 4.2, type: 'increase' as const, period: '本月' },
      icon: <Star className="h-5 w-5" />,
      status: 'excellent' as const,
      description: '本月收到 45 則五星好評，服務品質優異'
    },
    {
      title: '準時交付率',
      value: '98.5%',
      change: { value: 2.1, type: 'increase' as const, period: '本週' },
      icon: <Truck className="h-5 w-5" />,
      status: 'excellent' as const,
      target: { current: 985, goal: 950, unit: '‰' },
      description: '超越行業標準，建立良好口碑'
    },
    {
      title: '待處理訂單',
      value: 8,
      change: { value: 12, type: 'decrease' as const, period: '昨日' },
      icon: <Clock className="h-5 w-5" />,
      status: 'good' as const,
      description: '處理效率提升，待辦事項減少'
    },
    {
      title: '合作餐廳',
      value: 23,
      change: { value: 15, type: 'increase' as const, period: '本季' },
      icon: <Users className="h-5 w-5" />,
      status: 'good' as const,
      description: '客戶基數穩定擴大，市場覆蓋增強'
    },
    {
      title: '產品品項',
      value: 156,
      change: { value: 8, type: 'increase' as const, period: '本月' },
      icon: <Package className="h-5 w-5" />,
      status: 'good' as const,
      description: '新增季節性產品，豐富產品線'
    },
    {
      title: '品質異常率',
      value: '0.8%',
      change: { value: 25, type: 'decrease' as const, period: '本月' },
      icon: <AlertCircle className="h-5 w-5" />,
      status: 'excellent' as const,
      description: '品質控制成效顯著，客訴件數下降'
    }
  ]

  // 關鍵成就
  const achievements = [
    {
      title: '金牌供應商',
      description: '連續 6 個月保持 4.8+ 評分',
      icon: <Star className="h-4 w-4 text-yellow-500" />,
      badge: '認證'
    },
    {
      title: '準時交付王',
      description: '本季準時率 98.5%，排名第一',
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      badge: '排行榜'
    },
    {
      title: '客戶之選',
      description: '15 家餐廳指定首選供應商',
      icon: <Users className="h-4 w-4 text-blue-500" />,
      badge: '優選'
    }
  ]

  return (
    <section aria-labelledby="supplier-overview-title">
      <div className="sr-only">
        <h2 id="supplier-overview-title">供應商營運指標總覽</h2>
      </div>
      
      <div className="space-y-6">
        {/* 核心指標卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {supplierMetrics.map((metric, index) => (
            <SupplierMetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={metric.icon}
              status={metric.status}
              description={metric.description}
              target={metric.target}
            />
          ))}
        </div>

        {/* 成就與認證 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>近期成就與認證</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                >
                  <div className="flex-shrink-0">
                    {achievement.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {achievement.title}
                      </h4>
                      <Badge variant="success" size="sm">
                        {achievement.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 本週目標進度 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">本週營運目標</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">訂單完成率</span>
                  <span className="text-sm font-bold text-green-600">95%</span>
                </div>
                <Progress value={95} className="h-2" variant="success" />
                <p className="text-xs text-gray-500">目標 90%，已超額達成</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">新客戶開發</span>
                  <span className="text-sm font-bold text-blue-600">3/5</span>
                </div>
                <Progress value={60} className="h-2" variant="solid" />
                <p className="text-xs text-gray-500">還需 2 家新客戶達成週目標</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">營收目標</span>
                  <span className="text-sm font-bold text-green-600">NT$ 32K</span>
                </div>
                <Progress value={88} className="h-2" variant="success" />
                <p className="text-xs text-gray-500">已達成 88%，預估可達成</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">客戶滿意度</span>
                  <span className="text-sm font-bold text-green-600">4.8★</span>
                </div>
                <Progress value={96} className="h-2" variant="success" />
                <p className="text-xs text-gray-500">超越 4.5★ 目標，表現優異</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}