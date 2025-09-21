'use client'

import { useState, useEffect } from 'react'
import { 
  Store, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit,
  Trash2,
  Copy,
  FileText,
  TrendingUp,
  DollarSign,
  Users,
  Building,
  Calendar,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  Zap,
  Shield,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { 
  RestaurantSubscription, 
  RestaurantPlanType, 
  RestaurantContractStatus,
  BillingCycle,
  FeatureFlag
} from '@/types/billing-restaurant'

// 模擬數據
const mockSubscriptions: RestaurantSubscription[] = [
  {
    id: '1',
    restaurant_id: 'rest_001',
    restaurant_name: '老張牛肉麵',
    plan_type: 'pro',
    status: 'active',
    current_users: 5,
    current_stores: 2,
    billing_cycle: 'monthly',
    monthly_base_fee: 3000,
    extra_user_charges: 0,
    extra_store_charges: 0,
    total_monthly_fee: 3000,
    started_date: new Date('2024-01-15'),
    next_billing_date: new Date('2024-10-15'),
    is_trial: false,
    consolidated_billing: true,
    cost_allocation_method: 'by_gmv',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-09-15')
  },
  {
    id: '2',
    restaurant_id: 'rest_002', 
    restaurant_name: '美味蒸餃',
    plan_type: 'free',
    status: 'active',
    current_users: 3,
    current_stores: 1,
    billing_cycle: 'monthly',
    monthly_base_fee: 0,
    extra_user_charges: 0,
    extra_store_charges: 0,
    total_monthly_fee: 0,
    started_date: new Date('2024-08-01'),
    next_billing_date: new Date('2024-10-01'),
    is_trial: false,
    consolidated_billing: false,
    cost_allocation_method: 'equal',
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-08-01')
  },
  {
    id: '3',
    restaurant_id: 'rest_003',
    restaurant_name: '金龍餐廳集團',
    plan_type: 'enterprise',
    status: 'active',
    current_users: 25,
    current_stores: 8,
    billing_cycle: 'yearly',
    monthly_base_fee: 12000,
    extra_user_charges: 0,
    extra_store_charges: 0,
    total_monthly_fee: 12000,
    started_date: new Date('2023-12-01'),
    next_billing_date: new Date('2024-12-01'),
    is_trial: false,
    consolidated_billing: true,
    cost_allocation_method: 'by_gmv',
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-09-01')
  }
]

const mockMetrics = {
  total_restaurants: 1247,
  total_revenue: 4560000,
  plan_distribution: {
    free: { count: 856, percentage: 68.6, revenue: 0 },
    pro: { count: 312, percentage: 25.0, revenue: 936000 },
    enterprise: { count: 79, percentage: 6.3, revenue: 3624000 }
  },
  churn_rate: 0.032,
  upgrade_rate: 0.125,
  average_revenue_per_user: 3657
}

const planTypeLabels = {
  free: 'Free 免費版',
  pro: 'Pro 專業版',
  enterprise: 'Enterprise 企業版'
}

const planTypeIcons = {
  free: Users,
  pro: Star,
  enterprise: Crown
}

const planTypeColors = {
  free: 'text-gray-600 bg-gray-50 border-gray-200',
  pro: 'text-green-600 bg-green-50 border-green-200',
  enterprise: 'text-purple-600 bg-purple-50 border-purple-200'
}

const statusLabels = {
  draft: '草稿',
  active: '生效中',
  paused: '暫停',
  cancelled: '已取消',
  expired: '已過期'
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
  expired: 'bg-red-100 text-red-800'
}

const statusIcons = {
  draft: Clock,
  active: CheckCircle,
  paused: Clock,
  cancelled: XCircle,
  expired: XCircle
}

const billingCycleLabels = {
  monthly: '月繳',
  quarterly: '季繳',
  yearly: '年繳'
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatPercentage(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}

export default function RestaurantContractsPage() {
  const [subscriptions, setSubscriptions] = useState<RestaurantSubscription[]>(mockSubscriptions)
  const [searchTerm, setSearchTerm] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.restaurant_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlan = planFilter === 'all' || subscription.plan_type === planFilter
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter
    
    return matchesSearch && matchesPlan && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Store className="h-8 w-8 text-green-600" />
            </div>
            餐廳方案管理
          </h1>
          <p className="text-gray-600 mt-2">🟢 管理餐廳訂閱方案、功能權限與計費設定</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          新增訂閱
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <Store className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總餐廳數</p>
                <p className="text-2xl font-bold text-gray-900">{mockMetrics.total_restaurants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總營收</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockMetrics.total_revenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Free 用戶</p>
                <p className="text-2xl font-bold text-gray-900">{mockMetrics.plan_distribution.free.count}</p>
                <p className="text-xs text-gray-500">{formatPercentage(mockMetrics.plan_distribution.free.percentage / 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pro 用戶</p>
                <p className="text-2xl font-bold text-gray-900">{mockMetrics.plan_distribution.pro.count}</p>
                <p className="text-xs text-gray-500">{formatPercentage(mockMetrics.plan_distribution.pro.percentage / 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enterprise</p>
                <p className="text-2xl font-bold text-gray-900">{mockMetrics.plan_distribution.enterprise.count}</p>
                <p className="text-xs text-gray-500">{formatPercentage(mockMetrics.plan_distribution.enterprise.percentage / 100)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ARPU</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(mockMetrics.average_revenue_per_user)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 方案分布概覽 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-600">
              <Users className="h-5 w-5" />
              Free 免費版
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">用戶數量</span>
                <span className="font-medium">{mockMetrics.plan_distribution.free.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">佔比</span>
                <span className="font-medium">{formatPercentage(mockMetrics.plan_distribution.free.percentage / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">營收</span>
                <span className="font-medium">{formatCurrency(mockMetrics.plan_distribution.free.revenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Star className="h-5 w-5" />
              Pro 專業版
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">用戶數量</span>
                <span className="font-medium">{mockMetrics.plan_distribution.pro.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">佔比</span>
                <span className="font-medium">{formatPercentage(mockMetrics.plan_distribution.pro.percentage / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">營收</span>
                <span className="font-medium">{formatCurrency(mockMetrics.plan_distribution.pro.revenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <Crown className="h-5 w-5" />
              Enterprise 企業版
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">用戶數量</span>
                <span className="font-medium">{mockMetrics.plan_distribution.enterprise.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">佔比</span>
                <span className="font-medium">{formatPercentage(mockMetrics.plan_distribution.enterprise.percentage / 100)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">營收</span>
                <span className="font-medium">{formatCurrency(mockMetrics.plan_distribution.enterprise.revenue)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 篩選與搜尋 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜尋餐廳名稱或 ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="方案篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部方案</SelectItem>
                <SelectItem value="free">Free 免費版</SelectItem>
                <SelectItem value="pro">Pro 專業版</SelectItem>
                <SelectItem value="enterprise">Enterprise 企業版</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="狀態篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="active">生效中</SelectItem>
                <SelectItem value="paused">暫停</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
                <SelectItem value="expired">已過期</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 訂閱列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-green-600" />
            訂閱列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>餐廳資訊</TableHead>
                <TableHead>方案類型</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>用戶/門店</TableHead>
                <TableHead>計費週期</TableHead>
                <TableHead>月費</TableHead>
                <TableHead>下次計費</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription) => {
                const PlanIcon = planTypeIcons[subscription.plan_type]
                const StatusIcon = statusIcons[subscription.status]
                
                return (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{subscription.restaurant_name}</div>
                        <div className="text-sm text-gray-500">{subscription.restaurant_id}</div>
                        {subscription.is_trial && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200 mt-1">
                            試用中
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PlanIcon className="h-4 w-4" />
                        <Badge className={cn('', planTypeColors[subscription.plan_type])}>
                          {planTypeLabels[subscription.plan_type]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        <Badge className={cn('', statusColors[subscription.status])}>
                          {statusLabels[subscription.status]}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-gray-400" />
                          <span>{subscription.current_users} 人</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-gray-400" />
                          <span>{subscription.current_stores} 店</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {billingCycleLabels[subscription.billing_cycle]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        {formatCurrency(subscription.total_monthly_fee)}
                      </div>
                      {subscription.extra_user_charges > 0 && (
                        <div className="text-xs text-gray-500">
                          +{formatCurrency(subscription.extra_user_charges)} (超額)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{subscription.next_billing_date.toLocaleDateString('zh-TW')}</div>
                        <div className="text-gray-500 text-xs">
                          {Math.ceil((subscription.next_billing_date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} 天後
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            編輯
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            升級/降級
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CreditCard className="mr-2 h-4 w-4" />
                            計費歷史
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            查看詳情
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            取消訂閱
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}