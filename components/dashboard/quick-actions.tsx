'use client'

import * as React from 'react'
import {
  Plus,
  Upload,
  Download,
  FileText,
  Settings,
  Users,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FormDialog } from '@/components/ui/accessible-modal'
import { AccessibleFormField } from '@/components/ui/accessible-form'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'

interface QuickActionProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'warning'
  disabled?: boolean
}

function QuickAction({
  title,
  description,
  icon,
  onClick,
  variant = 'secondary',
  disabled = false,
}: QuickActionProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary-500 bg-primary-500 text-white hover:bg-primary-600'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
      default:
        return 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
    }
  }

  return (
    <Button
      variant="ghost"
      className={`flex h-auto flex-col items-center space-y-3 border-2 p-4 text-center transition-all duration-200 ${getVariantStyles()}`}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={`${title.replace(/\s+/g, '-')}-description`}
    >
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

export default function QuickActions() {
  const [isNewOrderOpen, setIsNewOrderOpen] = React.useState(false)
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [orderData, setOrderData] = React.useState({
    supplier: '',
    items: '',
    delivery_date: '',
    notes: '',
  })
  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  const handleCreateOrder = React.useCallback(() => {
    // TODO: 實現建立訂單邏輯
    announceSuccess('新訂單已建立')
    setIsNewOrderOpen(false)
    setOrderData({ supplier: '', items: '', delivery_date: '', notes: '' })
  }, [announceSuccess])

  const handleBulkImport = React.useCallback(() => {
    // TODO: 實現批量匯入邏輯
    announceSuccess('訂單匯入已開始處理')
    setIsImportOpen(false)
  }, [announceSuccess])

  const handleSyncERP = React.useCallback(() => {
    announcePolite('正在同步 ERP 系統資料')
    // TODO: 實現 ERP 同步邏輯
    setTimeout(() => {
      announceSuccess('ERP 系統同步完成')
    }, 2000)
  }, [announcePolite, announceSuccess])

  const quickActions = [
    {
      title: '建立新訂單',
      description: '快速建立新的採購訂單',
      icon: <Plus className="h-6 w-6" />,
      onClick: () => setIsNewOrderOpen(true),
      variant: 'primary' as const,
    },
    {
      title: '批量匯入',
      description: '從 Excel 或 CSV 檔案匯入多筆訂單',
      icon: <Upload className="h-6 w-6" />,
      onClick: () => setIsImportOpen(true),
    },
    {
      title: '匯出報表',
      description: '下載訂單和財務報表',
      icon: <Download className="h-6 w-6" />,
      onClick: () => announcePolite('準備匯出報表'),
    },
    {
      title: '處理異常',
      description: '查看並處理 2 筆待處理異常',
      icon: <AlertCircle className="h-6 w-6" />,
      onClick: () => announcePolite('導航到異常處理頁面'),
      variant: 'warning' as const,
    },
    {
      title: '同步 ERP',
      description: '手動同步 ERP 系統資料',
      icon: <RefreshCw className="h-6 w-6" />,
      onClick: handleSyncERP,
    },
    {
      title: '管理供應商',
      description: '新增或編輯供應商資訊',
      icon: <Users className="h-6 w-6" />,
      onClick: () => announcePolite('導航到供應商管理頁面'),
    },
    {
      title: '系統設定',
      description: '配置餐廳和系統參數',
      icon: <Settings className="h-6 w-6" />,
      onClick: () => announcePolite('導航到系統設定頁面'),
    },
    {
      title: '查看文件',
      description: '使用手冊和操作說明',
      icon: <FileText className="h-6 w-6" />,
      onClick: () => announcePolite('導航到幫助文件'),
    },
  ]

  return (
    <section aria-labelledby="quick-actions-title">
      <Card>
        <CardHeader>
          <CardTitle id="quick-actions-title" className="flex items-center space-x-2">
            <span>快速操作</span>
            <div className="h-2 w-2 rounded-full bg-primary-500" aria-hidden="true" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
            {quickActions.map((action, index) => (
              <QuickAction
                key={index}
                title={action.title}
                description={action.description}
                icon={action.icon}
                onClick={action.onClick}
                variant={action.variant}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 建立新訂單對話框 */}
      <FormDialog
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        title="建立新訂單"
        description="填寫訂單基本資訊，系統將自動同步到 ERP"
        onSubmit={handleCreateOrder}
        submitText="建立訂單"
        size="lg"
      >
        <div className="space-y-4">
          <AccessibleFormField
            label="供應商"
            name="supplier"
            required
            placeholder="選擇或搜尋供應商"
            value={orderData.supplier}
            onChange={value => setOrderData(prev => ({ ...prev, supplier: value }))}
            helperText="開始輸入供應商名稱進行搜尋"
          />

          <AccessibleFormField
            label="採購項目"
            name="items"
            required
            placeholder="輸入採購項目，一行一項"
            value={orderData.items}
            onChange={value => setOrderData(prev => ({ ...prev, items: value }))}
            helperText="格式：產品名稱 - 數量 - 單位，例如：新鮮蔬菜 - 10 - 公斤"
          />

          <AccessibleFormField
            label="預計送達日期"
            name="delivery_date"
            type="date"
            required
            value={orderData.delivery_date}
            onChange={value => setOrderData(prev => ({ ...prev, delivery_date: value }))}
          />

          <AccessibleFormField
            label="備註"
            name="notes"
            placeholder="特殊要求或注意事項"
            value={orderData.notes}
            onChange={value => setOrderData(prev => ({ ...prev, notes: value }))}
          />
        </div>
      </FormDialog>

      {/* 批量匯入對話框 */}
      <FormDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="批量匯入訂單"
        description="上傳 Excel 或 CSV 檔案以批量建立訂單"
        onSubmit={handleBulkImport}
        submitText="開始匯入"
      >
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-sm text-gray-600">拖拽檔案到此處或點擊選擇檔案</p>
            <p className="text-xs text-gray-500">支援 .xlsx、.csv 格式，檔案大小不超過 10MB</p>
            <Button variant="outline" className="mt-4">
              選擇檔案
            </Button>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-medium text-blue-900">檔案格式要求：</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• 第一列為標題行：供應商、產品名稱、數量、單位、預計送達日期</li>
              <li>• 日期格式：YYYY-MM-DD</li>
              <li>• 數量必須為數字</li>
              <li>• 供應商名稱必須與系統中已有供應商匹配</li>
            </ul>
          </div>
        </div>
      </FormDialog>
    </section>
  )
}
