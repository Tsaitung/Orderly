'use client'

import * as React from 'react'
import { 
  Receipt,
  Clock, 
  CheckCircle, 
  AlertTriangle,
  X,
  Camera,
  Package,
  Star,
  FileText,
  Search,
  Filter,
  Plus,
  Download,
  RefreshCw,
  Eye,
  MapPin,
  Calendar,
  Scale,
  ThermometerSun
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { FormDialog } from '@/components/ui/accessible-modal'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'
import { cn } from '@/lib/utils'

interface AcceptedItem {
  id: string
  itemCode: string
  itemName: string
  orderedQuantity: number
  receivedQuantity: number
  unit: string
  qualityRating: 1 | 2 | 3 | 4 | 5
  condition: 'excellent' | 'good' | 'acceptable' | 'poor' | 'damaged'
  expiryDate?: string
  temperature?: number
  notes?: string
  photos: string[]
}

interface AcceptanceDiscrepancy {
  id: string
  type: 'quantity_short' | 'quantity_over' | 'quality_issue' | 'packaging_damage' | 'expired' | 'wrong_item' | 'other'
  severity: 'minor' | 'major' | 'critical'
  itemCode: string
  description: string
  evidencePhotos: string[]
  proposedResolution: string
  financialImpact?: number
}

interface AcceptanceRecord {
  id: string
  orderId: string
  orderNumber: string
  supplier: {
    name: string
    contact: string
    phone: string
  }
  acceptedBy: string
  acceptanceTime: string
  acceptanceLocation: string
  items: AcceptedItem[]
  overallRating: 1 | 2 | 3 | 4 | 5
  notes?: string
  discrepancies: AcceptanceDiscrepancy[]
  status: 'in_progress' | 'completed' | 'disputed'
  deliveryTime: string
  requestedDeliveryTime: string
}

const mockAcceptanceRecords: AcceptanceRecord[] = [
  {
    id: '1',
    orderId: 'order_123',
    orderNumber: 'ORD-2024-001',
    supplier: {
      name: '新鮮蔬果供應商',
      contact: '王經理',
      phone: '02-1111-2222'
    },
    acceptedBy: '張小明',
    acceptanceTime: '2024-01-16 14:25',
    acceptanceLocation: '台北店後門',
    items: [
      {
        id: '1-1',
        itemCode: 'VEG001',
        itemName: '有機高麗菜',
        orderedQuantity: 10,
        receivedQuantity: 10,
        unit: '公斤',
        qualityRating: 5,
        condition: 'excellent',
        expiryDate: '2024-01-20',
        notes: '品質優良，新鮮度佳',
        photos: ['photo1.jpg', 'photo2.jpg']
      },
      {
        id: '1-2',
        itemCode: 'VEG002',
        itemName: '新鮮蘿蔔',
        orderedQuantity: 8,
        receivedQuantity: 7.8,
        unit: '公斤',
        qualityRating: 4,
        condition: 'good',
        notes: '稍有短收但品質良好',
        photos: ['photo3.jpg']
      }
    ],
    overallRating: 4,
    notes: '整體驗收滿意，蘿蔔稍有短收',
    discrepancies: [
      {
        id: 'disc-1',
        type: 'quantity_short',
        severity: 'minor',
        itemCode: 'VEG002',
        description: '蘿蔔短收0.2公斤',
        evidencePhotos: ['evidence1.jpg'],
        proposedResolution: '接受短收，調整價格',
        financialImpact: -6
      }
    ],
    status: 'completed',
    deliveryTime: '2024-01-16 14:20',
    requestedDeliveryTime: '2024-01-16 14:00'
  },
  {
    id: '2',
    orderId: 'order_124',
    orderNumber: 'ORD-2024-002',
    supplier: {
      name: '優質肉品供應商',
      contact: '李師傅',
      phone: '02-2222-3333'
    },
    acceptedBy: '陳小華',
    acceptanceTime: '2024-01-16 10:15',
    acceptanceLocation: '台北店後門',
    items: [
      {
        id: '2-1',
        itemCode: 'MEAT001',
        itemName: 'A級牛肉',
        orderedQuantity: 5,
        receivedQuantity: 5,
        unit: '公斤',
        qualityRating: 5,
        condition: 'excellent',
        temperature: 2,
        notes: '冷鏈保存良好',
        photos: ['meat1.jpg', 'temp1.jpg']
      }
    ],
    overallRating: 5,
    notes: '冷鏈完善，品質優異',
    discrepancies: [],
    status: 'completed',
    deliveryTime: '2024-01-16 10:00',
    requestedDeliveryTime: '2024-01-16 10:00'
  },
  {
    id: '3',
    orderId: 'order_125',
    orderNumber: 'ORD-2024-003',
    supplier: {
      name: '海鮮直送',
      contact: '陳老闆',
      phone: '02-3333-4444'
    },
    acceptedBy: '林小美',
    acceptanceTime: '',
    acceptanceLocation: '台北店後門',
    items: [
      {
        id: '3-1',
        itemCode: 'FISH001',
        itemName: '新鮮鮭魚',
        orderedQuantity: 2,
        receivedQuantity: 1.5,
        unit: '公斤',
        qualityRating: 2,
        condition: 'poor',
        temperature: 8,
        notes: '溫度過高，有異味',
        photos: ['fish1.jpg', 'fish2.jpg']
      }
    ],
    overallRating: 2,
    notes: '冷鏈斷鏈，品質不佳',
    discrepancies: [
      {
        id: 'disc-2',
        type: 'quality_issue',
        severity: 'critical',
        itemCode: 'FISH001',
        description: '鮭魚溫度過高，有異味',
        evidencePhotos: ['fish_temp.jpg', 'fish_smell.jpg'],
        proposedResolution: '退貨重送',
        financialImpact: -2400
      }
    ],
    status: 'disputed',
    deliveryTime: '2024-01-15 08:30',
    requestedDeliveryTime: '2024-01-15 08:00'
  }
]

export default function RestaurantAcceptanceManagement() {
  const [acceptanceRecords, setAcceptanceRecords] = React.useState<AcceptanceRecord[]>([])
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [selectedRecord, setSelectedRecord] = React.useState<AcceptanceRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isNewAcceptanceOpen, setIsNewAcceptanceOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const { announcePolite, announceSuccess } = useScreenReaderAnnouncer()

  // Fetch acceptance records from API
  const fetchAcceptanceRecords = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/bff/api/acceptance')
      const data = await response.json()
      
      if (data.success) {
        // Convert string dates back to Date objects for UI formatting
        const records = data.data.map((record: any) => ({
          ...record,
          acceptanceTime: record.acceptanceTime || '',
          deliveryTime: record.deliveryTime || '',
          requestedDeliveryTime: record.requestedDeliveryTime || ''
        }))
        setAcceptanceRecords(records)
        announcePolite(`已載入 ${records.length} 筆驗收記錄`)
      } else {
        throw new Error(data.error || 'Failed to fetch acceptance records')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      announcePolite(`載入失敗：${errorMessage}`)
      
      // Fallback to mock data in case of API failure
      setAcceptanceRecords(mockAcceptanceRecords)
    } finally {
      setIsLoading(false)
    }
  }, [announcePolite])

  // Load data on component mount
  React.useEffect(() => {
    fetchAcceptanceRecords()
  }, [fetchAcceptanceRecords])

  const filteredRecords = React.useMemo(() => {
    return acceptanceRecords.filter(record => {
      const matchesSearch = searchTerm === '' || 
        record.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.acceptedBy.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [acceptanceRecords, searchTerm, statusFilter])

  const handleViewDetail = React.useCallback((record: AcceptanceRecord) => {
    setSelectedRecord(record)
    setIsDetailOpen(true)
    announcePolite(`查看驗收記錄 ${record.orderNumber} 詳細資訊`)
  }, [announcePolite])

  const getStatusIcon = (status: AcceptanceRecord['status']) => {
    switch (status) {
      case 'in_progress': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'disputed': return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (status: AcceptanceRecord['status']) => {
    switch (status) {
      case 'in_progress': return '進行中'
      case 'completed': return '已完成'
      case 'disputed': return '有爭議'
    }
  }

  const getStatusVariant = (status: AcceptanceRecord['status']) => {
    switch (status) {
      case 'in_progress': return 'warning'
      case 'completed': return 'success'
      case 'disputed': return 'destructive'
      default: return 'secondary'
    }
  }

  const getQualityStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          'h-4 w-4',
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        )}
      />
    ))
  }

  const getConditionBadge = (condition: AcceptedItem['condition']) => {
    switch (condition) {
      case 'excellent': return <Badge variant="success" size="sm">優良</Badge>
      case 'good': return <Badge variant="info" size="sm">良好</Badge>
      case 'acceptable': return <Badge variant="warning" size="sm">可接受</Badge>
      case 'poor': return <Badge variant="destructive" size="sm">差</Badge>
      case 'damaged': return <Badge variant="destructive" size="sm">損壞</Badge>
    }
  }

  const getDiscrepancySeverityBadge = (severity: AcceptanceDiscrepancy['severity']) => {
    switch (severity) {
      case 'minor': return <Badge variant="warning" size="sm">輕微</Badge>
      case 'major': return <Badge variant="destructive" size="sm">重大</Badge>
      case 'critical': return <Badge variant="destructive" size="sm">嚴重</Badge>
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '未完成'
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const statusOptions = [
    { value: 'all', label: '所有狀態' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '已完成' },
    { value: 'disputed', label: '有爭議' }
  ]

  // 統計數據
  const stats = React.useMemo(() => {
    const inProgress = acceptanceRecords.filter(r => r.status === 'in_progress').length
    const disputed = acceptanceRecords.filter(r => r.status === 'disputed').length
    const completed = acceptanceRecords.filter(r => r.status === 'completed').length
    const avgRating = acceptanceRecords.length > 0 
      ? acceptanceRecords.reduce((sum, r) => sum + r.overallRating, 0) / acceptanceRecords.length
      : 0
    
    return { inProgress, disputed, completed, avgRating }
  }, [acceptanceRecords])

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">待驗收</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">有爭議</p>
                <p className="text-2xl font-bold text-red-600">{stats.disputed}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">已完成</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">平均評分</p>
                <div className="flex items-center space-x-1">
                  <p className="text-2xl font-bold text-primary-600">
                    {stats.avgRating.toFixed(1)}
                  </p>
                  <Star className="h-5 w-5 text-yellow-400 fill-current" />
                </div>
              </div>
              <Receipt className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 操作工具欄 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5 text-primary-600" />
              <span>驗收管理</span>
            </CardTitle>
            
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchAcceptanceRecords}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                重新整理
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                匯出資料
              </Button>
              <Button 
                onClick={() => setIsNewAcceptanceOpen(true)}
                className="bg-primary-600 hover:bg-primary-700"
              >
                <Camera className="h-4 w-4 mr-2" />
                拍照驗收
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 搜尋和篩選 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="搜尋訂單編號、供應商或驗收人員..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <AccessibleSelect
              label="驗收狀態"
              name="status-filter"
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          {/* 錯誤狀態 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">載入失敗</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={fetchAcceptanceRecords}
              >
                重試
              </Button>
            </div>
          )}

          {/* 驗收記錄列表 */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p>載入驗收記錄中...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>沒有找到符合條件的驗收記錄</p>
              </div>
            ) : (
              filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 transition-all hover:shadow-md bg-white"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* 基本資訊 */}
                    <div className="lg:col-span-4 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="font-bold text-primary-600">
                          {record.orderNumber}
                        </div>
                        <Badge 
                          variant={getStatusVariant(record.status)}
                          className="flex items-center space-x-1"
                        >
                          {getStatusIcon(record.status)}
                          <span>{getStatusText(record.status)}</span>
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">
                          {record.supplier.name}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center space-x-2">
                          <MapPin className="h-3 w-3" />
                          <span>{record.acceptanceLocation}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          驗收人員: {record.acceptedBy}
                        </div>
                      </div>
                    </div>

                    {/* 驗收詳情 */}
                    <div className="lg:col-span-4 space-y-2">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">品項數量:</span>
                          <span className="font-medium">{record.items.length} 項</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">整體評分:</span>
                          <div className="flex items-center space-x-1">
                            {getQualityStars(record.overallRating)}
                            <span className="text-sm font-medium ml-1">
                              {record.overallRating}/5
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">異常項目:</span>
                          {record.discrepancies.length > 0 ? (
                            <Badge variant="destructive" size="sm">
                              {record.discrepancies.length} 項
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">無異常</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 時間資訊 */}
                    <div className="lg:col-span-2 space-y-2">
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-gray-600 block">送達時間:</span>
                          <span className="text-xs">{formatDateTime(record.deliveryTime)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 block">驗收時間:</span>
                          <span className="text-xs text-green-600">
                            {formatDateTime(record.acceptanceTime)}
                          </span>
                        </div>
                        {record.deliveryTime && record.requestedDeliveryTime && (
                          <div>
                            <span className="text-gray-600 block">配送狀況:</span>
                            <span className={cn(
                              "text-xs",
                              new Date(record.deliveryTime) <= new Date(record.requestedDeliveryTime)
                                ? "text-green-600" : "text-red-600"
                            )}>
                              {new Date(record.deliveryTime) <= new Date(record.requestedDeliveryTime)
                                ? "準時送達" : "延遲送達"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="lg:col-span-2 flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(record)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>查看詳情</span>
                      </Button>
                      
                      {record.status === 'in_progress' && (
                        <Button
                          variant="solid"
                          colorScheme="green"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>完成驗收</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 品項預覽 */}
                  <div className="mt-4 border-t pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {record.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                          <Package className="h-4 w-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{item.itemName}</div>
                            <div className="text-xs text-gray-600">
                              {item.receivedQuantity}/{item.orderedQuantity} {item.unit}
                            </div>
                          </div>
                          {getConditionBadge(item.condition)}
                        </div>
                      ))}
                      {record.items.length > 3 && (
                        <div className="flex items-center justify-center p-2 bg-gray-100 rounded text-sm text-gray-600">
                          還有 {record.items.length - 3} 項...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 備註 */}
                  {record.notes && (
                    <div className="mt-3 p-2 bg-blue-50 border-l-4 border-blue-400 rounded-r">
                      <p className="text-sm text-blue-800">
                        <strong>備註:</strong> {record.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 驗收詳情對話框 */}
      {selectedRecord && (
        <FormDialog
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          title={`驗收詳情 - ${selectedRecord.orderNumber}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* 基本資訊 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">驗收資訊</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">訂單編號:</span>
                    <span className="font-medium">{selectedRecord.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">驗收人員:</span>
                    <span>{selectedRecord.acceptedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">驗收地點:</span>
                    <span>{selectedRecord.acceptanceLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">驗收時間:</span>
                    <span>{formatDateTime(selectedRecord.acceptanceTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">整體評分:</span>
                    <div className="flex items-center space-x-1">
                      {getQualityStars(selectedRecord.overallRating)}
                      <span className="ml-1">{selectedRecord.overallRating}/5</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">供應商資訊</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">供應商名稱:</span>
                    <span className="font-medium">{selectedRecord.supplier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">聯絡人:</span>
                    <span>{selectedRecord.supplier.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">電話:</span>
                    <span>{selectedRecord.supplier.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">送達時間:</span>
                    <span>{formatDateTime(selectedRecord.deliveryTime)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 驗收項目明細 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">驗收明細</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 grid grid-cols-8 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-2">品項名稱</div>
                  <div>訂購數量</div>
                  <div>實收數量</div>
                  <div>品質評分</div>
                  <div>狀況</div>
                  <div>溫度</div>
                  <div>照片</div>
                </div>
                {selectedRecord.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 grid grid-cols-8 gap-4 text-sm border-t border-gray-100">
                    <div className="col-span-2">
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-xs text-gray-500">{item.itemCode}</div>
                      {item.notes && (
                        <div className="text-xs text-gray-600 mt-1">{item.notes}</div>
                      )}
                    </div>
                    <div>{item.orderedQuantity} {item.unit}</div>
                    <div className={cn(
                      "font-medium",
                      item.receivedQuantity < item.orderedQuantity ? "text-red-600" : "text-green-600"
                    )}>
                      {item.receivedQuantity} {item.unit}
                    </div>
                    <div className="flex items-center space-x-1">
                      {getQualityStars(item.qualityRating)}
                    </div>
                    <div>{getConditionBadge(item.condition)}</div>
                    <div>
                      {item.temperature && (
                        <div className="flex items-center space-x-1">
                          <ThermometerSun className="h-3 w-3" />
                          <span>{item.temperature}°C</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Badge variant="outline" size="sm">
                        {item.photos.length} 張
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 異常項目 */}
            {selectedRecord.discrepancies.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">異常項目</h4>
                <div className="space-y-3">
                  {selectedRecord.discrepancies.map((discrepancy) => (
                    <div key={discrepancy.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-900">{discrepancy.description}</span>
                        </div>
                        {getDiscrepancySeverityBadge(discrepancy.severity)}
                      </div>
                      <div className="text-sm text-red-800">
                        <p><strong>處理方案:</strong> {discrepancy.proposedResolution}</p>
                        {discrepancy.financialImpact && (
                          <p><strong>金額影響:</strong> NT$ {discrepancy.financialImpact}</p>
                        )}
                        <p><strong>證據照片:</strong> {discrepancy.evidencePhotos.length} 張</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormDialog>
      )}

      {/* 新增驗收對話框 */}
      <FormDialog
        isOpen={isNewAcceptanceOpen}
        onClose={() => setIsNewAcceptanceOpen(false)}
        title="拍照驗收"
        description="開始新的送貨驗收流程"
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>拍照驗收功能開發中...</p>
            <p className="text-sm">即將上線，敬請期待</p>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}
