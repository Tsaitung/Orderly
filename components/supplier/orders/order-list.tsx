'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'

// 模擬訂單數據
const mockOrders = [
  {
    id: 'ORD-2025-001',
    customerName: '大樂司餐廳',
    customerCode: 'REST-001',
    items: [
      { name: '有機蔬菜組合', quantity: 10, unit: '箱', price: 350 },
      { name: '進口牛肉', quantity: 5, unit: 'kg', price: 800 }
    ],
    totalAmount: 7500,
    status: 'pending',
    orderDate: new Date('2025-09-18T08:30:00'),
    requestedDeliveryDate: new Date('2025-09-19T10:00:00'),
    priority: 'high',
    notes: '請確保蔬菜新鮮度，冷鏈配送'
  },
  {
    id: 'ORD-2025-002', 
    customerName: '烤食組合',
    customerCode: 'REST-002',
    items: [
      { name: '冷凍雞翅', quantity: 20, unit: 'kg', price: 280 },
      { name: '調味料包', quantity: 15, unit: '包', price: 45 }
    ],
    totalAmount: 6275,
    status: 'confirmed',
    orderDate: new Date('2025-09-18T09:15:00'),
    requestedDeliveryDate: new Date('2025-09-19T14:00:00'),
    priority: 'normal',
    notes: ''
  },
  {
    id: 'ORD-2025-003',
    customerName: '稻舍餐廳',
    customerCode: 'REST-003', 
    items: [
      { name: '日本米', quantity: 50, unit: 'kg', price: 120 },
      { name: '海苔片', quantity: 10, unit: '包', price: 85 }
    ],
    totalAmount: 6850,
    status: 'processing',
    orderDate: new Date('2025-09-18T10:45:00'),
    requestedDeliveryDate: new Date('2025-09-20T09:00:00'),
    priority: 'normal',
    notes: '配送前請確認米粒品質'
  },
  {
    id: 'ORD-2025-004',
    customerName: '樂多多火鍋',
    customerCode: 'REST-004',
    items: [
      { name: '火鍋料組合', quantity: 8, unit: '箱', price: 450 },
      { name: '高湯底料', quantity: 12, unit: '包', price: 120 }
    ],
    totalAmount: 5040,
    status: 'shipping',
    orderDate: new Date('2025-09-17T16:20:00'),
    requestedDeliveryDate: new Date('2025-09-18T11:00:00'),
    priority: 'urgent',
    notes: '急單，請優先處理'
  },
  {
    id: 'ORD-2025-005',
    customerName: '大樂司餐廳',
    customerCode: 'REST-001',
    items: [
      { name: '有機水果', quantity: 15, unit: '箱', price: 280 },
      { name: '蜂蜜', quantity: 6, unit: '瓶', price: 180 }
    ],
    totalAmount: 5280,
    status: 'delivered',
    orderDate: new Date('2025-09-17T11:30:00'),
    requestedDeliveryDate: new Date('2025-09-18T08:00:00'),
    priority: 'normal',
    notes: ''
  }
]

interface OrderListProps {
  searchParams: {
    status?: string
    customer?: string
    dateFrom?: string
    dateTo?: string
    search?: string
    page?: string
  }
}

