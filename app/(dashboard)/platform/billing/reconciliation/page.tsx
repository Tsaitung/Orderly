'use client'

import { useState, useEffect } from 'react'
import {
  Calculator,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Check,
  X,
  FileText,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Store,
  DollarSign,
  Calendar,
  Eye,
  RefreshCw,
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

// 模擬對帳數據
const mockReconciliations = [
  {
    id: 'recon_001',
    type: 'supplier',
    entity_id: 'supplier_001',
    entity_name: '陽明春天生鮮',
    period: '2024-09',
    status: 'completed',
    platform_amount: 68400,
    entity_amount: 68400,
    difference: 0,
    created_date: new Date('2024-10-01'),
    completed_date: new Date('2024-10-02'),
    line_items_count: 156,
    matched_items: 156,
    unmatched_items: 0,
  },
  {
    id: 'recon_002',
    type: 'restaurant',
    entity_id: 'rest_001',
    entity_name: '老張牛肉麵',
    period: '2024-09',
    status: 'pending',
    platform_amount: 3000,
    entity_amount: 3000,
    difference: 0,
    created_date: new Date('2024-10-01'),
    line_items_count: 1,
    matched_items: 1,
    unmatched_items: 0,
  },
  {
    id: 'recon_003',
    type: 'supplier',
    entity_id: 'supplier_003',
    entity_name: '新鮮食材',
    period: '2024-09',
    status: 'disputed',
    platform_amount: 45600,
    entity_amount: 43200,
    difference: -2400,
    created_date: new Date('2024-10-01'),
    line_items_count: 89,
    matched_items: 85,
    unmatched_items: 4,
  },
  {
    id: 'recon_004',
    type: 'restaurant',
    entity_id: 'rest_003',
    entity_name: '金龍餐廳集團',
    period: '2024-09',
    status: 'auto_matched',
    platform_amount: 12000,
    entity_amount: 12000,
    difference: 0,
    created_date: new Date('2024-10-01'),
    completed_date: new Date('2024-10-01'),
    line_items_count: 1,
    matched_items: 1,
    unmatched_items: 0,
  },
]

const mockMetrics = {
  total_reconciliations: 156,
  pending_reconciliations: 23,
  disputed_reconciliations: 8,
  auto_matched_rate: 0.847,
  average_completion_time: 1.2,
  total_amount_reconciled: 2456780,
  disputed_amount: 45600,
}

const reconciliationTypeLabels = {
  supplier: '供應商對帳',
  restaurant: '餐廳對帳',
}

const reconciliationTypeColors = {
  supplier: 'text-blue-600 bg-blue-50 border-blue-200',
  restaurant: 'text-green-600 bg-green-50 border-green-200',
}

const reconciliationTypeIcons = {
  supplier: Building2,
  restaurant: Store,
}

const statusLabels = {
  pending: '待處理',
  auto_matched: '自動配對',
  manual_review: '人工審核',
  completed: '已完成',
  disputed: '有爭議',
  failed: '失敗',
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  auto_matched: 'bg-blue-100 text-blue-800',
  manual_review: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
}

const statusIcons = {
  pending: Clock,
  auto_matched: RefreshCw,
  manual_review: Eye,
  completed: CheckCircle,
  disputed: AlertTriangle,
  failed: X,
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatPercentage(rate: number) {
  return `${(rate * 100).toFixed(1)}%`
}

function getDifferenceColor(difference: number) {
  if (difference === 0) return 'text-green-600'
  return difference > 0 ? 'text-blue-600' : 'text-red-600'
}

export default function ReconciliationPage() {
  const [reconciliations, setReconciliations] = useState(mockReconciliations)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('all')

  const filteredReconciliations = reconciliations.filter(recon => {
    const matchesSearch =
      recon.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recon.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || recon.type === typeFilter
    const matchesStatus = statusFilter === 'all' || recon.status === statusFilter

    return matchesSearch && matchesType && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
            <div className="rounded-lg bg-purple-50 p-2">
              <Calculator className="h-8 w-8 text-purple-600" />
            </div>
            對帳管理
          </h1>
          <p className="mt-2 text-gray-600">自動對帳與異常處理</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            上傳對帳文件
          </Button>
          <Button className="bg-purple-600 text-white hover:bg-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            手動建立對帳
          </Button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-purple-50 p-2">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">總對帳數</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockMetrics.total_reconciliations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-yellow-50 p-2">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">待處理</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockMetrics.pending_reconciliations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-red-50 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">有爭議</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockMetrics.disputed_reconciliations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-50 p-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">自動配對率</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(mockMetrics.auto_matched_rate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-purple-50 p-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">對帳金額</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockMetrics.total_amount_reconciled)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-50 p-2">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均完成時間</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockMetrics.average_completion_time} 天
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
                  placeholder="搜尋對帳單號或實體名稱..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="類型篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部類型</SelectItem>
                <SelectItem value="supplier">供應商</SelectItem>
                <SelectItem value="restaurant">餐廳</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="狀態篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                <SelectItem value="pending">待處理</SelectItem>
                <SelectItem value="disputed">有爭議</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="auto_matched">自動配對</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 標籤頁 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">全部對帳</TabsTrigger>
          <TabsTrigger value="supplier" className="text-blue-600">
            🔵 供應商對帳
          </TabsTrigger>
          <TabsTrigger value="restaurant" className="text-green-600">
            🟢 餐廳對帳
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ReconciliationTable reconciliations={filteredReconciliations} />
        </TabsContent>

        <TabsContent value="supplier" className="space-y-4">
          <ReconciliationTable
            reconciliations={filteredReconciliations.filter(r => r.type === 'supplier')}
          />
        </TabsContent>

        <TabsContent value="restaurant" className="space-y-4">
          <ReconciliationTable
            reconciliations={filteredReconciliations.filter(r => r.type === 'restaurant')}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReconciliationTable({ reconciliations }: { reconciliations: typeof mockReconciliations }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-purple-600" />
          對帳記錄
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>對帳資訊</TableHead>
              <TableHead>類型</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>平台金額</TableHead>
              <TableHead>對方金額</TableHead>
              <TableHead>差異</TableHead>
              <TableHead>配對狀況</TableHead>
              <TableHead>完成時間</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reconciliations.map(recon => {
              const TypeIcon = reconciliationTypeIcons[recon.type]
              const StatusIcon = statusIcons[recon.status]

              return (
                <TableRow key={recon.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{recon.entity_name}</div>
                      <div className="text-sm text-gray-500">{recon.id}</div>
                      <div className="text-xs text-gray-400">{recon.period}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4" />
                      <Badge className={cn('', reconciliationTypeColors[recon.type])}>
                        {reconciliationTypeLabels[recon.type]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      <Badge className={cn('', statusColors[recon.status])}>
                        {statusLabels[recon.status]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(recon.platform_amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-gray-900">
                      {formatCurrency(recon.entity_amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn('font-medium', getDifferenceColor(recon.difference))}>
                      {recon.difference === 0
                        ? '無差異'
                        : formatCurrency(Math.abs(recon.difference))}
                      {recon.difference !== 0 && (
                        <div className="text-xs text-gray-500">
                          {recon.difference > 0 ? '平台多收' : '平台少收'}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="text-green-600">{recon.matched_items} 已配對</div>
                      {recon.unmatched_items > 0 && (
                        <div className="text-red-600">{recon.unmatched_items} 未配對</div>
                      )}
                      <div className="text-xs text-gray-500">共 {recon.line_items_count} 項</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {recon.completed_date ? (
                        <>
                          <div>{recon.completed_date.toLocaleDateString('zh-TW')}</div>
                          <div className="text-xs text-gray-500">
                            {Math.ceil(
                              (recon.completed_date.getTime() - recon.created_date.getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            天
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-500">進行中</div>
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
                          <Eye className="mr-2 h-4 w-4" />
                          查看詳情
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          下載報表
                        </DropdownMenuItem>
                        {recon.status === 'pending' && (
                          <>
                            <DropdownMenuItem>
                              <Check className="mr-2 h-4 w-4" />
                              標記完成
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <AlertTriangle className="mr-2 h-4 w-4" />
                              標記爭議
                            </DropdownMenuItem>
                          </>
                        )}
                        {recon.status === 'disputed' && (
                          <DropdownMenuItem>
                            <Check className="mr-2 h-4 w-4" />
                            解決爭議
                          </DropdownMenuItem>
                        )}
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
  )
}
