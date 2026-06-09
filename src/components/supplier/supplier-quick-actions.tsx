'use client'

import * as React from 'react'
import {
  Plus,
  Upload,
  Download,
  FileText,
  MessageSquare,
  Package,
  Truck,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Calendar,
  Settings,
  DollarSign,
  Camera,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormDialog } from '@/components/ui/accessible-modal'
import {
  AccessibleFormField,
  AccessibleSelect,
  AccessibleTextarea,
} from '@/components/ui/accessible-form'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'

interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning'
  disabled?: boolean
  badge?: string
}

function QuickAction({
  title,
  description,
  icon,
  onClick,
  variant = 'secondary',
  disabled = false,
  badge,
}: QuickActionProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-supplier-300 bg-supplier-500 text-white hover:bg-supplier-600'
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
      default:
        return 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
    }
  }

  return (
    <Button
      variant="ghost"
      className={`relative flex h-auto flex-col items-center space-y-3 border-2 p-4 text-center transition-all duration-200 ${getVariantStyles()}`}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={`${title.replace(/\s+/g, '-')}-description`}
    >
      {badge && (
        <div className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          {badge}
        </div>
      )}
      <div className="flex-shrink-0">{icon}</div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{title}</div>
        <div
          id={`${title.replace(/\s+/g, '-')}-description`}
          className="text-xs leading-relaxed opacity-75"
        >
          {description}
        </div>
      </div>
    </Button>
  )
}

