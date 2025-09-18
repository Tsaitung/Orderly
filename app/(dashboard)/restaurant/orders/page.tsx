import { Metadata } from 'next'
import RestaurantOrderManagement from '@/components/restaurant/restaurant-order-management'

export const metadata: Metadata = {
  title: '訂單管理 - 餐廳管理儀表板',
  description: '完整的訂單管理系統，包含下單、追蹤、驗收、對帳功能'
}

export default function RestaurantOrdersPage() {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          訂單管理
        </h1>
        <p className="text-gray-600">
          管理所有訂單狀態，從下單到驗收的完整流程追蹤
        </p>
      </div>

      {/* 訂單管理組件 */}
      <RestaurantOrderManagement />
    </div>
  )
}