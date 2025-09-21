'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { OrderStatus } from '@/lib/api/supplier-types'
import {
  CheckCircle,
  Clock,
  Package,
  Truck,
  AlertTriangle,
  Save,
  X,
  Loader
} from 'lucide-react'

interface BulkActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrderIds: string[];
  onBulkStatusUpdate: (status: OrderStatus, notes?: string) => Promise<void>;
  isUpdating: boolean;
}

const STATUS_CONFIG = {
  confirmed: { 
    label: '批量確認', 
    icon: CheckCircle, 
    color: 'text-blue-600',
    description: '確認所選訂單，進入備貨流程'
  },
  preparing: { 
    label: '批量備貨', 
    icon: Package, 
    color: 'text-indigo-600',
    description: '將所選訂單標記為備貨中'
  },
  ready_for_pickup: { 
    label: '批量待取貨', 
    icon: Package, 
    color: 'text-green-600',
    description: '所選訂單已備妥，等待取貨'
  },
  in_transit: { 
    label: '批量配送', 
    icon: Truck, 
    color: 'text-purple-600',
    description: '所選訂單已發出配送'
  },
  delivered: { 
    label: '批量完成', 
    icon: CheckCircle, 
    color: 'text-green-600',
    description: '將所選訂單標記為已送達'
  },
  cancelled: { 
    label: '批量取消', 
    icon: AlertTriangle, 
    color: 'text-red-600',
    description: '取消所選訂單'
  }
};

export default function BulkActionModal({
  isOpen,
  onClose,
  selectedOrderIds,
  onBulkStatusUpdate,
  isUpdating
}: BulkActionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    
    try {
      await onBulkStatusUpdate(selectedStatus, notes);
      // Reset form
      setSelectedStatus(null);
      setNotes('');
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量操作訂單</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selection Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">已選取訂單</h3>
                <p className="text-sm text-blue-700">
                  將對以下 {selectedOrderIds.length} 筆訂單執行批量操作
                </p>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                {selectedOrderIds.length} 筆
              </Badge>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              選擇要執行的操作
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                const Icon = config.icon;
                const isSelected = selectedStatus === status;
                
                return (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status as OrderStatus)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                      <div>
                        <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {config.label}
                        </h4>
                        <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                          {config.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              批量操作備註 (選填)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="請輸入此次批量操作的備註說明..."
              rows={3}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              此備註將會記錄在所有被操作訂單的狀態歷史中
            </p>
          </div>

          {/* Confirmation */}
          {selectedStatus && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">確認批量操作</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    您即將對 {selectedOrderIds.length} 筆訂單執行「
                    <span className="font-medium">{STATUS_CONFIG[selectedStatus].label}</span>
                    」操作。此操作執行後無法復原，請確認操作無誤。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedStatus || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  處理中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  確認執行
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}