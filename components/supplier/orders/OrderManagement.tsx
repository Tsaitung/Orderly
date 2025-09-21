'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import OrderDetailModal from './OrderDetailModal'
import BulkActionModal from './BulkActionModal'
import AdvancedSearchBuilder from './AdvancedSearchBuilder'
import ExportOptionsModal, { ExportOptions } from './ExportOptionsModal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useSupplierOrders } from '@/lib/api/supplier-hooks'
import { useAuth } from '@/contexts/AuthContext'
import { OrderStatus, OrderFilterParams } from '@/lib/api/supplier-types'
import { useOrderWebSocket } from '@/lib/websocket/order-websocket'
import { useNotifications, createOrderStatusNotification } from '@/lib/hooks/useNotifications'
import { Search, Filter, Calendar, Eye, MoreVertical, Download, RefreshCw, Loader } from 'lucide-react'
import { getOrderStatusMeta, SUPPLIER_ORDER_STATUSES } from '@/lib/status'

interface OrderManagementProps {
  organizationId?: string;
}

// 狀態樣式與文案統一由 '@/lib/status' 提供

const PRIORITY_CONFIG = {
  low: { label: '低', variant: 'outline' as const },
  normal: { label: '一般', variant: 'secondary' as const },
  high: { label: '高', variant: 'warning' as const },
  urgent: { label: '緊急', variant: 'destructive' as const }
};

