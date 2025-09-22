'use client'

import React from 'react'
import {
  Calendar,
  AlertTriangle,
  Clock,
  Package2,
  BarChart3,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Filter,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface BatchItem {
  id: string
  sku_id: string
  sku_code: string
  product_name: string
  batch_number: string
  manufacturing_date: Date
  expiry_date: Date
  quantity: number
  unit: string
  supplier_id: string
  supplier_name: string
  storage_location?: string
  quality_grade: string
  status: 'fresh' | 'warning' | 'expired' | 'recalled'
  days_until_expiry: number
  origin_country?: string
  certifications?: string[]
  notes?: string
}

interface ExpiryAlert {
  severity: 'high' | 'medium' | 'low'
  count: number
  description: string
}

export function BatchExpiryManagement() {
  const [batches, setBatches] = React.useState<BatchItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')
  const [alertThreshold, setAlertThreshold] = React.useState(7) // 7天內到期警告

  // 載入批次資料
  const loadBatches = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // TODO: 替換為實際的 API 呼叫
      // const response = await fetch('/api/products/skus/batches')
      // const data = await response.json()

      // 模擬資料
      const now = new Date()
      const mockBatches: BatchItem[] = [
        {
          id: 'batch-001',
          sku_id: 'sku-001',
          sku_code: 'VEG-001-500G-A-WASH',
          product_name: '有機青江菜',
          batch_number: 'BT20250919001',
          manufacturing_date: new Date('2025-09-15'),
          expiry_date: new Date('2025-09-22'),
          quantity: 150,
          unit: 'kg',
          supplier_id: 'sup-001',
          supplier_name: '優質農產',
          storage_location: '冷藏區 A-01',
          quality_grade: 'A',
          status: 'warning',
          days_until_expiry: 3,
          origin_country: '台灣',
          certifications: ['有機認證', 'HACCP'],
          notes: '本批次品質優良',
        },
        {
          id: 'batch-002',
          sku_id: 'sku-002',
          sku_code: 'VEG-002-1KG-A-RAW',
          product_name: '台灣高麗菜',
          batch_number: 'BT20250918002',
          manufacturing_date: new Date('2025-09-18'),
          expiry_date: new Date('2025-09-28'),
          quantity: 200,
          unit: 'kg',
          supplier_id: 'sup-002',
          supplier_name: '經濟農產',
          storage_location: '冷藏區 B-03',
          quality_grade: 'A',
          status: 'fresh',
          days_until_expiry: 9,
          origin_country: '台灣',
          certifications: ['HACCP'],
        },
        {
          id: 'batch-003',
          sku_id: 'sku-003',
          sku_code: 'VEG-003-500G-B-CUT',
          product_name: '切段胡蘿蔔',
          batch_number: 'BT20250910003',
          manufacturing_date: new Date('2025-09-10'),
          expiry_date: new Date('2025-09-18'),
          quantity: 80,
          unit: 'kg',
          supplier_id: 'sup-003',
          supplier_name: '標準農產',
          storage_location: '冷藏區 C-05',
          quality_grade: 'B',
          status: 'expired',
          days_until_expiry: -1,
          origin_country: '台灣',
        },
      ]

      setBatches(mockBatches)
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入批次資料失敗')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadBatches()
  }, [loadBatches])

  // 計算警報統計
  const getExpiryAlerts = (): ExpiryAlert[] => {
    const alerts: ExpiryAlert[] = []

    const expiredCount = batches.filter(b => b.status === 'expired').length
    const warningCount = batches.filter(b => b.status === 'warning').length
    const soonExpiredCount = batches.filter(
      b => b.days_until_expiry > 0 && b.days_until_expiry <= alertThreshold
    ).length

    if (expiredCount > 0) {
      alerts.push({
        severity: 'high',
        count: expiredCount,
        description: '已過期',
      })
    }

    if (warningCount > 0) {
      alerts.push({
        severity: 'medium',
        count: warningCount,
        description: '即將到期',
      })
    }

    if (soonExpiredCount > 0) {
      alerts.push({
        severity: 'low',
        count: soonExpiredCount,
        description: `${alertThreshold}天內到期`,
      })
    }

    return alerts
  }

  // 篩選批次
  const getFilteredBatches = () => {
    return batches
      .filter(batch => {
        const matchesSearch =
          !searchTerm ||
          batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          batch.sku_code.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = !statusFilter || batch.status === statusFilter

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => a.days_until_expiry - b.days_until_expiry) // 即將到期的排在前面
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'warning':
        return 'bg-orange-100 text-orange-800'
      case 'fresh':
        return 'bg-green-100 text-green-800'
      case 'recalled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'expired':
        return '已過期'
      case 'warning':
        return '即將到期'
      case 'fresh':
        return '新鮮'
      case 'recalled':
        return '已召回'
      default:
        return '未知'
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }

  const getExpiryDaysDisplay = (days: number) => {
    if (days < 0) return `已過期 ${Math.abs(days)} 天`
    if (days === 0) return '今日到期'
    if (days === 1) return '明日到期'
    return `${days} 天後到期`
  }

  const handleExportExpiringSoon = () => {
    const expiringSoon = batches.filter(
      b => b.days_until_expiry >= 0 && b.days_until_expiry <= alertThreshold
    )
    // TODO: 實作匯出功能
    console.log('匯出即將到期批次:', expiringSoon)
  }

  const alerts = getExpiryAlerts()
  const filteredBatches = getFilteredBatches()

  return (
    <div className="space-y-6">
      {/* 標題與快速操作 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>批次追蹤與到期管理</span>
              </CardTitle>
              <p className="mt-1 text-sm text-gray-600">管理所有 SKU 的批次資訊和到期日期</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm">
                <span>警告天數:</span>
                <Input
                  type="number"
                  value={alertThreshold}
                  onChange={e => setAlertThreshold(parseInt(e.target.value) || 7)}
                  className="w-16 text-center"
                  min="1"
                  max="30"
                />
                <span>天</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExpiringSoon}
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>匯出報告</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 警報統計 */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <span>到期警報</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {alerts.map((alert, index) => (
                <div key={index} className="text-center">
                  <div
                    className={`text-2xl font-bold ${
                      alert.severity === 'high'
                        ? 'text-red-600'
                        : alert.severity === 'medium'
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                    }`}
                  >
                    {alert.count}
                  </div>
                  <div className="text-sm text-gray-600">{alert.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 搜尋與篩選 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="搜尋批次號、產品名稱或 SKU 代碼..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">所有狀態</option>
              <option value="expired">已過期</option>
              <option value="warning">即將到期</option>
              <option value="fresh">新鮮</option>
              <option value="recalled">已召回</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 載入狀態 */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2" />
            <p className="text-gray-500">載入批次資料中...</p>
          </CardContent>
        </Card>
      )}

      {/* 錯誤狀態 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">載入失敗</p>
                <p className="text-sm text-red-600">{error}</p>
                <Button variant="outline" size="sm" onClick={loadBatches} className="mt-2">
                  重新載入
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 批次列表 */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredBatches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package2 className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-gray-500">沒有找到符合條件的批次</p>
              </CardContent>
            </Card>
          ) : (
            filteredBatches.map(batch => (
              <Card
                key={batch.id}
                className={`${
                  batch.status === 'expired'
                    ? 'border-red-200 bg-red-50'
                    : batch.status === 'warning'
                      ? 'border-orange-200 bg-orange-50'
                      : 'border-gray-200'
                }`}
              >
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                    {/* 基本資訊 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{batch.product_name}</h3>
                        <Badge className={getStatusColor(batch.status)}>
                          {getStatusText(batch.status)}
                        </Badge>
                      </div>
                      <p className="font-mono text-sm text-gray-600">{batch.sku_code}</p>
                      <p className="text-sm text-gray-500">批次: {batch.batch_number}</p>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">數量:</span>
                        <span className="text-sm font-medium">
                          {batch.quantity} {batch.unit}
                        </span>
                      </div>
                    </div>

                    {/* 日期資訊 */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">製造日期</p>
                        <p className="text-sm font-medium">
                          {formatDate(batch.manufacturing_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">到期日期</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">{formatDate(batch.expiry_date)}</p>
                          {batch.days_until_expiry <= alertThreshold && (
                            <Clock
                              className={`h-4 w-4 ${
                                batch.days_until_expiry < 0
                                  ? 'text-red-500'
                                  : batch.days_until_expiry <= 3
                                    ? 'text-orange-500'
                                    : 'text-yellow-500'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          batch.days_until_expiry < 0
                            ? 'text-red-600'
                            : batch.days_until_expiry <= 3
                              ? 'text-orange-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {getExpiryDaysDisplay(batch.days_until_expiry)}
                      </div>
                    </div>

                    {/* 供應商與位置 */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">供應商</p>
                        <p className="text-sm font-medium">{batch.supplier_name}</p>
                      </div>
                      {batch.storage_location && (
                        <div>
                          <p className="text-sm text-gray-600">儲存位置</p>
                          <p className="text-sm font-medium">{batch.storage_location}</p>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Badge variant="outline" className="text-xs">
                          {batch.quality_grade}級
                        </Badge>
                        {batch.origin_country && (
                          <Badge variant="outline" className="text-xs">
                            {batch.origin_country}
                          </Badge>
                        )}
                      </div>
                      {batch.certifications && batch.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {batch.certifications.map(cert => (
                            <Badge key={cert} variant="outline" className="text-xs">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作按鈕 */}
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-1 h-4 w-4" />
                        查看詳情
                      </Button>
                      {batch.status === 'expired' && (
                        <Button variant="destructive" size="sm" className="w-full">
                          標記處理
                        </Button>
                      )}
                      {batch.status === 'warning' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-orange-300 text-orange-700"
                        >
                          <AlertTriangle className="mr-1 h-4 w-4" />
                          設置提醒
                        </Button>
                      )}
                      {batch.notes && (
                        <div className="rounded bg-gray-50 p-2 text-xs text-gray-500">
                          {batch.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
