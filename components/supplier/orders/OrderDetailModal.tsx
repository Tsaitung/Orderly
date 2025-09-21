'use client'

import React, { useState } from 'react'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSupplierOrder } from '@/lib/api/supplier-hooks'
import { OrderStatus } from '@/lib/api/supplier-types'
import { getOrderStatusMeta } from '@/lib/status'
import {
  Clock,
  CheckCircle,
  Truck,
  Package,
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  Edit,
  Save,
  X,
  Loader
} from 'lucide-react'

interface OrderDetailModalProps {
  orderId: string | null;
  organizationId?: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (orderId: string, status: OrderStatus, notes?: string) => void;
}

const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['in_transit'],
  in_transit: ['delivered', 'disputed'],
  delivered: ['disputed'],
  cancelled: [],
  disputed: ['resolved']
};

// 狀態文案與樣式改由 '@/lib/status' 集中提供

export default function OrderDetailModal({ 
  orderId, 
  organizationId, 
  isOpen, 
  onClose, 
  onStatusUpdate 
}: OrderDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);

  const { 
    order, 
    loading, 
    error, 
    updateStatus, 
    isUpdating 
  } = useSupplierOrder(organizationId, orderId || undefined);

  if (!isOpen || !orderId) return null;

  const handleStatusUpdate = async () => {
    if (!selectedStatus || !order) return;
    
    try {
      await updateStatus({ status: selectedStatus, notes: statusNotes });
      onStatusUpdate?.(order.id, selectedStatus, statusNotes);
      setIsEditing(false);
      setSelectedStatus(null);
      setStatusNotes('');
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const getAvailableStatusTransitions = (currentStatus: OrderStatus) => {
    return STATUS_TRANSITIONS[currentStatus] || [];
  };

  if (loading) {
    return (
      <AccessibleModal isOpen={isOpen} onClose={onClose} title="載入訂單詳情" size="xl" className="max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">載入訂單詳情中...</span>
        </div>
      </AccessibleModal>
    );
  }

  if (error || !order) {
    return (
      <AccessibleModal isOpen={isOpen} onClose={onClose} title="無法載入訂單詳情" size="xl" className="max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-3 py-8">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">無法載入訂單詳情</h3>
            <p className="text-sm text-red-700">{error || '訂單不存在'}</p>
          </div>
        </div>
      </AccessibleModal>
    );
  }

  const currentMeta = getOrderStatusMeta(order.status)
  const StatusIcon = currentMeta.Icon;
  const availableTransitions = getAvailableStatusTransitions(order.status);

  return (
    <AccessibleModal isOpen={isOpen} onClose={onClose} title={`訂單詳情 - ${order.order_number}`} size="xl" className="max-h-[90vh] overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StatusIcon className="h-5 w-5" />
            <Badge variant={currentMeta.variant}>{currentMeta.label}</Badge>
          </div>
          {availableTransitions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isUpdating}
            >
              {isEditing ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  取消
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  更新狀態
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-3 mb-2">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="font-medium">客戶資訊</h3>
              </div>
              <div className="space-y-1">
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-sm text-gray-600">{order.customer_id}</p>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h3 className="font-medium">配送資訊</h3>
              </div>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-gray-600">配送日期：</span>
                  {order.delivery_date ? formatDate(new Date(order.delivery_date)) : '未指定'}
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">下單時間：</span>
                  {formatDate(new Date(order.created_at))}
                </p>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3 mb-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
                <h3 className="font-medium">金額資訊</h3>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(order.total_amount_ntd)}
                </p>
                <p className="text-sm text-gray-600">
                  共 {order.item_count} 項商品
                </p>
              </div>
            </Card>
          </div>

          {/* Status Update Section */}
          {isEditing && (
            <Card className="p-4 border-blue-200 bg-blue-50">
              <h3 className="font-medium mb-3">更新訂單狀態</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    新狀態
                  </label>
                  <select
                    value={selectedStatus || ''}
                    onChange={(e) => setSelectedStatus(e.target.value as OrderStatus)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">選擇新狀態</option>
                    {availableTransitions.map(status => {
                      const meta = getOrderStatusMeta(status)
                      return (
                        <option key={status} value={status}>
                          {meta.label}
                        </option>
                      )
                    })}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    備註 (選填)
                  </label>
                  <Textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="狀態更新備註..."
                    rows={2}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedStatus(null);
                    setStatusNotes('');
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!selectedStatus || isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      更新中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      確認更新
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Order Items */}
          <Card className="p-4">
            <h3 className="font-medium mb-3">訂單明細</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      商品
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      數量
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      單價
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      小計
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-gray-600">{item.product_code}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-3 py-2">
                        {formatCurrency(item.unit_price_ntd)}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {formatCurrency(item.total_price_ntd)}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                        暫無商品明細
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    總計：{formatCurrency(order.total_amount_ntd)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Delivery Address */}
            {order.delivery_address && (
              <Card className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <MapPin className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium">配送地址</h3>
                </div>
                <div className="text-sm space-y-1">
                  <p>{order.delivery_address.street}</p>
                  <p>{order.delivery_address.city} {order.delivery_address.postal_code}</p>
                  {order.delivery_address.contact_person && (
                    <p>聯絡人：{order.delivery_address.contact_person}</p>
                  )}
                  {order.delivery_address.contact_phone && (
                    <p>電話：{order.delivery_address.contact_phone}</p>
                  )}
                </div>
              </Card>
            )}

            {/* Notes */}
            {order.notes && (
              <Card className="p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium">訂單備註</h3>
                </div>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </Card>
            )}
          </div>

          {/* Status History */}
          {order.status_history && order.status_history.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-3">狀態歷史</h3>
              <div className="space-y-3">
                {order.status_history.map((entry, index) => {
                  const meta = getOrderStatusMeta(entry.status)
                  const StatusIcon = meta.Icon;
                  
                  return (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-md">
                      <StatusIcon className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{meta.label}</span>
                          <span className="text-sm text-gray-500">
                            {formatDate(new Date(entry.timestamp))}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                        )}
                        {entry.updated_by && (
                          <p className="text-xs text-gray-500 mt-1">
                            操作人：{entry.updated_by}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </AccessibleModal>
  );
}
