'use client'

import React, { useState } from 'react'
import {
  AccessibleModal,
  AccessibleModalContent,
  AccessibleModalHeader,
  AccessibleModalTitle,
} from '@/components/ui/accessible-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BulkProductOperation, ProductStatus } from '@/lib/api/product-types'
import {
  Package,
  DollarSign,
  Archive,
  Trash2,
  AlertTriangle,
  Loader,
  Save,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
} from 'lucide-react'

interface BulkProductModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProductIds: string[]
  onBulkOperation: (operation: BulkProductOperation) => Promise<void>
  isOperating: boolean
}

const BULK_OPERATIONS = [
  {
    type: 'update_status',
    label: '批量更新狀態',
    description: '將選取的產品批量更新為指定狀態',
    icon: Package,
    color: 'text-blue-600',
    options: [
      { value: 'active', label: '上架', description: '產品正常販售', color: 'text-green-600' },
      { value: 'inactive', label: '下架', description: '暫停販售', color: 'text-gray-600' },
      { value: 'discontinued', label: '停產', description: '永久停止', color: 'text-red-600' },
      { value: 'out_of_stock', label: '缺貨', description: '臨時缺貨', color: 'text-yellow-600' },
    ],
  },
  {
    type: 'update_price',
    label: '批量價格調整',
    description: '對選取的產品進行統一的價格調整',
    icon: DollarSign,
    color: 'text-green-600',
    options: [
      { value: 'increase', label: '價格上調', description: '按金額或百分比上調' },
      { value: 'decrease', label: '價格下調', description: '按金額或百分比下調' },
      { value: 'set', label: '設定價格', description: '設定統一價格' },
    ],
  },
  {
    type: 'delete',
    label: '批量刪除',
    description: '永久刪除選取的產品（無法復原）',
    icon: Trash2,
    color: 'text-red-600',
    dangerous: true,
  },
]

