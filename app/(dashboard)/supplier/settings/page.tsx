import { Metadata } from 'next'
import SupplierProfileSettings from '@/components/supplier/profile/SupplierProfileSettings'

export const metadata: Metadata = {
  title: '帳戶設定 - 供應商管理',
  description: '管理供應商檔案、配送設定、營業時間和聯絡偏好'
}

export default function SupplierSettingsPage() {
  return (
    <div className="dashboard-content-spacing">
      {/* 頁面標題區塊 */}
      <div className="compact-spacing">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            帳戶設定
          </h1>
          <p className="text-gray-600 mt-2">
            管理您的供應商檔案、服務設定和通知偏好
          </p>
        </div>
      </div>

      {/* 設定內容 */}
      <SupplierProfileSettings />
    </div>
  )
}