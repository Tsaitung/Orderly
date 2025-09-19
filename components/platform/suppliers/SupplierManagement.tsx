'use client'

import React from 'react'
import { 
  Search,
  Filter,
  Building2,
  MapPin,
  Phone,
  Mail,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  FileCheck
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// Mock data - 稍後會連接到真實數據庫
const mockSuppliers = [
  {
    id: 'supplier-1',
    name: '新鮮食材有限公司',
    contactPerson: '陳經理',
    email: 'chen@freshfood.com',
    phone: '02-2345-6789',
    address: '台北市中山區民生東路123號',
    status: 'active',
    tier: 'premium',
    rating: 4.8,
    joinDate: '2023-03-15',
    metrics: {
      monthlyGMV: 1235680,
      gmvGrowth: 23.5,
      totalOrders: 892,
      orderGrowth: 18.2,
      avgOrderValue: 1385,
      fulfillmentRate: 98.5,
      onTimeRate: 96.8,
      qualityScore: 4.7
    },
    categories: ['蔬菜', '水果', '肉類'],
    lastOrderDate: '2025-09-18',
    contractExpiry: '2025-12-31'
  },
  {
    id: 'supplier-2',
    name: '優質農產品供應',
    contactPerson: '林總監',
    email: 'lin@quality-agri.com',
    phone: '04-2876-5432',
    address: '台中市西屯區台灣大道456號',
    status: 'active',
    tier: 'gold',
    rating: 4.6,
    joinDate: '2023-05-22',
    metrics: {
      monthlyGMV: 987450,
      gmvGrowth: 18.7,
      totalOrders: 756,
      orderGrowth: 15.3,
      avgOrderValue: 1305,
      fulfillmentRate: 97.2,
      onTimeRate: 95.4,
      qualityScore: 4.5
    },
    categories: ['有機蔬菜', '水果'],
    lastOrderDate: '2025-09-17',
    contractExpiry: '2025-11-30'
  },
  {
    id: 'supplier-3',
    name: '海鮮直送批發',
    contactPerson: '王先生',
    email: 'wang@seafresh.com',
    phone: '07-3456-7890',
    address: '高雄市前鎮區中山四路789號',
    status: 'pending',
    tier: 'silver',
    rating: 4.3,
    joinDate: '2023-08-10',
    metrics: {
      monthlyGMV: 854320,
      gmvGrowth: 15.2,
      totalOrders: 634,
      orderGrowth: 12.8,
      avgOrderValue: 1347,
      fulfillmentRate: 94.8,
      onTimeRate: 92.1,
      qualityScore: 4.2
    },
    categories: ['海鮮', '冷凍食品'],
    lastOrderDate: '2025-09-16',
    contractExpiry: '2025-10-15'
  },
  {
    id: 'supplier-4',
    name: '有機蔬果農場',
    contactPerson: '張董事長',
    email: 'zhang@organic-farm.com',
    phone: '03-4567-8901',
    address: '桃園市中壢區環北路321號',
    status: 'inactive',
    tier: 'bronze',
    rating: 4.1,
    joinDate: '2022-12-01',
    metrics: {
      monthlyGMV: 743210,
      gmvGrowth: 28.9,
      totalOrders: 523,
      orderGrowth: 25.6,
      avgOrderValue: 1421,
      fulfillmentRate: 96.3,
      onTimeRate: 94.7,
      qualityScore: 4.3
    },
    categories: ['有機蔬菜', '有機水果'],
    lastOrderDate: '2025-08-28',
    contractExpiry: '2025-12-01'
  }
]

interface SupplierCardProps {
  supplier: typeof mockSuppliers[0]
}

function SupplierCard({ supplier }: SupplierCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">營運中</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">審核中</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">暫停營運</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const getTierBadge = (tier: string) => {
    const colors = {
      premium: 'bg-purple-100 text-purple-800',
      gold: 'bg-yellow-100 text-yellow-800',
      silver: 'bg-gray-100 text-gray-800',
      bronze: 'bg-orange-100 text-orange-800'
    }
    const labels = {
      premium: '白金',
      gold: '金牌',
      silver: '銀牌',
      bronze: '銅牌'
    }
    return <Badge className={colors[tier as keyof typeof colors]}>{labels[tier as keyof typeof labels]}</Badge>
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(supplier.status)}
                {getTierBadge(supplier.tier)}
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
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Ban className="mr-2 h-4 w-4" />
                暫停合作
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 聯絡資訊 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{supplier.phone}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Mail className="h-4 w-4" />
            <span className="truncate">{supplier.email}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600 sm:col-span-2">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{supplier.address}</span>
          </div>
        </div>

        {/* 關鍵指標 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              NT$ {(supplier.metrics.monthlyGMV / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-gray-500">月 GMV</div>
            <div className="flex items-center justify-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{supplier.metrics.gmvGrowth}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {supplier.metrics.totalOrders}
            </div>
            <div className="text-xs text-gray-500">月訂單</div>
            <div className="flex items-center justify-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{supplier.metrics.orderGrowth}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {supplier.metrics.fulfillmentRate}%
            </div>
            <div className="text-xs text-gray-500">履約率</div>
            <div className="flex items-center justify-center">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-3 w-3",
                      i < Math.floor(supplier.rating) 
                        ? "text-yellow-400 fill-current" 
                        : "text-gray-300"
                    )} 
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {supplier.metrics.onTimeRate}%
            </div>
            <div className="text-xs text-gray-500">準時率</div>
            <div className="text-xs text-gray-600">
              品質 {supplier.metrics.qualityScore}/5.0
            </div>
          </div>
        </div>

        {/* 產品類別 */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">主要類別</div>
          <div className="flex flex-wrap gap-2">
            {supplier.categories.map((category) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* 底部資訊 */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
          <span>加入日期: {new Date(supplier.joinDate).toLocaleDateString('zh-TW')}</span>
          <span>合約到期: {new Date(supplier.contractExpiry).toLocaleDateString('zh-TW')}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function SupplierManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [tierFilter, setTierFilter] = React.useState('all')
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards')

  const filteredSuppliers = mockSuppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter
    const matchesTier = tierFilter === 'all' || supplier.tier === tierFilter
    return matchesSearch && matchesStatus && matchesTier
  })

  const totalSuppliers = mockSuppliers.length
  const activeSuppliers = mockSuppliers.filter(s => s.status === 'active').length
  const pendingSuppliers = mockSuppliers.filter(s => s.status === 'pending').length
  const totalGMV = mockSuppliers.reduce((sum, s) => sum + s.metrics.monthlyGMV, 0)
  const avgRating = mockSuppliers.reduce((sum, s) => sum + s.rating, 0) / mockSuppliers.length

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總供應商</p>
                <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">營運中</p>
                <p className="text-2xl font-bold text-green-600">{activeSuppliers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">審核中</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingSuppliers}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總 GMV</p>
                <p className="text-2xl font-bold text-primary-600">
                  NT$ {(totalGMV / 1000000).toFixed(1)}M
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
                  placeholder="搜尋供應商名稱或聯絡人..."
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
                <option value="active">營運中</option>
                <option value="pending">審核中</option>
                <option value="inactive">暫停</option>
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">所有等級</option>
                <option value="premium">白金</option>
                <option value="gold">金牌</option>
                <option value="silver">銀牌</option>
                <option value="bronze">銅牌</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 供應商列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            供應商列表 ({filteredSuppliers.length})
          </h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.id} supplier={supplier} />
          ))}
        </div>

        {filteredSuppliers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                找不到符合條件的供應商
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