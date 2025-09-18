'use client'

import * as React from 'react'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Zap,
  Brain,
  RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { FormDialog, ConfirmDialog } from '@/components/ui/accessible-modal'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface ReconciliationItem {
  id: string
  orderNumber: string
  supplier: string
  invoiceNumber?: string
  orderAmount: number
  invoiceAmount: number
  discrepancyType: 'none' | 'price' | 'quantity' | 'missing_item' | 'extra_item' | 'quality'
  discrepancyAmount: number
  confidence: number
  status: 'pending' | 'processing' | 'matched' | 'discrepancy' | 'failed' | 'manual_review'
  mlSuggestion?: {
    action: 'approve' | 'reject' | 'investigate'
    reason: string
    alternativeMatches?: string[]
  }
  items: Array<{
    id: string
    name: string
    orderQty: number
    invoiceQty: number
    orderPrice: number
    invoicePrice: number
    matched: boolean
  }>
  timestamp: string
  processingTime?: number
  assignedTo?: string
  notes?: string
}

const mockReconciliationData: ReconciliationItem[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    supplier: '新鮮蔬果',
    invoiceNumber: 'INV-2024-VEG-001',
    orderAmount: 12500,
    invoiceAmount: 12800,
    discrepancyType: 'price',
    discrepancyAmount: 300,
    confidence: 73.5,
    status: 'discrepancy',
    mlSuggestion: {
      action: 'investigate',
      reason: '價格差異超過 2%，建議確認供應商調價通知',
      alternativeMatches: ['INV-2024-VEG-002', 'INV-2024-VEG-003']
    },
    items: [
      {
        id: '1-1',
        name: '有機高麗菜',
        orderQty: 20,
        invoiceQty: 20,
        orderPrice: 45,
        invoicePrice: 50,
        matched: false
      },
      {
        id: '1-2',
        name: '新鮮蘿蔔',
        orderQty: 15,
        invoiceQty: 15,
        orderPrice: 30,
        invoicePrice: 30,
        matched: true
      }
    ],
    timestamp: '2024-01-15 14:30:25',
    processingTime: 3.2
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    supplier: '優質肉品',
    invoiceNumber: 'INV-2024-MEAT-001',
    orderAmount: 18900,
    invoiceAmount: 18900,
    discrepancyType: 'none',
    discrepancyAmount: 0,
    confidence: 98.2,
    status: 'matched',
    mlSuggestion: {
      action: 'approve',
      reason: '完全匹配，建議自動核准'
    },
    items: [
      {
        id: '2-1',
        name: '優質牛肉',
        orderQty: 10,
        invoiceQty: 10,
        orderPrice: 800,
        invoicePrice: 800,
        matched: true
      }
    ],
    timestamp: '2024-01-15 15:45:12',
    processingTime: 1.8
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    supplier: '海鮮世界',
    orderAmount: 25300,
    invoiceAmount: 0,
    discrepancyType: 'missing_item',
    discrepancyAmount: 25300,
    confidence: 15.2,
    status: 'manual_review',
    mlSuggestion: {
      action: 'investigate',
      reason: '未找到對應發票，可能延遲送達或供應商未提供',
      alternativeMatches: []
    },
    items: [
      {
        id: '3-1',
        name: '新鮮鮭魚',
        orderQty: 5,
        invoiceQty: 0,
        orderPrice: 1200,
        invoicePrice: 0,
        matched: false
      }
    ],
    timestamp: '2024-01-15 16:20:45',
    assignedTo: '張小明'
  }
]