export default function BulkProductModal({
  isOpen,
  onClose,
  selectedProductIds,
  onBulkOperation,
  isOperating,
}: BulkProductModalProps) {
  const [selectedOperation, setSelectedOperation] = useState<string>('')
  const [operationData, setOperationData] = useState<{
    status?: ProductStatus
    price_modifier?: number
    notes?: string
    price_type?: 'amount' | 'percentage'
    price_action?: 'increase' | 'decrease' | 'set'
  }>({})
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Handle operation selection
  const handleOperationChange = (operationType: string) => {
    setSelectedOperation(operationType)
    setOperationData({})
    setConfirmDelete(false)
  }

  // Handle data change
  const handleDataChange = (key: string, value: any) => {
    setOperationData(prev => ({ ...prev, [key]: value }))
  }

  // Calculate price adjustment
  const calculatePriceModifier = () => {
    const { price_modifier, price_type, price_action } = operationData
    if (!price_modifier || !price_action) return 0

    let modifier = price_modifier

    if (price_action === 'decrease') {
      modifier = -modifier
    }

    // Convert percentage to decimal for calculation
    if (price_type === 'percentage') {
      modifier = modifier / 100
    }

    return modifier
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedOperation) return

    const operation: BulkProductOperation = {
      product_ids: selectedProductIds,
      operation: selectedOperation as any,
      data: {},
    }

    switch (selectedOperation) {
      case 'update_status':
        if (!operationData.status) return
        operation.data.status = operationData.status
        break

      case 'update_price':
        const priceModifier = calculatePriceModifier()
        if (priceModifier === 0 && operationData.price_action !== 'set') return
        operation.data.price_modifier = priceModifier
        break

      case 'delete':
        if (!confirmDelete) return
        break
    }

    operation.data.notes = operationData.notes

    try {
      await onBulkOperation(operation)
      handleClose()
    } catch (error) {
      console.error('Bulk operation failed:', error)
    }
  }

  // Handle close
  const handleClose = () => {
    if (!isOperating) {
      setSelectedOperation('')
      setOperationData({})
      setConfirmDelete(false)
      onClose()
    }
  }

  // Get current operation config
  const currentOperation = BULK_OPERATIONS.find(op => op.type === selectedOperation)

  return (
    <AccessibleModal open={isOpen} onOpenChange={handleClose}>
      <AccessibleModalContent className="max-w-2xl">
        <AccessibleModalHeader>
          <AccessibleModalTitle>批量產品操作</AccessibleModalTitle>
        </AccessibleModalHeader>

        <div className="space-y-6">
          {/* Selection Summary */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">已選取產品</h3>
                <p className="text-sm text-blue-700">
                  將對以下 {selectedProductIds.length} 項產品執行批量操作
                </p>
              </div>
              <Badge variant="outline" className="border-blue-300 text-blue-600">
                {selectedProductIds.length} 項
              </Badge>
            </div>
          </div>

          {/* Operation Selection */}
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">選擇要執行的操作</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {BULK_OPERATIONS.map(operation => {
                const Icon = operation.icon
                const isSelected = selectedOperation === operation.type

                return (
                  <button
                    key={operation.type}
                    onClick={() => handleOperationChange(operation.type)}
                    className={`rounded-lg border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : operation.dangerous
                          ? 'border-red-200 hover:border-red-300 hover:bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon
                        className={`mt-0.5 h-5 w-5 ${
                          isSelected ? 'text-blue-600' : operation.color
                        }`}
                      />
                      <div>
                        <h4
                          className={`font-medium ${
                            isSelected
                              ? 'text-blue-900'
                              : operation.dangerous
                                ? 'text-red-700'
                                : 'text-gray-900'
                          }`}
                        >
                          {operation.label}
                        </h4>
                        <p
                          className={`text-sm ${
                            isSelected
                              ? 'text-blue-700'
                              : operation.dangerous
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {operation.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Operation Configuration */}
          {currentOperation && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">{currentOperation.label} 設定</h3>

              {/* Status Update */}
              {selectedOperation === 'update_status' && currentOperation.options && (
                <div className="grid grid-cols-2 gap-3">
                  {currentOperation.options.map(option => (
                    <div
                      key={option.value}
                      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                        operationData.status === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDataChange('status', option.value)}
                    >
                      <h4
                        className={`font-medium ${
                          operationData.status === option.value
                            ? 'text-blue-900'
                            : option.color || 'text-gray-900'
                        }`}
                      >
                        {option.label}
                      </h4>
                      <p
                        className={`text-sm ${
                          operationData.status === option.value ? 'text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        {option.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Price Update */}
              {selectedOperation === 'update_price' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {['increase', 'decrease', 'set'].map(action => (
                      <div
                        key={action}
                        className={`cursor-pointer rounded-lg border p-3 text-center transition-colors ${
                          operationData.price_action === action
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleDataChange('price_action', action)}
                      >
                        {action === 'increase' && (
                          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-green-600" />
                        )}
                        {action === 'decrease' && (
                          <TrendingDown className="mx-auto mb-1 h-5 w-5 text-red-600" />
                        )}
                        {action === 'set' && (
                          <DollarSign className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                        )}
                        <p
                          className={`text-sm font-medium ${
                            operationData.price_action === action
                              ? 'text-blue-900'
                              : 'text-gray-700'
                          }`}
                        >
                          {action === 'increase' && '價格上調'}
                          {action === 'decrease' && '價格下調'}
                          {action === 'set' && '設定價格'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {operationData.price_action && operationData.price_action !== 'set' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          調整方式
                        </label>
                        <select
                          value={operationData.price_type || 'amount'}
                          onChange={e => handleDataChange('price_type', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="amount">固定金額</option>
                          <option value="percentage">百分比</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          {operationData.price_type === 'percentage' ? '百分比 (%)' : '金額 (NT$)'}
                        </label>
                        <Input
                          type="number"
                          value={operationData.price_modifier || ''}
                          onChange={e =>
                            handleDataChange('price_modifier', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          min="0"
                          step={operationData.price_type === 'percentage' ? '1' : '0.01'}
                        />
                      </div>
                    </div>
                  )}

                  {operationData.price_action === 'set' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        統一價格 (NT$)
                      </label>
                      <Input
                        type="number"
                        value={operationData.price_modifier || ''}
                        onChange={e =>
                          handleDataChange('price_modifier', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Delete Confirmation */}
              {selectedOperation === 'delete' && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-red-900">危險操作確認</h4>
                      <p className="mt-1 text-sm text-red-800">
                        您即將永久刪除 {selectedProductIds.length}{' '}
                        項產品。此操作無法復原，將同時刪除相關的圖片、庫存記錄等所有資料。
                      </p>
                      <div className="mt-3 flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="confirmDelete"
                          checked={confirmDelete}
                          onChange={e => setConfirmDelete(e.target.checked)}
                          className="rounded text-red-600"
                        />
                        <label htmlFor="confirmDelete" className="text-sm text-red-800">
                          我了解此操作無法復原，確認刪除
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  操作備註 (選填)
                </label>
                <Textarea
                  value={operationData.notes || ''}
                  onChange={e => handleDataChange('notes', e.target.value)}
                  placeholder="記錄此次批量操作的原因或說明..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 border-t pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isOperating}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !selectedOperation ||
                isOperating ||
                (selectedOperation === 'delete' && !confirmDelete) ||
                (selectedOperation === 'update_status' && !operationData.status) ||
                (selectedOperation === 'update_price' && !operationData.price_action)
              }
              variant={selectedOperation === 'delete' ? 'destructive' : 'default'}
            >
              {isOperating ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  處理中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  確認執行
                </>
              )}
            </Button>
          </div>
        </div>
      </AccessibleModalContent>
    </AccessibleModal>
  )
}
