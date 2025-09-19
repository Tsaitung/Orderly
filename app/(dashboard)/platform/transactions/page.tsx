import type { Metadata } from 'next'
import { TransactionManagement } from '@/components/platform/transactions/TransactionManagement'

export const metadata: Metadata = {
  title: '交易管理',
  description: '監控平台上的所有交易，包括即時交易監控、財務對帳管理和佣金計算。',
}

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">交易管理</h1>
          <p className="text-gray-600 mt-1">
            監控和管理平台交易，包括即時監控、財務對帳和佣金結算
          </p>
        </div>
      </div>

      <TransactionManagement />
    </div>
  )
}