export default function ReconciliationWorkspace() {
  const [data, setData] = React.useState(mockReconciliationData)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [selectedItem, setSelectedItem] = React.useState<ReconciliationItem | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [confirmAction, setConfirmAction] = React.useState<'approve' | 'reject' | null>(null)
  const [sortField, setSortField] = React.useState<keyof ReconciliationItem>('timestamp')
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10

  const { announcePolite, announceSuccess, announceUrgent } = useScreenReaderAnnouncer()

  const filteredData = React.useMemo(() => {
    let filtered = data.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // 排序
    filtered.sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue
        return sortDirection === 'asc' ? comparison : -comparison
      }
      
      return 0
    })

    return filtered
  }, [data, searchTerm, statusFilter, sortField, sortDirection])

  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage])

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)

  const handleSort = React.useCallback((field: keyof ReconciliationItem) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    announcePolite(`按 ${field} ${sortDirection === 'asc' ? '升序' : '降序'} 排序`)
  }, [sortField, sortDirection, announcePolite])

  const handleViewDetail = React.useCallback((item: ReconciliationItem) => {
    setSelectedItem(item)
    setIsDetailOpen(true)
    announcePolite(`查看 ${item.orderNumber} 詳細資訊`)
  }, [announcePolite])

  const handleApprove = React.useCallback((item: ReconciliationItem) => {
    setSelectedItem(item)
    setConfirmAction('approve')
    setIsConfirmOpen(true)
  }, [])

  const handleReject = React.useCallback((item: ReconciliationItem) => {
    setSelectedItem(item)
    setConfirmAction('reject')
    setIsConfirmOpen(true)
  }, [])

  const handleConfirmAction = React.useCallback(() => {
    if (!selectedItem || !confirmAction) return

    setData(prev => prev.map(item => 
      item.id === selectedItem.id 
        ? { 
            ...item, 
            status: confirmAction === 'approve' ? 'matched' : 'failed',
            assignedTo: confirmAction === 'reject' ? '系統自動' : undefined
          }
        : item
    ))

    const message = confirmAction === 'approve' 
      ? `${selectedItem.orderNumber} 已核准`
      : `${selectedItem.orderNumber} 已拒絕`
    
    announceSuccess(message)
    setIsConfirmOpen(false)
    setSelectedItem(null)
    setConfirmAction(null)
  }, [selectedItem, confirmAction, announceSuccess])

  const handleBatchProcess = React.useCallback(() => {
    const autoApprovable = data.filter(item => 
      item.status === 'pending' && item.confidence >= 90
    )
    
    if (autoApprovable.length > 0) {
      setData(prev => prev.map(item => 
        autoApprovable.some(auto => auto.id === item.id)
          ? { ...item, status: 'matched' as const }
          : item
      ))
      announceSuccess(`已自動核准 ${autoApprovable.length} 筆高置信度匹配`)
    } else {
      announcePolite('沒有符合自動核准條件的項目')
    }
  }, [data, announceSuccess, announcePolite])

  const getStatusIcon = (status: ReconciliationItem['status']) => {
    switch (status) {
      case 'matched': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'discrepancy': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />
      case 'manual_review': return <Eye className="h-4 w-4 text-blue-600" />
      case 'processing': return <RefreshCw className="h-4 w-4 text-gray-600 animate-spin" />
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: ReconciliationItem['status']) => {
    switch (status) {
      case 'matched': return '已匹配'
      case 'discrepancy': return '有差異'
      case 'failed': return '失敗'
      case 'manual_review': return '人工審核'
      case 'processing': return '處理中'
      case 'pending': return '待處理'
    }
  }

  const getStatusVariant = (status: ReconciliationItem['status']) => {
    switch (status) {
      case 'matched': return 'success'
      case 'discrepancy': return 'warning'
      case 'failed': return 'destructive'
      case 'manual_review': return 'info'
      case 'processing': return 'secondary'
      case 'pending': return 'outline'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDiscrepancyTypeText = (type: ReconciliationItem['discrepancyType']) => {
    switch (type) {
      case 'none': return '無差異'
      case 'price': return '價格差異'
      case 'quantity': return '數量差異'
      case 'missing_item': return '缺少項目'
      case 'extra_item': return '額外項目'
      case 'quality': return '品質問題'
    }
  }

  const statusOptions = [
    { value: 'all', label: '所有狀態' },
    { value: 'pending', label: '待處理' },
    { value: 'processing', label: '處理中' },
    { value: 'matched', label: '已匹配' },
    { value: 'discrepancy', label: '有差異' },
    { value: 'manual_review', label: '人工審核' },
    { value: 'failed', label: '失敗' }
  ]

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-[#A47864]" />
            <span>智能對帳工作區</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchProcess}
              className="flex items-center space-x-2"
            >
              <Zap className="h-4 w-4" />
              <span>批次處理</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* 搜尋和篩選 */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜尋訂單編號、供應商或發票編號..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <AccessibleSelect
            label="狀態篩選"
            name="status-filter"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-48"
          />
        </div>

        {/* 對帳項目表格 */}
        <div className="flex-1 overflow-hidden">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* 表格標題 */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div 
                className="col-span-2 cursor-pointer flex items-center space-x-1 hover:text-gray-900"
                onClick={() => handleSort('orderNumber')}
              >
                <span>訂單編號</span>
                {sortField === 'orderNumber' && (
                  sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                )}
              </div>
              <div 
                className="col-span-2 cursor-pointer flex items-center space-x-1 hover:text-gray-900"
                onClick={() => handleSort('supplier')}
              >
                <span>供應商</span>
                {sortField === 'supplier' && (
                  sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                )}
              </div>
              <div 
                className="col-span-2 cursor-pointer flex items-center space-x-1 hover:text-gray-900"
                onClick={() => handleSort('confidence')}
              >
                <span>置信度</span>
                {sortField === 'confidence' && (
                  sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                )}
              </div>
              <div className="col-span-2">差異類型</div>
              <div className="col-span-2">狀態</div>
              <div className="col-span-2">操作</div>
            </div>

            {/* 表格內容 */}
            <div className="max-h-96 overflow-y-auto">
              {paginatedData.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>沒有找到符合條件的對帳項目</p>
                </div>
              ) : (
                paginatedData.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-gray-100 px-4 py-3 grid grid-cols-12 gap-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* 訂單編號 */}
                    <div className="col-span-2">
                      <div className="font-medium text-gray-900">{item.orderNumber}</div>
                      {item.invoiceNumber && (
                        <div className="text-xs text-gray-500">{item.invoiceNumber}</div>
                      )}
                    </div>

                    {/* 供應商 */}
                    <div className="col-span-2">
                      <div className="text-gray-900">{item.supplier}</div>
                      <div className="text-xs text-gray-500">
                        NT$ {item.orderAmount.toLocaleString()}
                        {item.discrepancyAmount !== 0 && (
                          <span className="text-red-600"> 
                            ({item.discrepancyAmount > 0 ? '+' : ''}{item.discrepancyAmount.toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 置信度 */}
                    <div className="col-span-2">
                      <div className={cn('font-medium', getConfidenceColor(item.confidence))}>
                        {item.confidence.toFixed(1)}%
                      </div>
                      <Progress 
                        value={item.confidence} 
                        className="h-1 mt-1"
                        variant={
                          item.confidence >= 90 ? 'success' :
                          item.confidence >= 70 ? 'warning' : 'destructive'
                        }
                      />
                    </div>

                    {/* 差異類型 */}
                    <div className="col-span-2">
                      <Badge 
                        variant={item.discrepancyType === 'none' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {getDiscrepancyTypeText(item.discrepancyType)}
                      </Badge>
                      {item.mlSuggestion && (
                        <div className="text-xs text-gray-500 mt-1">
                          AI: {item.mlSuggestion.action === 'approve' ? '建議核准' : 
                               item.mlSuggestion.action === 'reject' ? '建議拒絕' : '需要調查'}
                        </div>
                      )}
                    </div>

                    {/* 狀態 */}
                    <div className="col-span-2">
                      <Badge 
                        variant={getStatusVariant(item.status)}
                        size="sm"
                        className="flex items-center space-x-1 w-fit"
                      >
                        {getStatusIcon(item.status)}
                        <span>{getStatusText(item.status)}</span>
                      </Badge>
                      {item.processingTime && (
                        <div className="text-xs text-gray-500 mt-1">
                          {item.processingTime}s
                        </div>
                      )}
                    </div>

                    {/* 操作 */}
                    <div className="col-span-2 flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(item)}
                        className="p-1"
                        aria-label={`查看 ${item.orderNumber} 詳情`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {(item.status === 'discrepancy' || item.status === 'manual_review') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(item)}
                            className="p-1 text-green-600 hover:text-green-700"
                            aria-label={`核准 ${item.orderNumber}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(item)}
                            className="p-1 text-red-600 hover:text-red-700"
                            aria-label={`拒絕 ${item.orderNumber}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              顯示 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} 
              筆，共 {filteredData.length} 筆
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center space-x-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>上一頁</span>
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-1"
              >
                <span>下一頁</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* 詳情對話框 */}
      {selectedItem && (
        <FormDialog
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`對帳詳情 - ${selectedItem.orderNumber}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 基本資訊 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">訂單資訊</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">訂單編號:</span>
                    <span>{selectedItem.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">供應商:</span>
                    <span>{selectedItem.supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">訂單金額:</span>
                    <span>NT$ {selectedItem.orderAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">發票資訊</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">發票編號:</span>
                    <span>{selectedItem.invoiceNumber || '未提供'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">發票金額:</span>
                    <span>NT$ {selectedItem.invoiceAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">差異金額:</span>
                    <span className={selectedItem.discrepancyAmount !== 0 ? 'text-red-600' : 'text-green-600'}>
                      {selectedItem.discrepancyAmount > 0 ? '+' : ''}
                      NT$ {selectedItem.discrepancyAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ML 建議 */}
            {selectedItem.mlSuggestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                  <Brain className="h-4 w-4 mr-1" />
                  AI 分析建議
                </h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <div>
                    <span className="font-medium">建議動作: </span>
                    <Badge variant={
                      selectedItem.mlSuggestion.action === 'approve' ? 'success' :
                      selectedItem.mlSuggestion.action === 'reject' ? 'destructive' : 'warning'
                    }>
                      {selectedItem.mlSuggestion.action === 'approve' ? '核准' :
                       selectedItem.mlSuggestion.action === 'reject' ? '拒絕' : '調查'}
                    </Badge>
                  </div>
                  <div>{selectedItem.mlSuggestion.reason}</div>
                  {selectedItem.mlSuggestion.alternativeMatches && selectedItem.mlSuggestion.alternativeMatches.length > 0 && (
                    <div>
                      <span className="font-medium">替代匹配: </span>
                      {selectedItem.mlSuggestion.alternativeMatches.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 項目明細 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">項目明細</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 grid grid-cols-6 gap-4 text-sm font-medium text-gray-700">
                  <div>品項名稱</div>
                  <div>訂單數量</div>
                  <div>發票數量</div>
                  <div>訂單單價</div>
                  <div>發票單價</div>
                  <div>匹配狀態</div>
                </div>
                {selectedItem.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 grid grid-cols-6 gap-4 text-sm border-t border-gray-100">
                    <div className="font-medium">{item.name}</div>
                    <div>{item.orderQty}</div>
                    <div className={item.orderQty !== item.invoiceQty ? 'text-red-600' : ''}>
                      {item.invoiceQty}
                    </div>
                    <div>NT$ {item.orderPrice}</div>
                    <div className={item.orderPrice !== item.invoicePrice ? 'text-red-600' : ''}>
                      NT$ {item.invoicePrice}
                    </div>
                    <div>
                      <Badge variant={item.matched ? 'success' : 'destructive'} size="sm">
                        {item.matched ? '匹配' : '不匹配'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FormDialog>
      )}

      {/* 確認對話框 */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmAction}
        title={confirmAction === 'approve' ? '確認核准' : '確認拒絕'}
        description={
          confirmAction === 'approve' 
            ? `您確定要核准訂單 ${selectedItem?.orderNumber} 的對帳結果嗎？`
            : `您確定要拒絕訂單 ${selectedItem?.orderNumber} 的對帳結果嗎？`
        }
        confirmText={confirmAction === 'approve' ? '核准' : '拒絕'}
        variant={confirmAction === 'approve' ? 'default' : 'destructive'}
      />
    </Card>
  )
}