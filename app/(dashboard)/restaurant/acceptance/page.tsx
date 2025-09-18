import { Metadata } from 'next'
import RestaurantAcceptanceManagement from '@/components/restaurant/restaurant-acceptance-management'

export const metadata: Metadata = {
  title: '驗收管理 - 餐廳管理儀表板',
  description: '處理供應商送貨驗收，包含拍照記錄、品質檢查、數量確認等功能'
}

export default function RestaurantAcceptancePage() {
  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          驗收管理
        </h1>
        <p className="text-gray-600">
          處理供應商送貨驗收，確保商品品質與數量符合訂單要求
        </p>
      </div>

      {/* 驗收管理組件 */}
      <RestaurantAcceptanceManagement />
    </div>
  )
}