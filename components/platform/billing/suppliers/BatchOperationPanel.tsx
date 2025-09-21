'use client'

import { useState } from 'react'
import { BatchOperationType } from '@/types/platform-billing'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { cn } from '@/lib/utils'
import { 
  Play, 
  Settings, 
  Send, 
  Calculator,
  RefreshCw,
  FileText,
  CheckCircle,
  X,
  AlertTriangle,
  Clock,
  Users
} from 'lucide-react'

interface BatchOperationPanelProps {
  selectedCount: number
}

const BATCH_OPERATIONS: Array<{
  type: BatchOperationType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  requiresConfirmation: boolean
}> = [
  {
    type: 'update_rates',
    label: '批次調整費率',
    description: '為選中的供應商批次調整費率',
    icon: Calculator,
    color: 'bg-blue-500',
    requiresConfirmation: true
  },
  {
    type: 'generate_statements',
    label: '生成對帳單',
    description: '批次生成選中供應商的對帳單',
    icon: FileText,
    color: 'bg-green-500',
    requiresConfirmation: false
  },
  {
    type: 'send_notifications',
    label: '發送通知',
    description: '向選中供應商發送計費通知',
    icon: Send,
    color: 'bg-purple-500',
    requiresConfirmation: false
  },
  {
    type: 'tier_recalculation',
    label: '重算層級',
    description: '根據最新 GMV 重新計算供應商層級',
    icon: RefreshCw,
    color: 'bg-orange-500',
    requiresConfirmation: true
  }
]

export function BatchOperationPanel({ selectedCount }: BatchOperationPanelProps) {
  const [selectedOperation, setSelectedOperation] = useState<BatchOperationType | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [operationParams, setOperationParams] = useState<Record<string, any>>({})
  
  const {
    batch: { currentTask, loading },
    suppliers: { selectedIds },
    actions: { executeBatchOperation, loadBatchStatus }
  } = usePlatformBillingStore()

  const handleOperationSelect = (operation: BatchOperationType) => {
    setSelectedOperation(operation)
    const operationConfig = BATCH_OPERATIONS.find(op => op.type === operation)
    
    if (operationConfig?.requiresConfirmation) {
      setShowConfirmDialog(true)
    } else {
      executeOperation(operation, {})
    }
  }

  const executeOperation = async (operation: BatchOperationType, params: Record<string, any>) => {
    try {
      await executeBatchOperation({
        type: operation,
        supplierIds: selectedIds,
        parameters: params
      })
      setShowConfirmDialog(false)
      setSelectedOperation(null)
      setOperationParams({})
    } catch (error) {
      console.error('Failed to execute batch operation:', error)
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case 'queued': return '排隊中'
      case 'processing': return '執行中'
      case 'completed': return '已完成'
      case 'failed': return '失敗'
      default: return status
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-lg">
          <Settings className="h-4 w-4 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">批次操作</h3>
      </div>

      {/* 選擇統計 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2 text-sm text-blue-800">
          <Users className="h-4 w-4" />
          <span>已選擇 {selectedCount} 家供應商</span>
        </div>
      </div>

      {/* 當前任務狀態 */}
      {currentTask && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getTaskStatusIcon(currentTask.status)}
              <span className="text-sm font-medium text-gray-900">
                正在執行批次操作
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {getTaskStatusText(currentTask.status)}
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>進度</span>
              <span>{currentTask.processedItems} / {currentTask.totalItems}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(currentTask.processedItems / currentTask.totalItems) * 100}%` 
                }}
              />
            </div>
            {currentTask.failedItems > 0 && (
              <div className="text-xs text-red-600">
                {currentTask.failedItems} 個項目失敗
              </div>
            )}
          </div>
        </div>
      )}

      {/* 操作按鈕 */}
      <div className="space-y-3">
        {BATCH_OPERATIONS.map((operation) => (
          <button
            key={operation.type}
            onClick={() => handleOperationSelect(operation.type)}
            disabled={selectedCount === 0 || loading}
            className={cn(
              'w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all',
              selectedCount === 0 || loading
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm text-gray-700'
            )}
          >
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg text-white',
              selectedCount === 0 || loading ? 'bg-gray-300' : operation.color
            )}>
              <operation.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{operation.label}</div>
              <div className="text-xs text-gray-500">{operation.description}</div>
            </div>
            {selectedCount > 0 && !loading && (
              <Play className="h-4 w-4 text-gray-400" />
            )}
          </button>
        ))}
      </div>

      {/* 操作歷史 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">最近操作</h4>
        <div className="space-y-2">
          {/* 這裡可以顯示最近的批次操作歷史 */}
          <div className="text-sm text-gray-500 text-center py-2">
            暫無操作記錄
          </div>
        </div>
      </div>

      {/* 確認對話框 */}
      {showConfirmDialog && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900">確認批次操作</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-600">
                  您即將對 {selectedCount} 家供應商執行 "
                  {BATCH_OPERATIONS.find(op => op.type === selectedOperation)?.label}"
                  操作。此操作可能會影響計費和付款狀態。
                </p>

                {selectedOperation === 'update_rates' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      新費率 (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={operationParams.newRate || ''}
                      onChange={(e) => setOperationParams(prev => ({
                        ...prev,
                        newRate: Number(e.target.value)
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="輸入新的費率"
                    />
                  </div>
                )}

                {selectedOperation === 'send_notifications' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      通知類型
                    </label>
                    <select
                      value={operationParams.notificationType || ''}
                      onChange={(e) => setOperationParams(prev => ({
                        ...prev,
                        notificationType: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">選擇通知類型</option>
                      <option value="statement_ready">對帳單已準備</option>
                      <option value="payment_due">付款到期提醒</option>
                      <option value="rate_change">費率變更通知</option>
                    </select>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-800">
                    <strong>注意：</strong>此操作無法撤銷，請確認資訊正確無誤。
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false)
                    setSelectedOperation(null)
                    setOperationParams({})
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => executeOperation(selectedOperation, operationParams)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? '執行中...' : '確認執行'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}