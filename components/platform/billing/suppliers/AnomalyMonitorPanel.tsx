'use client'

import { BillingAnomaly } from '@/types/platform-billing'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { cn } from '@/lib/utils'
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  DollarSign,
  Clock,
  Eye,
  CheckCircle,
  X,
  AlertCircle,
  Activity,
  Zap
} from 'lucide-react'

interface AnomalyMonitorPanelProps {
  anomalies: BillingAnomaly[]
  loading?: boolean
}

export function AnomalyMonitorPanel({ anomalies, loading }: AnomalyMonitorPanelProps) {
  const { actions: { updateAnomalyStatus } } = usePlatformBillingStore()

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'rate_spike':
        return <TrendingUp className="h-4 w-4" />
      case 'payment_delay':
        return <Clock className="h-4 w-4" />
      case 'gmv_drop':
        return <TrendingDown className="h-4 w-4" />
      case 'commission_anomaly':
        return <DollarSign className="h-4 w-4" />
      case 'system_error':
        return <Zap className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAnomalyTypeName = (type: string) => {
    switch (type) {
      case 'rate_spike': return '費率異常'
      case 'payment_delay': return '付款延遲'
      case 'gmv_drop': return 'GMV下降'
      case 'commission_anomaly': return '佣金異常'
      case 'system_error': return '系統錯誤'
      default: return '未知異常'
    }
  }

  const getSeverityName = (severity: string) => {
    switch (severity) {
      case 'critical': return '嚴重'
      case 'high': return '高'
      case 'medium': return '中'
      case 'low': return '低'
      default: return severity
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小時前`
    } else {
      return '1小時內'
    }
  }

  const handleAcknowledge = async (anomaly: BillingAnomaly) => {
    try {
      await updateAnomalyStatus(anomaly.id, 'investigating')
    } catch (error) {
      console.error('Failed to acknowledge anomaly:', error)
    }
  }

  const handleResolve = async (anomaly: BillingAnomaly) => {
    try {
      await updateAnomalyStatus(anomaly.id, 'resolved', '已確認並處理')
    } catch (error) {
      console.error('Failed to resolve anomaly:', error)
    }
  }

  if (loading && anomalies.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
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

  const openAnomalies = anomalies.filter(a => a.status === 'open')
  const investigatingAnomalies = anomalies.filter(a => a.status === 'investigating')

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">異常監控</h3>
        </div>
        
        {openAnomalies.length > 0 && (
          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
            {openAnomalies.length} 待處理
          </span>
        )}
      </div>

      {anomalies.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600">目前沒有異常警報</p>
          <p className="text-sm text-gray-500 mt-1">系統運行正常</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 未處理的異常 */}
          {openAnomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={cn(
                'border rounded-lg p-4',
                getSeverityColor(anomaly.severity)
              )}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getAnomalyIcon(anomaly.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium">
                      {getAnomalyTypeName(anomaly.type)}
                    </h4>
                    <span className="text-xs font-medium px-2 py-0.5 rounded">
                      {getSeverityName(anomaly.severity)}
                    </span>
                    {anomaly.confidence && (
                      <span className="text-xs text-gray-600">
                        信心度: {(anomaly.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm mb-2">{anomaly.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(anomaly.detectedAt)}</span>
                      </div>
                      
                      {anomaly.supplierId && (
                        <div>
                          <span>供應商：{anomaly.supplierName}</span>
                        </div>
                      )}
                      
                      {anomaly.affectedAmount && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>NT$ {anomaly.affectedAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAcknowledge(anomaly)}
                        className="text-xs bg-white border border-gray-300 hover:border-gray-400 px-2 py-1 rounded flex items-center space-x-1"
                      >
                        <Eye className="h-3 w-3" />
                        <span>調查</span>
                      </button>
                      
                      {anomaly.autoResolvable && (
                        <button
                          onClick={() => handleResolve(anomaly)}
                          className="text-xs bg-green-50 text-green-700 border border-green-200 hover:border-green-300 px-2 py-1 rounded flex items-center space-x-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>解決</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* 調查中的異常 */}
          {investigatingAnomalies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">調查中</h4>
              <div className="space-y-2">
                {investigatingAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-blue-800">
                          {getAnomalyTypeName(anomaly.type)}
                        </span>
                        {anomaly.supplierName && (
                          <span className="text-xs text-blue-600">
                            - {anomaly.supplierName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-blue-600">
                        {formatTimeAgo(anomaly.detectedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 統計摘要 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-semibold text-red-600">
                  {openAnomalies.length}
                </div>
                <div className="text-gray-600">待處理</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {investigatingAnomalies.length}
                </div>
                <div className="text-gray-600">調查中</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}