export default function SupplierQuickActions() {
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = React.useState(false)
  const [isUpdateInventoryOpen, setIsUpdateInventoryOpen] = React.useState(false)
  const [isDeliveryScheduleOpen, setIsDeliveryScheduleOpen] = React.useState(false)
  const [isMessageCenterOpen, setIsMessageCenterOpen] = React.useState(false)

  const [invoiceData, setInvoiceData] = React.useState({
    order_number: '',
    invoice_amount: '',
    tax_rate: '5',
    notes: '',
  })

  const [inventoryData, setInventoryData] = React.useState({
    product_category: '',
    items: '',
    update_type: 'stock_update',
  })

  const [deliveryData, setDeliveryData] = React.useState({
    delivery_date: '',
    time_slot: '',
    special_instructions: '',
    vehicle_type: 'standard',
  })

  const [messageData, setMessageData] = React.useState({
    recipient: '',
    subject: '',
    message: '',
    priority: 'normal',
  })

  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const handleCreateInvoice = React.useCallback(() => {
    announceSuccess('發票已建立並送出')
    setIsNewInvoiceOpen(false)
    setInvoiceData({ order_number: '', invoice_amount: '', tax_rate: '5', notes: '' })
  }, [announceSuccess])

  const handleUpdateInventory = React.useCallback(() => {
    announceSuccess('庫存已更新')
    setIsUpdateInventoryOpen(false)
    setInventoryData({ product_category: '', items: '', update_type: 'stock_update' })
  }, [announceSuccess])

  const handleScheduleDelivery = React.useCallback(() => {
    announceSuccess('配送已排程')
    setIsDeliveryScheduleOpen(false)
    setDeliveryData({
      delivery_date: '',
      time_slot: '',
      special_instructions: '',
      vehicle_type: 'standard',
    })
  }, [announceSuccess])

  const handleSendMessage = React.useCallback(() => {
    announceSuccess('訊息已發送')
    setIsMessageCenterOpen(false)
    setMessageData({ recipient: '', subject: '', message: '', priority: 'normal' })
  }, [announceSuccess])

  const quickActions = [
    {
      title: '確認新訂單',
      description: '快速確認待處理的訂單並安排生產',
      icon: <CheckCircle className="h-6 w-6" />,
      onClick: () => announcePolite('導航到訂單確認頁面'),
      variant: 'primary' as const,
      badge: '8',
    },
    {
      title: '上傳發票',
      description: '為已完成訂單建立和上傳發票',
      icon: <Upload className="h-6 w-6" />,
      onClick: () => setIsNewInvoiceOpen(true),
      badge: '3',
    },
    {
      title: '更新庫存',
      description: '即時更新產品庫存和價格資訊',
      icon: <Package className="h-6 w-6" />,
      onClick: () => setIsUpdateInventoryOpen(true),
    },
    {
      title: '排程配送',
      description: '安排配送時間和路線規劃',
      icon: <Truck className="h-6 w-6" />,
      onClick: () => setIsDeliveryScheduleOpen(true),
    },
    {
      title: '客戶溝通',
      description: '與餐廳客戶即時聊天和訊息',
      icon: <MessageSquare className="h-6 w-6" />,
      onClick: () => setIsMessageCenterOpen(true),
      badge: '5',
    },
    {
      title: '營收報表',
      description: '查看詳細的營收和獲利分析',
      icon: <BarChart3 className="h-6 w-6" />,
      onClick: () => announcePolite('導航到營收報表頁面'),
    },
    {
      title: '品質檢驗',
      description: '記錄品質檢驗結果和照片',
      icon: <Camera className="h-6 w-6" />,
      onClick: () => announcePolite('導航到品質檢驗頁面'),
    },
    {
      title: '異常處理',
      description: '處理退貨、投訴和品質問題',
      icon: <AlertCircle className="h-6 w-6" />,
      onClick: () => announcePolite('導航到異常處理頁面'),
      variant: 'warning' as const,
      badge: '2',
    },
    {
      title: '產品目錄',
      description: '管理產品資訊和價格設定',
      icon: <FileText className="h-6 w-6" />,
      onClick: () => announcePolite('導航到產品目錄頁面'),
    },
    {
      title: '財務結算',
      description: '查看應收帳款和付款狀態',
      icon: <DollarSign className="h-6 w-6" />,
      onClick: () => announcePolite('導航到財務結算頁面'),
    },
    {
      title: '系統設定',
      description: '配置通知偏好和 API 設定',
      icon: <Settings className="h-6 w-6" />,
      onClick: () => announcePolite('導航到系統設定頁面'),
    },
    {
      title: '匯出資料',
      description: '下載訂單和財務資料報表',
      icon: <Download className="h-6 w-6" />,
      onClick: () => announcePolite('準備匯出資料'),
    },
  ]

  const productCategoryOptions = [
    { value: 'vegetables', label: '蔬菜類' },
    { value: 'fruits', label: '水果類' },
    { value: 'meat', label: '肉品類' },
    { value: 'seafood', label: '海鮮類' },
    { value: 'dairy', label: '乳製品' },
    { value: 'grains', label: '穀物類' },
    { value: 'condiments', label: '調味料' },
    { value: 'frozen', label: '冷凍食品' },
  ]

  const updateTypeOptions = [
    { value: 'stock_update', label: '庫存更新' },
    { value: 'price_update', label: '價格調整' },
    { value: 'new_product', label: '新增產品' },
    { value: 'discontinue', label: '停售產品' },
  ]

  const timeSlotOptions = [
    { value: 'morning', label: '上午 (08:00-12:00)' },
    { value: 'afternoon', label: '下午 (12:00-17:00)' },
    { value: 'evening', label: '晚上 (17:00-21:00)' },
    { value: 'specific', label: '指定時間' },
  ]

  const vehicleTypeOptions = [
    { value: 'standard', label: '標準貨車' },
    { value: 'refrigerated', label: '冷藏車' },
    { value: 'frozen', label: '冷凍車' },
    { value: 'small', label: '小型車輛' },
    { value: 'large', label: '大型貨車' },
  ]

  const recipientOptions = [
    { value: 'taipei_restaurant', label: '台北美食餐廳' },
    { value: 'deluxe_cuisine', label: '精緻料理' },
    { value: 'tasty_diner', label: '美味小館' },
    { value: 'family_kitchen', label: '家常菜館' },
    { value: 'fine_dining', label: '高級餐廳' },
    { value: 'support', label: '技術支援' },
    { value: 'all_customers', label: '所有客戶' },
  ]

  const priorityOptions = [
    { value: 'low', label: '一般' },
    { value: 'normal', label: '正常' },
    { value: 'high', label: '重要' },
    { value: 'urgent', label: '緊急' },
  ]

  const taxRateOptions = [
    { value: '0', label: '0% (免稅)' },
    { value: '5', label: '5% (營業稅)' },
    { value: '10', label: '10% (特殊稅率)' },
  ]

  return (
    <section aria-labelledby="supplier-quick-actions-title">
      <Card>
        <CardHeader>
          <CardTitle id="supplier-quick-actions-title" className="flex items-center space-x-2">
            <span>供應商快速操作</span>
            <div className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
            {quickActions.map((action, index) => (
              <QuickAction
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                onClick={action.onClick}
                variant={action.variant}
                badge={action.badge}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 上傳發票對話框 */}
      <FormDialog
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
        title="建立新發票"
        description="為完成的訂單建立發票並上傳系統"
        onSubmit={handleCreateInvoice}
        submitText="建立發票"
        size="lg"
      >
        <div className="space-y-4">
          <AccessibleFormField
            label="訂單編號"
            name="order_number"
            required
            placeholder="ORD-2024-XXX"
            value={invoiceData.order_number}
            onChange={value => setInvoiceData(prev => ({ ...prev, order_number: value }))}
            helperText="選擇要開立發票的訂單編號"
          />

          <AccessibleFormField
            label="發票金額"
            name="invoice_amount"
            type="number"
            required
            placeholder="請輸入金額"
            value={invoiceData.invoice_amount}
            onChange={value => setInvoiceData(prev => ({ ...prev, invoice_amount: value }))}
            leftIcon={<span className="text-gray-500">NT$</span>}
            helperText="含稅金額，系統將自動計算稅額"
          />

          <AccessibleSelect
            label="稅率"
            name="tax_rate"
            options={taxRateOptions}
            value={invoiceData.tax_rate}
            onChange={value => setInvoiceData(prev => ({ ...prev, tax_rate: value }))}
            helperText="根據產品類別選擇適用稅率"
          />

          <AccessibleTextarea
            label="發票備註"
            name="notes"
            placeholder="特殊說明或備註事項"
            value={invoiceData.notes}
            onChange={value => setInvoiceData(prev => ({ ...prev, notes: value }))}
            rows={3}
            maxLength={200}
          />

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-medium text-blue-900">發票上傳提醒：</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• 請確保發票資料正確，避免後續修改麻煩</li>
              <li>• 發票將自動發送給客戶，並同步至會計系統</li>
              <li>• 上傳後 24 小時內可進行修改</li>
            </ul>
          </div>
        </div>
      </FormDialog>

      {/* 更新庫存對話框 */}
      <FormDialog
        isOpen={isUpdateInventoryOpen}
        onClose={() => setIsUpdateInventoryOpen(false)}
        title="更新庫存資訊"
        description="即時更新產品庫存數量和價格"
        onSubmit={handleUpdateInventory}
        submitText="更新庫存"
        size="lg"
      >
        <div className="space-y-4">
          <AccessibleSelect
            label="產品類別"
            name="product_category"
            required
            options={productCategoryOptions}
            value={inventoryData.product_category}
            onChange={value => setInventoryData(prev => ({ ...prev, product_category: value }))}
            helperText="選擇要更新的產品類別"
          />

          <AccessibleSelect
            label="更新類型"
            name="update_type"
            required
            options={updateTypeOptions}
            value={inventoryData.update_type}
            onChange={value => setInventoryData(prev => ({ ...prev, update_type: value }))}
          />

          <AccessibleTextarea
            label="產品明細"
            name="items"
            required
            placeholder="請輸入產品名稱、數量、價格，一行一項&#10;例如：有機高麗菜 - 50公斤 - NT$45/公斤"
            value={inventoryData.items}
            onChange={value => setInventoryData(prev => ({ ...prev, items: value }))}
            rows={6}
            helperText="格式：產品名稱 - 數量 - 單價"
          />

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h4 className="mb-2 font-medium text-green-900">庫存更新功能：</h4>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• 即時同步至所有合作餐廳的訂購系統</li>
              <li>• 自動通知有相關產品關注的客戶</li>
              <li>• 支援批量匯入 Excel 檔案</li>
              <li>• 價格變動將記錄歷史軌跡</li>
            </ul>
          </div>
        </div>
      </FormDialog>

      {/* 排程配送對話框 */}
      <FormDialog
        isOpen={isDeliveryScheduleOpen}
        onClose={() => setIsDeliveryScheduleOpen(false)}
        title="安排配送排程"
        description="為訂單安排配送時間和車輛"
        onSubmit={handleScheduleDelivery}
        submitText="確認排程"
        size="lg"
      >
        <div className="space-y-4">
          <AccessibleFormField
            label="配送日期"
            name="delivery_date"
            type="date"
            required
            value={deliveryData.delivery_date}
            onChange={value => setDeliveryData(prev => ({ ...prev, delivery_date: value }))}
          />

          <AccessibleSelect
            label="配送時段"
            name="time_slot"
            required
            options={timeSlotOptions}
            value={deliveryData.time_slot}
            onChange={value => setDeliveryData(prev => ({ ...prev, time_slot: value }))}
          />

          <AccessibleSelect
            label="車輛類型"
            name="vehicle_type"
            required
            options={vehicleTypeOptions}
            value={deliveryData.vehicle_type}
            onChange={value => setDeliveryData(prev => ({ ...prev, vehicle_type: value }))}
            helperText="根據產品特性選擇適合的車輛"
          />

          <AccessibleTextarea
            label="特殊指示"
            name="special_instructions"
            placeholder="配送地址、聯絡方式、特殊要求等"
            value={deliveryData.special_instructions}
            onChange={value => setDeliveryData(prev => ({ ...prev, special_instructions: value }))}
            rows={3}
            maxLength={300}
          />

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="mb-2 font-medium text-yellow-900">配送注意事項：</h4>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• 冷鏈產品請選擇冷藏/冷凍車輛</li>
              <li>• 建議提前 24 小時安排配送</li>
              <li>• 可設定 GPS 追蹤和即時通知</li>
              <li>• 配送完成後請拍照上傳送達證明</li>
            </ul>
          </div>
        </div>
      </FormDialog>

      {/* 客戶溝通對話框 */}
      <FormDialog
        isOpen={isMessageCenterOpen}
        onClose={() => setIsMessageCenterOpen(false)}
        title="發送客戶訊息"
        description="與餐廳客戶即時溝通和協調"
        onSubmit={handleSendMessage}
        submitText="發送訊息"
        size="lg"
      >
        <div className="space-y-4">
          <AccessibleSelect
            label="收件人"
            name="recipient"
            required
            options={recipientOptions}
            value={messageData.recipient}
            onChange={value => setMessageData(prev => ({ ...prev, recipient: value }))}
          />

          <AccessibleFormField
            label="訊息主旨"
            name="subject"
            required
            placeholder="請輸入訊息主旨"
            value={messageData.subject}
            onChange={value => setMessageData(prev => ({ ...prev, subject: value }))}
          />

          <AccessibleSelect
            label="優先級"
            name="priority"
            options={priorityOptions}
            value={messageData.priority}
            onChange={value => setMessageData(prev => ({ ...prev, priority: value }))}
          />

          <AccessibleTextarea
            label="訊息內容"
            name="message"
            required
            placeholder="請輸入詳細訊息內容..."
            value={messageData.message}
            onChange={value => setMessageData(prev => ({ ...prev, message: value }))}
            rows={6}
            maxLength={1000}
          />

          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <h4 className="mb-2 font-medium text-purple-900">溝通功能：</h4>
            <ul className="space-y-1 text-sm text-purple-800">
              <li>• 支援即時聊天和檔案分享</li>
              <li>• 可設定自動回覆和常用範本</li>
              <li>• 訊息將記錄在客戶溝通歷史中</li>
              <li>• 緊急訊息會即時推播通知</li>
            </ul>
          </div>
        </div>
      </FormDialog>
    </section>
  )
}
