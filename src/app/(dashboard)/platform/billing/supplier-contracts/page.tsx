'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
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
  Percent,
  Calculator,
  Users,
  Crown,
  Award,
  Star,
  Gem,
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
  SupplierContract,
  SupplierContractStatus,
  SupplierScope,
  RatingTier,
  PricingModel,
  SupplierFeeType,
} from '@/types/billing-supplier'

// 模擬數據
const mockContracts: SupplierContract[] = [
  {
    id: '1',
    contract_code: 'SUP-001-2024',
    name: '陽明春天生鮮交易合約',
    supplier_id: 'supplier_001',
    scope: 'supplier',
    status: 'active',
    version: 2,
    effective_from: new Date('2024-01-01'),
    effective_to: new Date('2024-12-31'),
    fee_lines: [
      {
        fee_line_id: 'fl_001',
        fee_type: 'transaction_fee',
        label: '交易佣金',
        pricing_model: 'tiered',
        value: {
          tiers: [
            { tier_id: 't1', name: '新手級', min_gmv: 0, max_gmv: 50000, rate: 0.03 },
            { tier_id: 't2', name: '成長級', min_gmv: 50001, max_gmv: 200000, rate: 0.025 },
            { tier_id: 't3', name: '成熟級', min_gmv: 200001, rate: 0.02 },
          ],
        },
        applies_to: 'all',
        billing_cycle: 'monthly',
        enabled: true,
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-15'),
    createdBy: 'admin@orderly.com',
  },
  {
    id: '2',
    contract_code: 'SUP-002-2024',
    name: '全球供應商標準合約',
    scope: 'global',
    status: 'active',
    version: 1,
    effective_from: new Date('2024-01-01'),
    fee_lines: [
      {
        fee_line_id: 'fl_002',
        fee_type: 'transaction_fee',
        label: '預設交易費率',
        pricing_model: 'percentage',
        value: 0.008,
        applies_to: 'all',
        billing_cycle: 'per_order',
        enabled: true,
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

const mockMetrics = {
  total_contracts: 156,
  active_contracts: 142,
  pending_approval: 8,
  total_gmv: 2850000,
  total_commission: 68400,
  average_rate: 0.024,
}

const ratingTierIcons = {
  Bronze: Users,
  Silver: Star,
  Gold: Crown,
  Platinum: Gem,
}

const ratingTierColors = {
  Bronze: 'text-amber-600 bg-amber-50',
  Silver: 'text-gray-600 bg-gray-50',
  Gold: 'text-yellow-600 bg-yellow-50',
  Platinum: 'text-purple-600 bg-purple-50',
}

const pricingModelLabels = {
  percentage: '百分比',
  fixed: '固定費用',
  tiered: '分層費率',
  formula: '公式計算',
}

const pricingModelIcons = {
  percentage: Percent,
  fixed: DollarSign,
  tiered: TrendingUp,
  formula: Calculator,
}

const statusLabels = {
  draft: '草稿',
  pending_approval: '待審核',
  active: '生效中',
  paused: '暫停',
  terminated: '已終止',
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-orange-100 text-orange-800',
  terminated: 'bg-red-100 text-red-800',
}

const scopeLabels = {
  global: '全域',
  supplier_group: '供應商群組',
  supplier: '單一供應商',
  sku: 'SKU級別',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatPercentage(rate: number) {
  return `${(rate * 100).toFixed(2)}%`
}

function renderPricingValue(pricingModel: PricingModel, value: any) {
  switch (pricingModel) {
    case 'percentage':
      return formatPercentage(value as number)
    case 'fixed':
      return formatCurrency(value as number)
    case 'tiered':
      const tierConfig = value as {
        tiers: Array<{ min_gmv: number; max_gmv?: number; rate: number }>
      }
      return `${tierConfig.tiers.length} 階層`
    case 'formula':
      return '公式計算'
    default:
      return '-'
  }
}

export default function SupplierContractsPage() {
  const [contracts, setContracts] = useState<SupplierContract[]>(mockContracts)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [scopeFilter, setScopeFilter] = useState<string>('all')

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch =
      contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    const matchesScope = scopeFilter === 'all' || contract.scope === scopeFilter

    return matchesSearch && matchesStatus && matchesScope
  })

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <div className="rounded-lg bg-blue-50 p-2">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            供應商合約管理
          </h1>
          <p className="mt-2 text-gray-600">🔵 管理供應商交易費率、增值服務與合約條款</p>
        </div>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          新增合約
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-50 p-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總合約數</p>
                <p className="text-2xl font-bold text-gray-900">{mockMetrics.total_contracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-50 p-2">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">生效中</p>
                <p className="text-2xl font-bold text-gray-900">{mockMetrics.active_contracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-yellow-50 p-2">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待審核</p>
                <p className="text-2xl font-bold text-gray-900">{mockMetrics.pending_approval}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-50 p-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總 GMV</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockMetrics.total_gmv)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-50 p-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總佣金</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockMetrics.total_commission)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-50 p-2">
                <Percent className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均費率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(mockMetrics.average_rate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 篩選與搜尋 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="搜尋合約名稱或編號..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="狀態篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="active">生效中</SelectItem>
                <SelectItem value="pending_approval">待審核</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="paused">暫停</SelectItem>
                <SelectItem value="terminated">已終止</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="範圍篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部範圍</SelectItem>
                <SelectItem value="global">全域</SelectItem>
                <SelectItem value="supplier_group">供應商群組</SelectItem>
                <SelectItem value="supplier">單一供應商</SelectItem>
                <SelectItem value="sku">SKU級別</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 合約列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            合約列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>合約資訊</TableHead>
                <TableHead>範圍</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>定價模式</TableHead>
                <TableHead>費率</TableHead>
                <TableHead>生效期間</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map(contract => {
                const primaryFeeLine =
                  contract.fee_lines.find(fl => fl.fee_type === 'transaction_fee') ||
                  contract.fee_lines[0]
                const PricingIcon = pricingModelIcons[primaryFeeLine?.pricing_model] || DollarSign

                return (
                  <TableRow key={contract.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{contract.name}</div>
                        <div className="text-sm text-gray-500">{contract.contract_code}</div>
                        <div className="text-xs text-gray-400">v{contract.version}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-blue-200 text-blue-600">
                        {scopeLabels[contract.scope]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('', statusColors[contract.status])}>
                        {statusLabels[contract.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PricingIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          {pricingModelLabels[primaryFeeLine?.pricing_model]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-blue-600">
                        {primaryFeeLine
                          ? renderPricingValue(primaryFeeLine.pricing_model, primaryFeeLine.value)
                          : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{contract.effective_from.toLocaleDateString('zh-TW')}</div>
                        {contract.effective_to && (
                          <div className="text-gray-500">
                            至 {contract.effective_to.toLocaleDateString('zh-TW')}
                          </div>
                        )}
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
                            <Copy className="mr-2 h-4 w-4" />
                            複製
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            查看詳情
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            刪除
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
