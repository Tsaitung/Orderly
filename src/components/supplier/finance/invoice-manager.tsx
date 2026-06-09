'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'

// 模擬發票數據
const mockInvoices = [
  {
    id: 'INV-2025-001',
    orderIds: ['ORD-2025-001', 'ORD-2025-002'],
    customerName: '大樂司餐廳',
    amount: 13775,
    status: 'pending',
    issueDate: new Date('2025-09-18'),
    dueDate: new Date('2025-10-18'),
    paidDate: null,
  },
  {
    id: 'INV-2025-002',
    orderIds: ['ORD-2025-003'],
    customerName: '稻舍餐廳',
    amount: 6850,
    status: 'sent',
    issueDate: new Date('2025-09-17'),
    dueDate: new Date('2025-10-17'),
    paidDate: null,
  },
  {
    id: 'INV-2025-003',
    orderIds: ['ORD-2025-004'],
    customerName: '樂多多火鍋',
    amount: 5040,
    status: 'paid',
    issueDate: new Date('2025-09-16'),
    dueDate: new Date('2025-10-16'),
    paidDate: new Date('2025-09-30'),
  },
]

export default function InvoiceManager({ searchParams }: any) {
  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: '待開立', variant: 'warning' as const },
      sent: { label: '已發送', variant: 'info' as const },
      paid: { label: '已付款', variant: 'success' as const },
      overdue: { label: '逾期', variant: 'destructive' as const },
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.pending
  }

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">發票管理</h2>
        <Button className="bg-blue-600 hover:bg-blue-700">開立新發票</Button>
      </div>

      <div className="space-y-4">
        {mockInvoices.map(invoice => {
          const statusInfo = getStatusBadge(invoice.status)

          return (
            <div
              key={invoice.id}
              className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="grid flex-1 grid-cols-1 items-center gap-4 md:grid-cols-5">
                  <div>
                    <div className="font-medium text-gray-900">{invoice.id}</div>
                    <div className="text-sm text-gray-500">{invoice.orderIds.join(', ')}</div>
                  </div>

                  <div>
                    <div className="font-medium">{invoice.customerName}</div>
                  </div>

                  <div className="font-semibold text-blue-600">
                    {formatCurrency(invoice.amount)}
                  </div>

                  <div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>

                  <div className="text-sm">
                    <div>開立: {formatDate(invoice.issueDate)}</div>
                    <div>到期: {formatDate(invoice.dueDate)}</div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    查看
                  </Button>
                  {invoice.status === 'pending' && <Button size="sm">開立</Button>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
