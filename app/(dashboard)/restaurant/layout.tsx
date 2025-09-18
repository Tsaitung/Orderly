import { Metadata } from 'next'
import RestaurantSidebar from '@/components/dashboard/restaurant-sidebar'
import RestaurantHeader from '@/components/dashboard/restaurant-header'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { DemoModeBanner } from '@/components/DemoModeBanner'

export const metadata: Metadata = {
  title: '餐廳管理儀表板 - Orderly',
  description: '餐廳端數位供應鏈管理平台'
}

interface RestaurantLayoutProps {
  children: React.ReactNode
}

export default function RestaurantLayout({ children }: RestaurantLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 theme-restaurant">
      {/* Demo Mode Banner */}
      <DemoModeBanner currentRole="restaurant" />
      
      {/* 無障礙跳轉連結 */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-restaurant-500 text-white px-4 py-2 rounded-md"
      >
        跳到主要內容
      </a>

      <div className="flex">
        {/* 側邊選單 */}
        <RestaurantSidebar />

        {/* 主要內容區域 */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* 頂部導航 */}
          <RestaurantHeader />

          {/* 主要內容 */}
          <main 
            id="main-content"
            className="flex-1 pt-1 px-6 pb-6"
            role="main"
            aria-label="餐廳管理儀表板主要內容"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Toast 通知區域 */}
      <div 
        id="toast-container"
        className="fixed bottom-4 right-4 z-40 space-y-2"
        aria-live="polite"
        aria-label="系統通知"
      />
    </div>
  )
}