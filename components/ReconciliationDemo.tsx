'use client'

import { useState, useEffect } from 'react'
import { cn, formatCurrency, getConfidenceLevel } from '@/lib/utils'

interface MockReconciliationItem {
  id: string
  orderNumber: string
  productName: string
  orderedQuantity: number
  deliveredQuantity: number
  unitPrice: number
  status: 'matched' | 'pending' | 'disputed'
  confidence: number
}

// 模擬對帳數據
const mockItems: MockReconciliationItem[] = [
  {
    id: '1',
    orderNumber: 'ORD-2025-001',
    productName: '新鮮牛肉片 500g',
    orderedQuantity: 10,
    deliveredQuantity: 10,
    unitPrice: 180,
    status: 'matched',
    confidence: 0.98
  },
  {
    id: '2', 
    orderNumber: 'ORD-2025-002',
    productName: '有機蔬菜包',
    orderedQuantity: 5,
    deliveredQuantity: 5,
    unitPrice: 120,
    status: 'matched',
    confidence: 0.95
  },
  {
    id: '3',
    orderNumber: 'ORD-2025-003', 
    productName: '海鮮拼盤',
    orderedQuantity: 3,
    deliveredQuantity: 2,
    unitPrice: 350,
    status: 'disputed',
    confidence: 0.45
  },
  {
    id: '4',
    orderNumber: 'ORD-2025-004',
    productName: '進口橄欖油 1L',
    orderedQuantity: 8,
    deliveredQuantity: 8,
    unitPrice: 280,
    status: 'pending',
    confidence: 0.78
  },
  {
    id: '5',
    orderNumber: 'ORD-2025-005',
    productName: '法式麵包',
    orderedQuantity: 15,
    deliveredQuantity: 15,
    unitPrice: 45,
    status: 'matched',
    confidence: 0.92
  }
]

export function ReconciliationDemo() {
  const [items, setItems] = useState<MockReconciliationItem[]>(mockItems)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [processedCount, setProcessedCount] = useState(0)
  
  const steps = [
    '掃描訂單數據',
    '匹配送貨單',
    '比對發票資訊',
    '計算差異',
    '生成對帳報告'
  ]
  
  const handleStartDemo = async () => {
    setIsProcessing(true)
    setCurrentStep(0)
    setProcessedCount(0)
    
    // 重置狀態
    setItems(mockItems.map(item => ({ ...item, status: 'pending' as const })))
    
    // 模擬處理過程
    for (let step = 0; step < steps.length; step++) {
      setCurrentStep(step)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // 逐個處理項目
    for (let i = 0; i < mockItems.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setItems(prev => prev.map((item, index) => 
        index === i ? { ...item, status: mockItems[i]?.status || item.status } : item
      ))
      setProcessedCount(i + 1)
    }
    
    setIsProcessing(false)
  }
  
  const matchedCount = items.filter(item => item.status === 'matched').length
  const disputedCount = items.filter(item => item.status === 'disputed').length
  const totalValue = items.reduce((sum, item) => 
    sum + (item.deliveredQuantity * item.unitPrice), 0
  )
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* 控制面板 */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row items-center justify-between">
          <div className="mb-4 lg:mb-0">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              智能對帳演示
            </h3>
            <p className="text-gray-600">
              觀看我們的 AI 引擎如何自動處理對帳流程
            </p>
          </div>
          
          <button
            onClick={handleStartDemo}
            disabled={isProcessing}
            className={cn(
              'btn btn-primary btn-lg px-8 py-3 rounded-lg shadow-md',
              isProcessing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isProcessing ? '處理中...' : '開始演示'}
          </button>
        </div>
        
        {/* 處理進度 */}
        {isProcessing && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                {steps[currentStep]}
              </span>
              <span className="text-sm text-gray-500">
                {processedCount}/{items.length} 項目已處理
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${((currentStep + 1) / steps.length) * 70 + (processedCount / items.length) * 30}%` 
                }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              {steps.map((step, index) => (
                <span 
                  key={index}
                  className={cn(
                    'transition-colors duration-300',
                    index <= currentStep ? 'text-primary-600 font-medium' : 'text-gray-400'
                  )}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* 統計摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {items.length}
          </div>
          <div className="text-sm text-gray-500">總訂單項目</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-reconciliation-approved mb-1">
            {matchedCount}
          </div>
          <div className="text-sm text-gray-500">自動匹配成功</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-reconciliation-disputed mb-1">
            {disputedCount}
          </div>
          <div className="text-sm text-gray-500">需要處理爭議</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-primary-600 mb-1 font-mono">
            {formatCurrency(totalValue)}
          </div>
          <div className="text-sm text-gray-500">總對帳金額</div>
        </div>
      </div>
      
      {/* 對帳項目列表 */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h4 className="text-lg font-semibold text-gray-900">
            對帳項目詳情
          </h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  訂單編號
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  商品名稱
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  訂購/送達
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  單價
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  信心分數
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const confidenceLevel = getConfidenceLevel(item.confidence)
                const hasDiscrepancy = item.orderedQuantity !== item.deliveredQuantity
                
                return (
                  <tr 
                    key={item.id} 
                    className={cn(
                      'hover:bg-gray-50 transition-colors duration-200',
                      isProcessing && item.status === 'pending' && 'auto-match-progress'
                    )}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm">
                        <span className={cn(
                          'font-mono',
                          hasDiscrepancy ? 'text-reconciliation-disputed' : 'text-gray-900'
                        )}>
                          {item.orderedQuantity}
                        </span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className={cn(
                          'font-mono',
                          hasDiscrepancy ? 'text-reconciliation-disputed font-bold' : 'text-gray-900'
                        )}>
                          {item.deliveredQuantity}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-mono text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="confidence-bar">
                          <div 
                            className={cn('confidence-fill', `confidence-${confidenceLevel.level}`)}
                            style={{ width: `${item.confidence * 100}%` }}
                          />
                        </div>
                        <span className={cn('text-xs font-medium', confidenceLevel.color)}>
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <ReconciliationStatusBadge status={item.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 處理結果摘要 */}
      {!isProcessing && processedCount === items.length && (
        <div className="mt-6 bg-gradient-to-r from-reconciliation-approved/10 to-primary-50 rounded-lg p-6 border border-reconciliation-approved/20">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-reconciliation-approved rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              對帳處理完成！
            </h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold text-reconciliation-approved">
                {Math.round((matchedCount / items.length) * 100)}%
              </div>
              <div className="text-sm text-gray-600">自動匹配率</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-600">
                30 秒
              </div>
              <div className="text-sm text-gray-600">處理時間</div>
              <div className="text-xs text-gray-500">vs 傳統 8 小時</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-reconciliation-processing">
                {disputedCount}
              </div>
              <div className="text-sm text-gray-600">需人工確認</div>
              <div className="text-xs text-gray-500">預計 5 分鐘解決</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReconciliationStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    matched: {
      label: '匹配成功',
      className: 'status-approved',
      icon: '✓'
    },
    pending: {
      label: '處理中',
      className: 'status-pending',
      icon: '⏳'
    },
    disputed: {
      label: '有差異',
      className: 'status-disputed',
      icon: '!'
    }
  }
  
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  
  return (
    <span className={cn('status-badge', config.className)}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  )
}