export default function OrderManagement({ organizationId }: OrderManagementProps) {
  const { user } = useAuth();
  const effectiveOrgId = organizationId || user?.organizationId;

  // Filter state
  const [filters, setFilters] = useState<OrderFilterParams>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  // API integration
  const {
    orders,
    pagination,
    loading,
    error,
    refetch,
    updateOrderStatus,
    bulkUpdateOrderStatus,
    exportOrders,
    isUpdatingStatus,
    isBulkUpdating,
    updateFilters,
    goToPage,
    changePageSize
  } = useSupplierOrders(effectiveOrgId, filters);

  // WebSocket for real-time updates
  const { connectionState, lastEvent, isConnected } = useOrderWebSocket(effectiveOrgId, {
    onOrderUpdate: (event) => {
      console.log('Order update received:', event);
      // Refresh orders data when receiving updates
      refetch();
      setLastUpdateTime(new Date());
    },
    autoConnect: true
  });

  // Notifications
  const { createNotification } = useNotifications({ organizationId: effectiveOrgId });

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter(order => 
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name?.toLowerCase().includes(query) ||
      order.notes?.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  // Handle filter changes
  const handleFilterChange = (key: keyof OrderFilterParams, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
    updateFilters(newFilters);
  };

  // Handle advanced search filters
  const handleAdvancedFilters = (advancedFilters: OrderFilterParams) => {
    const newFilters = { ...advancedFilters, page: 1 };
    setFilters(newFilters);
    updateFilters(newFilters);
    setShowAdvancedSearch(false);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Handle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const selectAllOrders = () => {
    setSelectedOrders(filteredOrders.map(order => order.id));
  };

  const clearSelection = () => {
    setSelectedOrders([]);
  };

  // Handle status updates
  const handleStatusUpdate = async (orderId: string, status: OrderStatus, notes?: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const oldStatus = order?.status;
      
      await updateOrderStatus({ orderId, status, notes });
      
      // Create notification for status change
      if (order && oldStatus !== status) {
        const notification = createOrderStatusNotification(
          orderId,
          order.order_number,
          order.customer_name,
          oldStatus,
          status
        );
        await createNotification(notification);
      }
      
      setSelectedOrder(null);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleBulkStatusUpdate = async (status: OrderStatus, notes?: string) => {
    if (selectedOrders.length === 0) return;
    
    try {
      await bulkUpdateOrderStatus({ orderIds: selectedOrders, status, notes });
      clearSelection();
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to bulk update orders:', error);
    }
  };

  // Handle export with options
  const handleAdvancedExport = async (options: ExportOptions) => {
    setIsExporting(true);
    try {
      await exportOrders(options.format, options);
    } catch (error) {
      console.error('Failed to export orders:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle simple export
  const handleSimpleExport = async (format: 'csv' | 'xlsx' = 'csv') => {
    try {
      await exportOrders(format);
    } catch (error) {
      console.error('Failed to export orders:', error);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600">載入訂單資料中...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 border-red-200 bg-red-50">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">無法載入訂單資料</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refetch}
              className="mt-3 text-red-600 border-red-200 hover:bg-red-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新載入
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">訂單管理</h1>
          <Badge variant="outline">
            共 {pagination?.total_count || 0} 筆訂單
          </Badge>
          
          {/* Real-time connection indicator */}
          <Badge 
            variant={isConnected ? 'default' : 'outline'} 
            className={isConnected ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600'}
          >
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            {isConnected ? '即時更新' : '離線模式'}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refetch}
            disabled={loading}
            title={`最後更新: ${lastUpdateTime.toLocaleTimeString()}`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSimpleExport('csv')}
          >
            <Download className="w-4 h-4 mr-2" />
            快速匯出CSV
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowExportOptions(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            進階匯出
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowAdvancedSearch(true)}
          >
            <Filter className="w-4 h-4 mr-2" />
            高級搜索
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 transform -translate-y-1/2" />
            <Input
              placeholder="搜尋訂單編號、客戶名稱..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select 
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">所有狀態</option>
            {SUPPLIER_ORDER_STATUSES.map((key) => {
              const meta = getOrderStatusMeta(key)
              return (
                <option key={key} value={key}>{meta.label}</option>
              )
            })}
          </select>
          
          <select
            value={filters.priority || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">所有優先級</option>
            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="開始日期"
          />
        </div>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-sm text-blue-800">
              已選取 {selectedOrders.length} 筆訂單
            </span>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowBulkActions(true)}
                disabled={isBulkUpdating}
              >
                批量操作
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={clearSelection}
              >
                取消選取
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Orders List */}
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={selectedOrders.length === filteredOrders.length ? clearSelection : selectAllOrders}
                    className="rounded text-blue-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  訂單編號
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  客戶
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  狀態
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  交貨日期
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  優先級
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const meta = getOrderStatusMeta(order.status as string);
                const priorityConfig = PRIORITY_CONFIG[order.priority || 'normal'];
                const StatusIcon = meta.Icon;
                
                return (
                  <tr 
                    key={order.id}
                    className={`hover:bg-gray-50 ${
                      selectedOrders.includes(order.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="rounded text-blue-600"
                      />
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{order.order_number}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(new Date(order.created_at))}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{order.customer_name}</div>
                      <div className="text-sm text-gray-500">{order.customer_id}</div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {StatusIcon && <StatusIcon className="h-4 w-4 text-gray-600" />}
                        <Badge variant={meta.variant}>
                          {meta.label}
                        </Badge>
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(order.total_amount_ntd)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.item_count} 項商品
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.delivery_date ? formatDate(new Date(order.delivery_date)) : '--'}
                      </div>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge variant={priorityConfig.variant}>
                        {priorityConfig.label}
                      </Badge>
                    </td>
                    
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUpdatingStatus}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
            <div className="text-sm text-gray-700">
              顯示第 {((pagination.page - 1) * pagination.page_size) + 1} - {Math.min(pagination.page * pagination.page_size, pagination.total_count)} 項，
              共 {pagination.total_count} 項
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={!pagination.has_previous}
              >
                上一頁
              </Button>
              
              <span className="text-sm text-gray-700">
                第 {pagination.page} 頁，共 {pagination.total_pages} 頁
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={!pagination.has_next}
              >
                下一頁
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Empty State */}
      {filteredOrders.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到訂單</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? '嘗試調整搜尋條件' : '目前沒有訂單資料'}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              清除搜尋條件
            </Button>
          )}
        </Card>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrder}
        organizationId={effectiveOrgId}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onStatusUpdate={handleStatusUpdate}
      />

      {/* Bulk Action Modal */}
      <BulkActionModal
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        selectedOrderIds={selectedOrders}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        isUpdating={isBulkUpdating}
      />

      {/* Advanced Search Builder */}
      <AdvancedSearchBuilder
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onApplyFilters={handleAdvancedFilters}
        currentFilters={filters}
      />

      {/* Export Options Modal */}
      <ExportOptionsModal
        isOpen={showExportOptions}
        onClose={() => setShowExportOptions(false)}
        onExport={handleAdvancedExport}
        currentFilters={filters}
        totalOrders={pagination?.total_count || 0}
        isExporting={isExporting}
      />
    </div>
  );
}
