'use client'

import React from 'react'
import { 
  Search,
  Filter,
  Users,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  MoreVertical,
  Eye,
  Edit,
  CreditCard,
  Calendar,
  Award,
  Store
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Mock data - 稍後會連接到真實數據庫
const mockCustomers = [
  {
    id: 'customer-1',
    name: '港式茶餐廳',
    businessType: '茶餐廳',
    contactPerson: '李經理',
    email: 'li@hkcafe.com',
    phone: '02-2345-6789',
    address: '台北市大安區忠孝東路456號',
    status: 'active',
    subscriptionTier: 'professional',
    subscriptionExpiry: '2025-12-31',
    joinDate: '2023-04-10',
    metrics: {
      monthlySpend: 156780,
      spendGrowth: 18.5,
      totalOrders: 142,
      orderGrowth: 22.3,
      avgOrderValue: 1105,
      orderFrequency: 4.7, // orders per week
      loyaltyScore: 8.2,
      paymentReliability: 98.5
    },
    preferences: {
      primaryCategories: ['蔬菜', '肉類', '調味料'],
      orderDays: ['週一', '週三', '週五'],
      deliveryWindow: '早上 8-10點'
    },
    lastOrderDate: '2025-09-17',
    totalLifetimeValue: 1892340
  },
  {
    id: 'customer-2',
    name: '義式餐廳 Bella Vista',
    businessType: '義式料理',
    contactPerson: '張主廚',
    email: 'chef@bellavista.com',
    phone: '04-2876-5432',
    address: '台中市西屯區台灣大道789號',
    status: 'active',
    subscriptionTier: 'enterprise',
    subscriptionExpiry: '2026-03-15',
    joinDate: '2023-01-15',
    metrics: {
      monthlySpend: 234560,
      spendGrowth: 15.2,
      totalOrders: 98,
      orderGrowth: 12.8,
      avgOrderValue: 2393,
      orderFrequency: 3.2,
      loyaltyScore: 9.1,
      paymentReliability: 99.2
    },
    preferences: {
      primaryCategories: ['海鮮', '起司', '橄欖油', '香草'],
      orderDays: ['週二', '週四', '週六'],
      deliveryWindow: '下午 2-4點'
    },
    lastOrderDate: '2025-09-18',
    totalLifetimeValue: 2847920
  },
  {
    id: 'customer-3',
    name: '日式拉麵店',
    businessType: '日式料理',
    contactPerson: '田中先生',
    email: 'tanaka@ramen.com',
    phone: '07-3456-7890',
    address: '高雄市前鎮區中山四路321號',
    status: 'trial',
    subscriptionTier: 'free',
    subscriptionExpiry: '2025-10-20',
    joinDate: '2025-09-01',
    metrics: {
      monthlySpend: 45680,
      spendGrowth: 0, // new customer
      totalOrders: 23,
      orderGrowth: 0,
      avgOrderValue: 1986,
      orderFrequency: 2.3,
      loyaltyScore: 6.5,
      paymentReliability: 95.7
    },
    preferences: {
      primaryCategories: ['麵條', '豚骨', '蔬菜'],
      orderDays: ['週一', '週四'],
      deliveryWindow: '上午 10-12點'
    },
    lastOrderDate: '2025-09-16',
    totalLifetimeValue: 45680
  },
  {
    id: 'customer-4',
    name: '川菜館',
    businessType: '川菜',
    contactPerson: '王廚師',
    email: 'wang@sichuanhouse.com',
    phone: '03-4567-8901',
    address: '桃園市中壢區環北路654號',
    status: 'inactive',
    subscriptionTier: 'professional',
    subscriptionExpiry: '2025-09-30',
    joinDate: '2022-11-20',
    metrics: {
      monthlySpend: 0,
      spendGrowth: -100,
      totalOrders: 0,
      orderGrowth: -100,
      avgOrderValue: 1456,
      orderFrequency: 0,
      loyaltyScore: 4.2,
      paymentReliability: 85.3
    },
    preferences: {
      primaryCategories: ['豬肉', '辣椒', '花椒', '豆瓣醬'],
      orderDays: ['週三', '週六'],
      deliveryWindow: '下午 3-5點'
    },
    lastOrderDate: '2025-07-15',
    totalLifetimeValue: 892340
  }
]

interface CustomerCardProps {
  customer: typeof mockCustomers[0]
}

function CustomerCard({ customer }: CustomerCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">活躍</Badge>
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800">試用中</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">非活躍</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getSubscriptionBadge = (tier: string) => {
    const configs = {
      free: { label: '免費版', className: 'bg-gray-100 text-gray-800' },
      professional: { label: '專業版', className: 'bg-blue-100 text-blue-800' },
      enterprise: { label: '企業版', className: 'bg-purple-100 text-purple-800' }
    }
    const config = configs[tier as keyof typeof configs] || configs.free
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getLoyaltyLevel = (score: number) => {
    if (score >= 8.5) return { label: '優質', color: 'text-green-600' }
    if (score >= 7.0) return { label: '良好', color: 'text-blue-600' }
    if (score >= 5.0) return { label: '普通', color: 'text-yellow-600' }
    return { label: '需關注', color: 'text-red-600' }
  }

  const loyalty = getLoyaltyLevel(customer.metrics.loyaltyScore)

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Store className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{customer.name}</CardTitle>
              <div className="text-sm text-gray-500">{customer.businessType}</div>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(customer.status)}
                {getSubscriptionBadge(customer.subscriptionTier)}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                查看詳情
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                編輯資料
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                訂閱管理
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Calendar className="mr-2 h-4 w-4" />
                預約回訪
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 聯絡資訊 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{customer.contactPerson}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{customer.phone}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 sm:col-span-2">
            <Mail className="h-4 w-4" />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 sm:col-span-2">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{customer.address}</span>
          </div>
        </div>

        {/* 關鍵指標 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              NT$ {(customer.metrics.monthlySpend / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-gray-500">月消費</div>
            {customer.metrics.spendGrowth !== 0 && (
              <div className={cn(
                "flex items-center justify-center text-xs",
                customer.metrics.spendGrowth > 0 ? "text-green-600" : "text-red-600"
              )}>
                {customer.metrics.spendGrowth > 0 ? 
                  <TrendingUp className="h-3 w-3 mr-1" /> : 
                  <TrendingDown className="h-3 w-3 mr-1" />
                }
                {customer.metrics.spendGrowth > 0 ? '+' : ''}{customer.metrics.spendGrowth}%
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {customer.metrics.totalOrders}
            </div>
            <div className="text-xs text-gray-500">月訂單</div>
            <div className="text-xs text-gray-600">
              平均 {customer.metrics.orderFrequency} 次/週
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              NT$ {customer.metrics.avgOrderValue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">平均客單</div>
            <div className="text-xs text-gray-600">
              付款率 {customer.metrics.paymentReliability}%
            </div>
          </div>
          <div className="text-center">
            <div className={cn("text-lg font-bold", loyalty.color)}>
              {customer.metrics.loyaltyScore.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">忠誠度</div>
            <div className={cn("text-xs font-medium", loyalty.color)}>
              {loyalty.label}
            </div>
          </div>
        </div>

        {/* 訂購偏好 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">主要品項</div>
          <div className="flex flex-wrap gap-2">
            {customer.preferences.primaryCategories.map((category) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* 訂購習慣 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-600">常訂購日</div>
            <div className="font-medium">{customer.preferences.orderDays.join(', ')}</div>
          </div>
          <div>
            <div className="text-gray-600">偏好送貨時間</div>
            <div className="font-medium">{customer.preferences.deliveryWindow}</div>
          </div>
        </div>

        {/* 底部資訊 */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <div className="space-y-1">
            <div>加入: {new Date(customer.joinDate).toLocaleDateString('zh-TW')}</div>
            <div>LTV: NT$ {(customer.totalLifetimeValue / 1000).toFixed(0)}K</div>
          </div>
          <div className="text-right space-y-1">
            <div>最後訂購: {new Date(customer.lastOrderDate).toLocaleDateString('zh-TW')}</div>
            <div>訂閱到期: {new Date(customer.subscriptionExpiry).toLocaleDateString('zh-TW')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomerManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [tierFilter, setTierFilter] = React.useState('all')

  const filteredCustomers = mockCustomers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.businessType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter
    const matchesTier = tierFilter === 'all' || customer.subscriptionTier === tierFilter
    return matchesSearch && matchesStatus && matchesTier
  })

  const totalCustomers = mockCustomers.length
  const activeCustomers = mockCustomers.filter(c => c.status === 'active').length
  const trialCustomers = mockCustomers.filter(c => c.status === 'trial').length
  const totalSpend = mockCustomers.reduce((sum, c) => sum + c.metrics.monthlySpend, 0)
  const avgLoyalty = mockCustomers.reduce((sum, c) => sum + c.metrics.loyaltyScore, 0) / mockCustomers.length

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總客戶數</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活躍客戶</p>
                <p className="text-2xl font-bold text-green-600">{activeCustomers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">試用客戶</p>
                <p className="text-2xl font-bold text-blue-600">{trialCustomers}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">月消費總額</p>
                <p className="text-2xl font-bold text-primary-600">
                  NT$ {(totalSpend / 1000).toFixed(0)}K
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋和篩選 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋餐廳名稱、聯絡人或料理類型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">所有狀態</option>
                <option value="active">活躍</option>
                <option value="trial">試用中</option>
                <option value="inactive">非活躍</option>
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">所有方案</option>
                <option value="free">免費版</option>
                <option value="professional">專業版</option>
                <option value="enterprise">企業版</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 客戶列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            客戶列表 ({filteredCustomers.length})
          </h3>
          <div className="text-sm text-gray-500">
            平均忠誠度: {avgLoyalty.toFixed(1)}/10.0
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                找不到符合條件的客戶
              </h3>
              <p className="text-gray-500">
                請調整搜尋條件或篩選器重新查詢
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}