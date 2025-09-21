'use client'

import { useState } from 'react'
import { BillingAlert } from '@/types/platform-billing'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { cn } from '@/lib/utils'
import { 
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  Check,
  X,
  Eye
} from 'lucide-react'

interface BillingAlertsPanelProps {
  alerts: BillingAlert[]
  loading?: boolean
}

export function BillingAlertsPanel({ alerts, loading }: BillingAlertsPanelProps) {
  const [selectedAlert, setSelectedAlert] = useState<BillingAlert | null>(null)
  const { actions: { acknowledgeAlert } } = usePlatformBillingStore()

  const getAlertIcon = (type: string, severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <Activity className="h-5 w-5 text-blue-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />
    }
  }

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <DollarSign className="h-4 w-4" />
      case 'system':
        return <Activity className="h-4 w-4" />
      case 'threshold':
        return <AlertTriangle className="h-4 w-4" />
      case 'anomaly':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const formatAlertTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 60) {
      return `${minutes}分鐘前`
    } else if (hours < 24) {
      return `${hours}小時前`
    } else {
      return `${days}天前`
    }
  }

  const handleAcknowledge = async (alert: BillingAlert) => {
    try {
      await acknowledgeAlert(alert.id)
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)
  const acknowledgedAlerts = alerts.filter(alert => alert.acknowledged)

  if (loading && alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">系統告警</h3>
          {unacknowledgedAlerts.length > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
              {unacknowledgedAlerts.length} 未處理
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">目前沒有系統告警</p>
          <p className="text-sm text-gray-500 mt-1">所有系統運行正常</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 未確認的告警 */}
          {unacknowledgedAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'border rounded-lg p-4',
                getSeverityColor(alert.severity)
              )}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getAlertIcon(alert.type, alert.severity)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium">{alert.title}</h4>
                    <div className="flex items-center space-x-1 text-xs">
                      {getAlertTypeIcon(alert.type)}
                      <span className="capitalize">{alert.type}</span>
                    </div>
                    {alert.severity === 'critical' && (
                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded">
                        緊急
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm mb-2">{alert.message}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatAlertTime(alert.createdAt)}</span>
                      </div>
                      
                      {alert.supplierId && (
                        <div>
                          <span>供應商：{alert.supplierName}</span>
                        </div>
                      )}
                      
                      {alert.amount && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>NT$ {alert.amount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>詳情</span>
                      </button>
                      
                      <button
                        onClick={() => handleAcknowledge(alert)}
                        className="text-xs bg-white text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400 px-2 py-1 rounded flex items-center space-x-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>確認</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 已確認的告警（摺疊顯示） */}
          {acknowledgedAlerts.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800 py-2">
                已處理告警 ({acknowledgedAlerts.length})
              </summary>
              <div className="space-y-2 mt-2">
                {acknowledgedAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-700">{alert.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatAlertTime(alert.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* 告警詳情彈窗 */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getAlertIcon(selectedAlert.type, selectedAlert.severity)}
                  <h3 className="text-lg font-semibold">{selectedAlert.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">告警內容</p>
                  <p className="text-sm">{selectedAlert.message}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">類型</p>
                    <p className="font-medium capitalize">{selectedAlert.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">嚴重程度</p>
                    <p className="font-medium capitalize">{selectedAlert.severity}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">發生時間</p>
                    <p className="font-medium">
                      {selectedAlert.createdAt.toLocaleString('zh-TW')}
                    </p>
                  </div>
                  {selectedAlert.amount && (
                    <div>
                      <p className="text-gray-600">影響金額</p>
                      <p className="font-medium">NT$ {selectedAlert.amount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                
                {selectedAlert.supplierId && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">相關供應商</p>
                    <p className="text-sm font-medium">{selectedAlert.supplierName}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  關閉
                </button>
                {!selectedAlert.acknowledged && (
                  <button
                    onClick={() => {
                      handleAcknowledge(selectedAlert)
                      setSelectedAlert(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                  >
                    確認處理
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}