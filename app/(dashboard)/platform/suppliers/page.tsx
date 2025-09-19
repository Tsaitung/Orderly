import type { Metadata } from 'next'
import { SupplierManagement } from '@/components/platform/suppliers/SupplierManagement'

export const metadata: Metadata = {
  title: '供應商管理',
  description: '管理平台上的所有供應商，包括供應商資料、績效分析、合約管理和審批流程。',
}

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">供應商管理</h1>
          <p className="text-gray-600 mt-1">
            管理和監控平台上的所有供應商，包括資料維護、績效分析和合約管理
          </p>
        </div>
      </div>

      <SupplierManagement />
    </div>
  )
}