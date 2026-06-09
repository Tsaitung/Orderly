'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  FileText,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Calendar,
  DollarSign,
  TrendingUp,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types
interface BillingStatement {
  id: string
  statementNumber: string
  period: string
  totalGMV: number
  commissionRate: number
  commissionAmount: number
  subscriptionFee: number
  totalAmount: number
  status: 'paid' | 'pending' | 'overdue' | 'disputed'
  dueDate: string
  paidDate?: string
  generatedDate: string
  transactionCount: number
  disputes?: Dispute[]
  downloadUrl?: string
}

interface Dispute {
  id: string
  type: 'commission_rate' | 'transaction_error' | 'fee_discrepancy' | 'other'
  status: 'open' | 'investigating' | 'resolved' | 'rejected'
  amount: number
  description: string
  createdAt: string
  resolvedAt?: string
}

interface StatementSummary {
  totalGMV: number
  totalCommission: number
  averageCommissionRate: number
  totalStatements: number
  paidStatements: number
  pendingAmount: number
}

// Mock data
const mockStatements: BillingStatement[] = [
  {
    id: '1',
    statementNumber: 'ST-2024-10-001',
    period: '2024-10',
    totalGMV: 2450000,
    commissionRate: 1.35,
    commissionAmount: 33075,
    subscriptionFee: 2999,
    totalAmount: 36074,
    status: 'pending',
    dueDate: '2024-11-15',
    generatedDate: '2024-11-01',
    transactionCount: 156,
    downloadUrl: '/api/statements/ST-2024-10-001/download',
  },
  {
    id: '2',
    statementNumber: 'ST-2024-09-001',
    period: '2024-09',
    totalGMV: 2180000,
    commissionRate: 1.35,
    commissionAmount: 29430,
    subscriptionFee: 2999,
    totalAmount: 32429,
    status: 'paid',
    dueDate: '2024-10-15',
    paidDate: '2024-10-12',
    generatedDate: '2024-10-01',
    transactionCount: 142,
  },
  {
    id: '3',
    statementNumber: 'ST-2024-08-001',
    period: '2024-08',
    totalGMV: 1950000,
    commissionRate: 1.5,
    commissionAmount: 29250,
    subscriptionFee: 2999,
    totalAmount: 32249,
    status: 'disputed',
    dueDate: '2024-09-15',
    generatedDate: '2024-09-01',
    transactionCount: 128,
    disputes: [
      {
        id: 'D1',
        type: 'commission_rate',
        status: 'investigating',
        amount: 2925,
        description: '佣金費率計算錯誤，應適用專業版折扣',
        createdAt: '2024-09-10',
      },
    ],
  },
]

const mockSummary: StatementSummary = {
  totalGMV: 18750000,
  totalCommission: 265850,
  averageCommissionRate: 1.42,
  totalStatements: 12,
  paidStatements: 10,
  pendingAmount: 36074,
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'overdue':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'disputed':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'paid':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />
    case 'overdue':
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    case 'disputed':
      return <MessageSquare className="h-4 w-4 text-purple-600" />
    default:
      return <FileText className="h-4 w-4 text-gray-600" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'paid':
      return '已付款'
    case 'pending':
      return '待付款'
    case 'overdue':
      return '已逾期'
    case 'disputed':
      return '爭議中'
    default:
      return '未知'
  }
}