const getStatusBadge = (status: string) => {
  const statusMap = {
    pending: { label: '待確認', variant: 'warning' as const, color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: '已確認', variant: 'info' as const, color: 'bg-blue-100 text-blue-800' },
    processing: { label: '處理中', variant: 'default' as const, color: 'bg-gray-100 text-gray-800' },
    shipping: { label: '配送中', variant: 'info' as const, color: 'bg-indigo-100 text-indigo-800' },
    delivered: { label: '已送達', variant: 'success' as const, color: 'bg-green-100 text-green-800' },
    cancelled: { label: '已取消', variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
  }
  return statusMap[status as keyof typeof statusMap] || statusMap.pending
}

const getPriorityBadge = (priority: string) => {
  const priorityMap = {
    low: { label: '低', color: 'bg-gray-100 text-gray-600' },
    normal: { label: '普通', color: 'bg-blue-100 text-blue-600' },
    high: { label: '高', color: 'bg-orange-100 text-orange-600' },
    urgent: { label: '緊急', color: 'bg-red-100 text-red-600' }
  }
  return priorityMap[priority as keyof typeof priorityMap] || priorityMap.normal
}

export default function OrderList({ searchParams }: OrderListProps) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])

  // 篩選訂單
  const filteredOrders = mockOrders.filter(order => {
    if (searchParams.status && order.status !== searchParams.status) return false
    if (searchParams.search) {
      const search = searchParams.search.toLowerCase()
      return (
        order.id.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search) ||
        order.items.some(item => item.name.toLowerCase().includes(search))
      )
    }
    return true
  })

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id))
    }
  }

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // TODO: 實作 API 調用
    console.log(`Updating order ${orderId} to status ${newStatus}`)
  }

  const getStatusActions = (currentStatus: string) => {
    const actions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipping', 'cancelled'],
      shipping: ['delivered'],
      delivered: [],
      cancelled: []
    }
    return actions[currentStatus as keyof typeof actions] || []
  }

  return (
    <div className="space-y-4">
      {/* 列表標題與批次操作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">
              全選 ({selectedOrders.length}/{filteredOrders.length})
            </span>
          </label>
          
          {selectedOrders.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline">
                批次確認
              </Button>
              <Button size="sm" variant="outline">
                批次列印
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500">
          共 {filteredOrders.length} 筆訂單
        </div>
      </div>

      {/* 訂單列表 */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const statusInfo = getStatusBadge(order.status)
          const priorityInfo = getPriorityBadge(order.priority)
          const isExpanded = expandedOrders.includes(order.id)
          const statusActions = getStatusActions(order.status)

          return (
            <div
              key={order.id}
              className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow"
            >
              {/* 訂單摘要 */}
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={() => handleSelectOrder(order.id)}
                    className="rounded border-gray-300"
                  />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    {/* 訂單號碼 */}
                    <div className="font-medium text-gray-900">
                      {order.id}
                    </div>
                    
                    {/* 客戶名稱 */}
                    <div>
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.customerCode}</div>
                    </div>
                    
                    {/* 訂單金額 */}
                    <div className="font-semibold text-blue-600">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    
                    {/* 狀態 */}
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                    </div>
                    
                    {/* 配送時間 */}
                    <div className="text-sm">
                      <div className="text-gray-500">要求配送</div>
                      <div className="font-medium">
                        {formatDate(order.requestedDeliveryDate, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    {/* 操作按鈕 */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandOrder(order.id)}
                      >
                        {isExpanded ? '收起' : '詳情'}
                      </Button>
                      
                      {statusActions.length > 0 && (
                        <div className="flex space-x-1">
                          {statusActions.map((action) => {
                            const actionLabels = {
                              confirmed: '確認',
                              processing: '處理',
                              shipping: '發貨',
                              delivered: '完成',
                              cancelled: '取消'
                            }
                            return (
                              <Button
                                key={action}
                                size="sm"
                                variant={action === 'cancelled' ? 'destructive' : 'default'}
                                onClick={() => handleStatusChange(order.id, action)}
                              >
                                {actionLabels[action as keyof typeof actionLabels]}
                              </Button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 展開的詳細資訊 */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 訂單項目 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">訂單項目</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-gray-500">
                                {item.quantity} {item.unit} × {formatCurrency(item.price)}
                              </div>
                            </div>
                            <div className="font-medium">
                              {formatCurrency(item.quantity * item.price)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 訂單資訊 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">訂單資訊</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">下單時間:</span>
                          <span>{formatDate(order.orderDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">要求配送時間:</span>
                          <span>{formatDate(order.requestedDeliveryDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">優先級:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                        </div>
                        {order.notes && (
                          <div>
                            <span className="text-gray-500">備註:</span>
                            <p className="mt-1 text-sm bg-white p-2 rounded border">{order.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分頁 */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-gray-500">
          顯示 1-{filteredOrders.length} 筆，共 {filteredOrders.length} 筆
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            上一頁
          </Button>
          <Button variant="outline" size="sm" disabled>
            下一頁
          </Button>
        </div>
      </div>
    </div>
  )
}