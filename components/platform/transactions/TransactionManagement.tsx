'use client'

import React from 'react'
import { 
  Search,
  Filter,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MoreVertical,
  Eye,
  RefreshCw,
  Download,
  DollarSign,
  Calendar,
  Building2,
  Store,
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
const mockTransactions = [
  {
    id: 'txn-001',
    orderNumber: 'ORD-2025-001234',
    timestamp: '2025-09-18T10:30:00Z',
    restaurant: '港式茶餐廳',
    supplier: '新鮮食材有限公司',
    amount: 12580,
    commission: 377.40, // 3% commission
    status: 'completed',
    paymentMethod: 'credit_card',
    reconciliationStatus: 'matched',
    category: 'vegetables',
    items: 15,
    processingTime: 2.5 // minutes
  },
  {
    id: 'txn-002',
    orderNumber: 'ORD-2025-001235',
    timestamp: '2025-09-18T11:15:00Z',
    restaurant: '義式餐廳 Bella Vista',
    supplier: '海鮮直送批發',
    amount: 28900,
    commission: 867.00, // 3% commission
    status: 'pending',
    paymentMethod: 'bank_transfer',
    reconciliationStatus: 'pending',
    category: 'seafood',
    items: 8,
    processingTime: 0
  },
  {
    id: 'txn-003',
    orderNumber: 'ORD-2025-001236',
    timestamp: '2025-09-18T09:45:00Z',
    restaurant: '日式拉麵店',
    supplier: '優質農產品供應',
    amount: 8650,
    commission: 259.50, // 3% commission
    status: 'failed',
    paymentMethod: 'credit_card',
    reconciliationStatus: 'disputed',
    category: 'noodles',
    items: 6,
    processingTime: 5.2
  },
  {
    id: 'txn-004',
    orderNumber: 'ORD-2025-001237',
    timestamp: '2025-09-18T14:20:00Z',
    restaurant: '川菜館',
    supplier: '肉品冷鏈專家',
    amount: 15420,
    commission: 462.60, // 3% commission
    status: 'processing',
    paymentMethod: 'digital_wallet',
    reconciliationStatus: 'auto_matched',
    category: 'meat',
    items: 12,
    processingTime: 1.8
  },
  {
    id: 'txn-005',
    orderNumber: 'ORD-2025-001238',
    timestamp: '2025-09-18T08:30:00Z',
    restaurant: '港式茶餐廳',
    supplier: '新鮮食材有限公司',
    amount: 19870,
    commission: 596.10, // 3% commission
    status: 'completed',
    paymentMethod: 'credit_card',
    reconciliationStatus: 'matched',
    category: 'mixed',
    items: 23,
    processingTime: 1.2
  }
]

// 實時監控數據
const mockRealTimeMetrics = {
  todayTransactions: 1247,
  todayVolume: 2847560,
  todayCommission: 85426,
  avgProcessingTime: 2.3,
  successRate: 96.8,
  pendingCount: 23,
  disputedCount: 5,
  reconciliationAccuracy: 98.2
}

interface TransactionTableProps {
  transactions: typeof mockTransactions
}

function TransactionTable({ transactions }: TransactionTableProps) {
  const getStatusBadge = (status: string) => {
    const configs = {
      completed: { label: '完成', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { label: '處理中', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { label: '執行中', className: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      failed: { label: '失敗', className: 'bg-red-100 text-red-800', icon: XCircle }
    }
    const config = configs[status as keyof typeof configs] || configs.pending
    const Icon = config.icon
    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getReconciliationBadge = (status: string) => {
    const configs = {
      matched: { label: '已匹配', className: 'bg-green-100 text-green-800' },
      auto_matched: { label: '自動匹配', className: 'bg-blue-100 text-blue-800' },
      pending: { label: '待對帳', className: 'bg-yellow-100 text-yellow-800' },
      disputed: { label: '有爭議', className: 'bg-red-100 text-red-800' }
    }
    const config = configs[status as keyof typeof configs] || configs.pending
    return <Badge className={config.className} variant="outline">{config.label}</Badge>
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return <CreditCard className="h-4 w-4" />
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />
      case 'digital_wallet':
        return <DollarSign className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>交易編號</TableHead>
            <TableHead>時間</TableHead>
            <TableHead>餐廳/供應商</TableHead>
            <TableHead>金額</TableHead>
            <TableHead>佣金</TableHead>
            <TableHead>狀態</TableHead>
            <TableHead>對帳狀態</TableHead>
            <TableHead>處理時間</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-gray-50">
              <TableCell>
                <div>
                  <div className="font-medium">{transaction.orderNumber}</div>
                  <div className="text-sm text-gray-500">{transaction.id}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {new Date(transaction.timestamp).toLocaleString('zh-TW')}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <Store className="h-3 w-3 mr-1 text-orange-600" />
                    {transaction.restaurant}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-3 w-3 mr-1 text-blue-600" />
                    {transaction.supplier}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-right">
                  <div className="font-medium">
                    NT$ {transaction.amount.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center justify-end">
                    {getPaymentMethodIcon(transaction.paymentMethod)}
                    <span className="ml-1">{transaction.items} 項</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="font-medium text-green-600">
                  NT$ {transaction.commission.toLocaleString()}
                </div>
              </TableCell>
              <TableCell>
                {getStatusBadge(transaction.status)}
              </TableCell>
              <TableCell>
                {getReconciliationBadge(transaction.reconciliationStatus)}
              </TableCell>
              <TableCell>
                <div className="text-right">
                  {transaction.processingTime > 0 ? (
                    <span className={cn(
                      "text-sm",
                      transaction.processingTime > 3 ? "text-red-600" : "text-green-600"
                    )}>
                      {transaction.processingTime.toFixed(1)} 分鐘
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
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
                      <FileCheck className="mr-2 h-4 w-4" />
                      對帳記錄
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      重新處理
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function TransactionManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [dateFilter, setDateFilter] = React.useState('today')
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [metrics, setMetrics] = React.useState(mockRealTimeMetrics)

  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = transaction.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.restaurant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const refreshData = async () => {
    setIsRefreshing(true)
    // 模擬 API 調用
    await new Promise(resolve => setTimeout(resolve, 1000))
    // 模擬更新數據
    setMetrics(prev => ({
      ...prev,
      todayTransactions: prev.todayTransactions + Math.floor(Math.random() * 10),
      pendingCount: Math.max(0, prev.pendingCount + Math.floor(Math.random() * 4 - 2))
    }))
    setIsRefreshing(false)
  }

  // 實時更新
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        todayTransactions: prev.todayTransactions + Math.floor(Math.random() * 3),
        todayVolume: prev.todayVolume + Math.floor(Math.random() * 50000),
        pendingCount: Math.max(0, prev.pendingCount + Math.floor(Math.random() * 2 - 1))
      }))
    }, 10000) // 每10秒更新

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* 即時監控指標 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">即時交易監控</h3>
          <Button 
            onClick={refreshData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            刷新
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">今日交易筆數</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.todayTransactions.toLocaleString()}</p>
                  <div className="flex items-center text-sm text-green-600 mt-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+12.5% 較昨日</span>
                  </div>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">今日交易金額</p>
                  <p className="text-2xl font-bold text-gray-900">
                    NT$ {(metrics.todayVolume / 1000000).toFixed(1)}M
                  </p>
                  <div className="flex items-center text-sm text-green-600 mt-1">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+18.3% 較昨日</span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">今日佣金收入</p>
                  <p className="text-2xl font-bold text-gray-900">
                    NT$ {metrics.todayCommission.toLocaleString()}
                  </p>
                  <div className="text-sm text-gray-500 mt-1">
                    平均費率 3.0%
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-primary-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">成功率</p>
                  <p className="text-2xl font-bold text-green-600">{metrics.successRate}%</p>
                  <div className="text-sm text-gray-500 mt-1">
                    平均處理 {metrics.avgProcessingTime} 分鐘
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 待處理事項 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">待處理交易</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingCount}</div>
            <p className="text-sm text-gray-600 mt-1">需要人工審核</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">爭議交易</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.disputedCount}</div>
            <p className="text-sm text-gray-600 mt-1">對帳差異</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">對帳準確率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.reconciliationAccuracy}%</div>
            <p className="text-sm text-gray-600 mt-1">自動匹配成功</p>
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
                  placeholder="搜尋訂單編號、餐廳或供應商..."
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
                <option value="completed">已完成</option>
                <option value="pending">處理中</option>
                <option value="processing">執行中</option>
                <option value="failed">失敗</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="today">今日</option>
                <option value="week">本週</option>
                <option value="month">本月</option>
                <option value="quarter">本季</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                匯出
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 交易列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            交易記錄 ({filteredTransactions.length})
          </h3>
        </div>
        
        <TransactionTable transactions={filteredTransactions} />

        {filteredTransactions.length === 0 && (
          <Card className="mt-4">
            <CardContent className="p-8 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                找不到符合條件的交易記錄
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