export default function MonthlyStatements() {
  const [statements, setStatements] = useState<BillingStatement[]>(mockStatements)
  const [selectedStatement, setSelectedStatement] = useState<BillingStatement | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showDisputeModal, setShowDisputeModal] = useState(false)

  const filteredStatements = statements.filter(statement => {
    const matchesStatus = filterStatus === 'all' || statement.status === filterStatus
    const matchesSearch =
      statement.statementNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      statement.period.includes(searchTerm)
    return matchesStatus && matchesSearch
  })

  const handleDownload = (statement: BillingStatement) => {
    // In real app, this would trigger file download
    console.log('Downloading statement:', statement.statementNumber)
  }

  const handleViewDetails = (statement: BillingStatement) => {
    setSelectedStatement(statement)
  }

  const handleCreateDispute = (statement: BillingStatement) => {
    setSelectedStatement(statement)
    setShowDisputeModal(true)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">月度帳單</h1>
          <p className="mt-1 text-gray-600">查看歷史帳單、下載發票與處理爭議</p>
        </div>
        <Button variant="outline" size="sm">
          <Calendar className="mr-2 h-4 w-4" />
          匯出年度報表
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">年度 GMV</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockSummary.totalGMV)}
                </p>
                <p className="mt-1 text-xs text-blue-600">12 個月累計</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總佣金</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockSummary.totalCommission)}
                </p>
                <p className="mt-1 text-xs text-purple-600">
                  平均 {mockSummary.averageCommissionRate}%
                </p>
              </div>
              <div className="rounded-full bg-purple-50 p-3">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">已付帳單</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockSummary.paidStatements}/{mockSummary.totalStatements}
                </p>
                <p className="mt-1 text-xs text-green-600">
                  {Math.round((mockSummary.paidStatements / mockSummary.totalStatements) * 100)}%
                  完成率
                </p>
              </div>
              <div className="rounded-full bg-green-50 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">待付金額</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockSummary.pendingAmount)}
                </p>
                <p className="mt-1 text-xs text-orange-600">即將到期</p>
              </div>
              <div className="rounded-full bg-orange-50 p-3">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="搜尋帳單編號或期間..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <option value="all">所有狀態</option>
              <option value="paid">已付款</option>
              <option value="pending">待付款</option>
              <option value="overdue">已逾期</option>
              <option value="disputed">爭議中</option>
            </Select>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              更多篩選
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statements List */}
      <Card>
        <CardHeader>
          <CardTitle>帳單清單</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredStatements.map(statement => (
              <div
                key={statement.id}
                className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-lg bg-gray-50 p-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{statement.statementNumber}</h3>
                      <p className="text-sm text-gray-600">
                        {statement.period} · {statement.transactionCount} 筆交易
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">GMV</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(statement.totalGMV)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">應付金額</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(statement.totalAmount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">到期日</p>
                      <p className="text-sm text-gray-900">{statement.dueDate}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(statement.status)}
                      <Badge className={getStatusColor(statement.status)}>
                        {getStatusText(statement.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Statement Details */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-gray-600">佣金費率:</span>
                      <span className="ml-2 font-medium">{statement.commissionRate}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">佣金:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(statement.commissionAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">訂閱費:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(statement.subscriptionFee)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">產生日期:</span>
                      <span className="ml-2 font-medium">{statement.generatedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Disputes */}
                {statement.disputes && statement.disputes.length > 0 && (
                  <div className="mt-4 rounded border-t border-orange-100 bg-orange-50 p-3 pt-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">
                        進行中的爭議 ({statement.disputes.length})
                      </span>
                    </div>
                    {statement.disputes.map(dispute => (
                      <div key={dispute.id} className="text-sm text-orange-700">
                        <p>{dispute.description}</p>
                        <p className="mt-1 text-xs">
                          金額: {formatCurrency(dispute.amount)} · 狀態: {dispute.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(statement)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      查看詳情
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownload(statement)}>
                      <Download className="mr-2 h-4 w-4" />
                      下載 PDF
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {statement.status === 'pending' && (
                      <Button variant="solid" colorScheme="green" size="sm">
                        立即付款
                      </Button>
                    )}
                    {statement.status !== 'disputed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateDispute(statement)}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        提出爭議
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredStatements.length === 0 && (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">沒有找到符合條件的帳單</p>
              <p className="mt-1 text-sm text-gray-500">請嘗試調整搜尋條件或篩選器</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>需要協助？</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="p-4 text-center">
              <div className="mx-auto mb-3 w-fit rounded-full bg-blue-50 p-3">
                <ExternalLink className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 font-medium text-gray-900">帳單說明</h3>
              <p className="mb-3 text-sm text-gray-600">了解帳單各項目的計算方式與費用明細</p>
              <Button variant="link" size="sm">
                查看說明
              </Button>
            </div>

            <div className="p-4 text-center">
              <div className="mx-auto mb-3 w-fit rounded-full bg-green-50 p-3">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mb-2 font-medium text-gray-900">爭議處理</h3>
              <p className="mb-3 text-sm text-gray-600">如對帳單有疑問，可提出爭議申請</p>
              <Button variant="link" size="sm">
                爭議流程
              </Button>
            </div>

            <div className="p-4 text-center">
              <div className="mx-auto mb-3 w-fit rounded-full bg-purple-50 p-3">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="mb-2 font-medium text-gray-900">付款方式</h3>
              <p className="mb-3 text-sm text-gray-600">設定自動扣款或選擇其他付款方式</p>
              <Button variant="link" size="sm">
                付款設定
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
