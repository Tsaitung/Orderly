import { Metadata } from 'next'
import SupplierSidebar from '@/components/dashboard/supplier-sidebar'
import SupplierHeader from '@/components/dashboard/supplier-header'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { DemoModeBanner } from '@/components/DemoModeBanner'

export const metadata: Metadata = {
  title: '供應商管理入口 - Orderly',
  description: '供應商數位供應鏈協作平台，實現訂單確認、發票管理、即時溝通'
}

interface SupplierLayoutProps {
  children: React.ReactNode
}

export default function SupplierLayout({ children }: SupplierLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-supplier-50 to-supplier-100 theme-supplier">
      {/* Demo Mode Banner */}
      <DemoModeBanner currentRole="supplier" />
      
      {/* 供應商專用無障礙跳轉 */}
      <a 
        href="#supplier-main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-supplier-500 text-white px-4 py-2 rounded-md"
      >
        跳到供應商主要內容
      </a>

      <div className="flex">
        {/* 供應商側邊選單 */}
        <SupplierSidebar />

        {/* 主要內容區域 */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* 供應商專用頂部導航 */}
          <SupplierHeader />

          {/* 供應商主要內容 */}
          <main 
            id="supplier-main-content"
            className="flex-1 p-6"
            role="main"
            aria-label="供應商管理平台主要內容"
          >
            {children}
          </main>
        </div>
      </div>

      {/* 供應商專用通知區域 */}
      <div 
        id="supplier-notification-container"
        className="fixed bottom-4 right-4 z-40 space-y-2"
        aria-live="polite"
        aria-label="供應商系統通知"
      />

      {/* 即時聊天支援 */}
      <div 
        id="supplier-chat-widget"
        className="fixed bottom-4 left-4 z-40"
        aria-label="即時客服支援"
      />
    </div>
  )
}