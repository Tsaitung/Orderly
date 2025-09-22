'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  CreditCard,
  Building,
  Smartphone,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Receipt,
  TrendingUp,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Types
interface PaymentRecord {
  id: string
  paymentNumber: string
  statementId: string
  amount: number
  paymentMethod: PaymentMethod
  status: 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled'
  transactionId?: string
  createdAt: string
  completedAt?: string
  failureReason?: string
  receiptUrl?: string
  installmentInfo?: InstallmentInfo
}

interface PaymentMethod {
  type: 'credit_card' | 'bank_transfer' | 'ecpay' | 'newebpay' | 'atm'
  provider: string
  displayName: string
  lastFour?: string
  bankCode?: string
  icon: React.ReactNode
}

interface InstallmentInfo {
  totalInstallments: number
  currentInstallment: number
  monthlyAmount: number
  nextPaymentDate: string
}

interface PaymentSummary {
  totalPaid: number
  totalRefunded: number
  successRate: number
  averagePaymentTime: number
  preferredMethod: string
}

// Payment method configurations for Taiwan
const paymentMethods: Record<string, PaymentMethod> = {
  visa: {
    type: 'credit_card',
    provider: 'Visa',
    displayName: 'Visa 信用卡',
    icon: <CreditCard className="h-5 w-5 text-blue-600" />,
  },
  mastercard: {
    type: 'credit_card',
    provider: 'Mastercard',
    displayName: 'Mastercard 信用卡',
    icon: <CreditCard className="h-5 w-5 text-orange-600" />,
  },
  bank_transfer: {
    type: 'bank_transfer',
    provider: '台灣銀行',
    displayName: '銀行轉帳',
    icon: <Building className="h-5 w-5 text-green-600" />,
  },
  ecpay: {
    type: 'ecpay',
    provider: 'ECPay',
    displayName: 'ECPay 綠界',
    icon: <Smartphone className="h-5 w-5 text-green-500" />,
  },
  newebpay: {
    type: 'newebpay',
    provider: 'NewebPay',
    displayName: 'NewebPay 藍新',
    icon: <Smartphone className="h-5 w-5 text-blue-500" />,
  },
  atm: {
    type: 'atm',
    provider: 'ATM',
    displayName: 'ATM 轉帳',
    icon: <Building className="h-5 w-5 text-purple-600" />,
  },
}

// Mock data
const mockPayments: PaymentRecord[] = [
  {
    id: '1',
    paymentNumber: 'PAY-2024-10-001',
    statementId: 'ST-2024-09-001',
    amount: 32429,
    paymentMethod: { ...paymentMethods.visa, lastFour: '4242' },
    status: 'completed',
    transactionId: 'TXN-ABC123456',
    createdAt: '2024-10-12 14:30:00',
    completedAt: '2024-10-12 14:30:15',
    receiptUrl: '/receipts/PAY-2024-10-001.pdf',
  },
  {
    id: '2',
    paymentNumber: 'PAY-2024-09-001',
    statementId: 'ST-2024-08-001',
    amount: 29750,
    paymentMethod: paymentMethods.bank_transfer,
    status: 'completed',
    transactionId: 'TXN-DEF789012',
    createdAt: '2024-09-15 09:15:00',
    completedAt: '2024-09-15 16:45:00',
    receiptUrl: '/receipts/PAY-2024-09-001.pdf',
  },
  {
    id: '3',
    paymentNumber: 'PAY-2024-08-001',
    statementId: 'ST-2024-07-001',
    amount: 28900,
    paymentMethod: { ...paymentMethods.mastercard, lastFour: '8888' },
    status: 'failed',
    transactionId: 'TXN-GHI345678',
    createdAt: '2024-08-15 11:20:00',
    failureReason: '信用卡額度不足',
  },
  {
    id: '4',
    paymentNumber: 'PAY-2024-07-001-R1',
    statementId: 'ST-2024-07-001',
    amount: 28900,
    paymentMethod: paymentMethods.ecpay,
    status: 'completed',
    transactionId: 'TXN-JKL901234',
    createdAt: '2024-08-16 10:00:00',
    completedAt: '2024-08-16 10:02:30',
    receiptUrl: '/receipts/PAY-2024-07-001-R1.pdf',
  },
  {
    id: '5',
    paymentNumber: 'PAY-2024-06-001',
    statementId: 'ST-2024-05-001',
    amount: 87000,
    paymentMethod: { ...paymentMethods.visa, lastFour: '4242' },
    status: 'completed',
    transactionId: 'TXN-MNO567890',
    createdAt: '2024-06-15 13:45:00',
    completedAt: '2024-06-15 13:45:20',
    installmentInfo: {
      totalInstallments: 3,
      currentInstallment: 3,
      monthlyAmount: 29000,
      nextPaymentDate: '已完成',
    },
    receiptUrl: '/receipts/PAY-2024-06-001.pdf',
  },
]

const mockSummary: PaymentSummary = {
  totalPaid: 206979,
  totalRefunded: 0,
  successRate: 92.5,
  averagePaymentTime: 2.3,
  preferredMethod: 'Visa 信用卡',
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'failed':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'refunded':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'cancelled':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />
    case 'refunded':
      return <RefreshCw className="h-4 w-4 text-purple-600" />
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-gray-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-600" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed':
      return '已完成'
    case 'pending':
      return '處理中'
    case 'failed':
      return '失敗'
    case 'refunded':
      return '已退款'
    case 'cancelled':
      return '已取消'
    default:
      return '未知'
  }
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>(mockPayments)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMethod, setFilterMethod] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<string>('all')

  const filteredPayments = payments.filter(payment => {
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus
    const matchesMethod = filterMethod === 'all' || payment.paymentMethod.provider === filterMethod
    const matchesSearch =
      payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.transactionId?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesMethod && matchesSearch
  })

  const handleRetryPayment = (payment: PaymentRecord) => {
    // In real app, this would initiate retry payment flow
    console.log('Retrying payment:', payment.paymentNumber)
  }

  const handleDownloadReceipt = (payment: PaymentRecord) => {
    // In real app, this would download the receipt
    console.log('Downloading receipt:', payment.receiptUrl)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">付款記錄</h1>
          <p className="mt-1 text-gray-600">查看付款歷史、下載收據與重新付款</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          匯出記錄
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總付款金額</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(mockSummary.totalPaid)}
                </p>
                <p className="mt-1 text-xs text-green-600">歷史累計</p>
              </div>
              <div className="rounded-full bg-green-50 p-3">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">付款成功率</p>
                <p className="text-2xl font-bold text-gray-900">{mockSummary.successRate}%</p>
                <p className="mt-1 text-xs text-blue-600">表現優異</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均處理時間</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockSummary.averagePaymentTime}分
                </p>
                <p className="mt-1 text-xs text-purple-600">即時到帳</p>
              </div>
              <div className="rounded-full bg-purple-50 p-3">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">常用付款方式</p>
                <p className="text-lg font-bold text-gray-900">{mockSummary.preferredMethod}</p>
                <p className="mt-1 text-xs text-orange-600">使用最頻繁</p>
              </div>
              <div className="rounded-full bg-orange-50 p-3">
                <CreditCard className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="搜尋付款編號或交易ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <option value="all">所有狀態</option>
              <option value="completed">已完成</option>
              <option value="pending">處理中</option>
              <option value="failed">失敗</option>
              <option value="refunded">已退款</option>
            </Select>

            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <option value="all">所有付款方式</option>
              <option value="Visa">Visa 信用卡</option>
              <option value="Mastercard">Mastercard</option>
              <option value="台灣銀行">銀行轉帳</option>
              <option value="ECPay">ECPay 綠界</option>
              <option value="NewebPay">NewebPay 藍新</option>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <option value="all">所有時間</option>
              <option value="7days">近7天</option>
              <option value="30days">近30天</option>
              <option value="90days">近3個月</option>
              <option value="1year">近1年</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment Records */}
      <Card>
        <CardHeader>
          <CardTitle>付款記錄</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredPayments.map(payment => (
              <div
                key={payment.id}
                className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-lg bg-gray-50 p-2">{payment.paymentMethod.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{payment.paymentNumber}</h3>
                      <p className="text-sm text-gray-600">
                        {payment.paymentMethod.displayName}
                        {payment.paymentMethod.lastFour &&
                          ` •••• ${payment.paymentMethod.lastFour}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-600">{payment.createdAt.split(' ')[0]}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getStatusIcon(payment.status)}
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusText(payment.status)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-gray-600">帳單編號:</span>
                      <span className="ml-2 font-medium">{payment.statementId}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">交易ID:</span>
                      <span className="ml-2 font-mono text-xs font-medium">
                        {payment.transactionId || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">建立時間:</span>
                      <span className="ml-2 font-medium">{payment.createdAt}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">完成時間:</span>
                      <span className="ml-2 font-medium">{payment.completedAt || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Installment Info */}
                {payment.installmentInfo && (
                  <div className="mt-4 rounded border-t border-blue-100 bg-blue-50 p-3 pt-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">分期付款資訊</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      <p>
                        第 {payment.installmentInfo.currentInstallment} /{' '}
                        {payment.installmentInfo.totalInstallments} 期 · 每期{' '}
                        {formatCurrency(payment.installmentInfo.monthlyAmount)}
                      </p>
                      <p className="mt-1 text-xs">
                        下期付款: {payment.installmentInfo.nextPaymentDate}
                      </p>
                    </div>
                  </div>
                )}

                {/* Failure Info */}
                {payment.status === 'failed' && payment.failureReason && (
                  <div className="mt-4 rounded border-t border-red-100 bg-red-50 p-3 pt-4">
                    <div className="mb-2 flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">付款失敗原因</span>
                    </div>
                    <p className="text-sm text-red-700">{payment.failureReason}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="text-xs text-gray-500">交易編號: {payment.transactionId}</div>

                  <div className="flex items-center space-x-2">
                    {payment.receiptUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payment)}
                      >
                        <Receipt className="mr-2 h-4 w-4" />
                        收據
                      </Button>
                    )}

                    {payment.status === 'failed' && (
                      <Button
                        variant="solid"
                        colorScheme="red"
                        size="sm"
                        onClick={() => handleRetryPayment(payment)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        重新付款
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredPayments.length === 0 && (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">沒有找到符合條件的付款記錄</p>
              <p className="mt-1 text-sm text-gray-500">請嘗試調整搜尋條件或篩選器</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Info */}
      <Card>
        <CardHeader>
          <CardTitle>支援的付款方式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-3 font-medium text-gray-900">信用卡</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700">Visa / Mastercard</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">即時到帳</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">支援分期付款</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium text-gray-900">銀行轉帳</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">所有台灣銀行</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-gray-700">1-3個工作天</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">手續費較低</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-medium text-gray-900">第三方支付</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-700">ECPay / NewebPay</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">即時到帳</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-700">手機支付便利</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
