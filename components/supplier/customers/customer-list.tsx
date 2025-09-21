'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  MessageSquare,
  Eye,
  Edit,
  MoreVertical,
  Building,
  User,
  ShoppingCart,
  Clock,
  Award,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Download,
  Plus
} from 'lucide-react'
import { useSupplierCustomers } from '@/lib/api/supplier-hooks'
import { CustomerFilterParams, SupplierCustomer } from '@/lib/api/supplier-types'
import { SupplierCustomerListSkeleton } from '../shared/SupplierLoadingStates'
import { SupplierPageErrorBoundary } from '../shared/SupplierErrorBoundary'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { toast } from 'react-hot-toast'

interface CustomerListProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

// Hook for getting organization ID from auth context
function useOrganizationId(): string | null {
  // TODO: Get from auth context when available
  // For now, use hardcoded value for testing
  return "test-org-123";
}

interface CustomerListContentProps {
  organizationId: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function CustomerList({ searchParams }: CustomerListProps) {
  const organizationId = useOrganizationId();

  if (!organizationId) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          載入組織資訊中...
        </div>
      </Card>
    );
  }

  return (
    <SupplierPageErrorBoundary>
      <CustomerListContent organizationId={organizationId} searchParams={searchParams} />
    </SupplierPageErrorBoundary>
  );
}

function CustomerListContent({ organizationId, searchParams }: CustomerListContentProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)
  const [localFilters, setLocalFilters] = useState<CustomerFilterParams>({
    page: 1,
    page_size: 10
  })

  // Parse search params into filters
  const initialFilters = useMemo(() => {
    const filters: CustomerFilterParams = {
      page: parseInt((searchParams.page as string) || '1'),
      page_size: parseInt((searchParams.page_size as string) || '10'),
      search_query: searchParams.search as string,
      relationship_type: searchParams.relationship_type as any,
      sort_by: searchParams.sort_by as string,
      sort_order: (searchParams.sort_order as 'asc' | 'desc') || 'desc'
    };
    return filters;
  }, [searchParams]);

  // Use supplier customers hook with real API integration
  const {
    customers,
    pagination,
    loading,
    error,
    refetch,
    addCustomer,
    updateCustomer,
    removeCustomer,
    exportCustomers,
    isAdding,
    isUpdating,
    isRemoving,
    params,
    goToPage,
    changePageSize,
    updateFilters,
    resetFilters
  } = useSupplierCustomers(organizationId, initialFilters);

  // Update local filters when hook params change
  useEffect(() => {
    setLocalFilters(params);
  }, [params]);

  if (loading && !customers.length) {
    return <SupplierCustomerListSkeleton />;
  }

  if (error) {
    throw new Error(error);
  }

  // Handle search and filtering
  const handleSearch = (query: string) => {
    updateFilters({ search_query: query });
  };

  const handleFilterChange = (key: string, value: any) => {
    updateFilters({ [key]: value });
  };

  const handleBulkAction = async (action: string, customerIds: string[]) => {
    try {
      switch (action) {
        case 'message':
          // TODO: Implement bulk messaging
          toast.success(`已向 ${customerIds.length} 位客戶發送訊息`);
          break;
        case 'email':
          // TODO: Implement bulk email
          toast.success(`已向 ${customerIds.length} 位客戶發送郵件`);
          break;
        default:
          break;
      }
      setSelectedCustomers([]);
    } catch (error) {
      toast.error('批量操作失敗');
    }
  };

  const handleCustomerAction = async (action: string, customer: SupplierCustomer) => {
    try {
      switch (action) {
        case 'view_orders':
          // TODO: Navigate to customer orders
          toast.info(`查看 ${customer.company_name} 的訂單記錄`);
          break;
        case 'edit':
          // TODO: Open edit modal
          toast.info(`編輯 ${customer.company_name} 的資料`);
          break;
        case 'message':
          // TODO: Open messaging
          toast.info(`向 ${customer.company_name} 發送訊息`);
          break;
        case 'retention':
          // TODO: Open retention workflow
          toast.info(`啟動 ${customer.company_name} 的挽回計畫`);
          break;
        default:
          break;
      }
    } catch (error) {
      toast.error('操作失敗');
    }
  };

  const getSegmentInfo = (segment: string) => {
    const segmentMap = {
      champions: { label: '冠軍客戶', variant: 'success' as const, color: 'text-emerald-600' },
      loyal: { label: '忠誠客戶', variant: 'info' as const, color: 'text-blue-600' },
      potential: { label: '潛力客戶', variant: 'warning' as const, color: 'text-purple-600' },
      new: { label: '新客戶', variant: 'info' as const, color: 'text-orange-600' },
      at_risk: { label: '流失風險', variant: 'destructive' as const, color: 'text-red-600' }
    }
    return segmentMap[segment as keyof typeof segmentMap] || segmentMap.potential
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      active: { label: '活躍', variant: 'success' as const },
      inactive: { label: '不活躍', variant: 'warning' as const },
      at_risk: { label: '流失風險', variant: 'destructive' as const },
      churned: { label: '已流失', variant: 'destructive' as const }
    }
    return statusMap[status as keyof typeof statusMap] || statusMap.active
  }

  const getCustomerTypeIcon = (type: string) => {
    const typeMap = {
      restaurant: Building,
      hotel: Building,
      catering: Building,
      retail: Building
    }
    return typeMap[type as keyof typeof typeMap] || Building
  }

  const getCommunicationIcon = (type: string) => {
    const iconMap = {
      call: Phone,
      email: Mail,
      visit: User,
      message: MessageSquare
    }
    return iconMap[type as keyof typeof iconMap] || MessageSquare
  }

  const toggleCustomerExpansion = (customerId: string) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId)
  }

  const toggleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const selectAllCustomers = () => {
    setSelectedCustomers(customers.map(c => c.customer_id))
  }

  const clearSelection = () => {
    setSelectedCustomers([])
  }

  return (
    <Card className="p-6">
      {/* 列表標題與批量操作 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">客戶列表</h2>
          <Badge variant="outline">共 {pagination?.total_count || 0} 位客戶</Badge>
        </div>

        {selectedCustomers.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              已選取 {selectedCustomers.length} 位
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('message', selectedCustomers)}
              disabled={isAdding || isUpdating}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              群發訊息
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBulkAction('email', selectedCustomers)}
              disabled={isAdding || isUpdating}
            >
              <Mail className="h-4 w-4 mr-2" />
              發送郵件
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              取消選取
            </Button>
          </div>
        )}
      </div>

      {/* 全選控制 */}
      <div className="flex items-center space-x-4 mb-4 pb-4 border-b">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedCustomers.length === customers.length && customers.length > 0}
            onChange={selectedCustomers.length === customers.length ? clearSelection : selectAllCustomers}
            className="rounded text-blue-600"
            disabled={customers.length === 0}
          />
          <span className="text-sm text-gray-700">全選</span>
        </label>
        <span className="text-sm text-gray-500">
          顯示 {pagination ? `${(pagination.page - 1) * pagination.page_size + 1}-${Math.min(pagination.page * pagination.page_size, pagination.total_count)}` : '0'} 位，共 {pagination?.total_count || 0} 位客戶
        </span>
        
        {/* Search and Filters */}
        <div className="flex items-center space-x-4 ml-auto">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜尋客戶名稱或聯絡人"
              value={params.search_query || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportCustomers('csv')}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            匯出
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={refetch}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 客戶列表 */}
      <div className="space-y-4">
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">載入客戶資料中...</p>
          </div>
        )}
        
        {!loading && customers.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">尚無客戶資料</p>
            <Button onClick={() => resetFilters()}>
              <Plus className="h-4 w-4 mr-2" />
              新增客戶
            </Button>
          </div>
        )}
        
        {customers.map((customer) => {
          const segmentInfo = getSegmentInfo(customer.relationship_type || 'potential')
          const statusInfo = getStatusInfo(customer.status || 'active')
          const CustomerTypeIcon = getCustomerTypeIcon(customer.customer_type || 'restaurant')
          const isExpanded = expandedCustomer === customer.customer_id
          const isSelected = selectedCustomers.includes(customer.customer_id)

          return (
            <div 
              key={customer.customer_id} 
              className={`border rounded-lg transition-all duration-200 ${
                isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  {/* 選擇框 */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectCustomer(customer.customer_id)}
                    className="rounded text-blue-600"
                  />

                  {/* 客戶頭像/圖標 */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                      <CustomerTypeIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>

                  {/* 客戶基本資訊 */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">{customer.company_name}</div>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <User className="h-3 w-3 mr-1" />
                        {customer.contact_person_name || '未設定聯絡人'}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={segmentInfo.variant} size="sm">
                          {segmentInfo.label}
                        </Badge>
                        {customer.preferred_payment_terms && (
                          <Badge variant="outline" size="sm">
                            {customer.preferred_payment_terms}天付款
                          </Badge>
                        )}
                        {customer.delivery_frequency && (
                          <Badge variant="outline" size="sm">
                            {customer.delivery_frequency}配送
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-blue-600">
                        {formatCurrency(customer.total_order_value || 0)}
                      </div>
                      <div className="text-xs text-gray-500">總訂單金額</div>
                      <div className="text-xs text-gray-500">
                        {customer.total_orders || 0} 筆訂單
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(customer.average_order_value || 0)}
                      </div>
                      <div className="text-xs text-gray-500">平均客單價</div>
                      <div className="text-xs text-gray-500">
                        信用額度: {formatCurrency(customer.credit_limit || 0)}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="font-medium">{customer.quality_rating || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-gray-500">品質評分</div>
                      <div className="text-xs text-gray-500">
                        關係: {customer.relationship_duration_months || 0} 個月
                      </div>
                    </div>

                    <div className="text-center">
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {customer.last_order_date ? 
                          `${Math.floor((new Date().getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 3600 * 24))} 天前下單` :
                          '尚未下單'
                        }
                      </div>
                      {customer.last_order_date && 
                       Math.floor((new Date().getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 3600 * 24)) > 30 && (
                        <div className="flex items-center justify-center mt-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCustomerExpansion(customer.customer_id)}
                    >
                      {isExpanded ? '收起' : '詳情'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCustomerAction('message', customer)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* 展開的詳細資訊 */}
              {isExpanded && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 聯絡資訊 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">聯絡資訊</h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{customer.contact_phone || '未提供'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{customer.contact_email || '未提供'}</span>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-sm">{customer.delivery_address || '未設定配送地址'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            建立關係: {customer.created_at ? formatDate(new Date(customer.created_at)) : '未知'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 關鍵指標與偏好設定 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">客戶偏好</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm text-gray-600">付款方式</div>
                          <div className="font-medium">
                            {customer.preferred_payment_method || '未設定'}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {customer.total_orders || 0}
                            </div>
                            <div className="text-xs text-gray-600">總訂單數</div>
                          </div>
                          <div className="bg-white p-2 rounded border text-center">
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(customer.total_order_value || 0)}
                            </div>
                            <div className="text-xs text-gray-600">總消費額</div>
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <div className="text-sm text-gray-600">配送偏好</div>
                          <div className="text-sm">
                            頻率: {customer.delivery_frequency || '未設定'}<br/>
                            時段: {customer.delivery_time_preference || '未設定'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 備註與特殊要求 */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">客戶備註</h4>
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium">特殊要求</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {customer.special_requirements || '無特殊要求'}
                          </div>
                        </div>
                        
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm font-medium">內部備註</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {customer.notes || '無備註'}
                          </div>
                        </div>
                        
                        {customer.last_order_date && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">最近訂單</h5>
                            <div className="bg-white p-2 rounded border">
                              <div className="text-sm">
                                最後下單: {formatDate(new Date(customer.last_order_date))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {Math.floor((new Date().getTime() - new Date(customer.last_order_date).getTime()) / (1000 * 3600 * 24))} 天前
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 快速操作 */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      最後更新: {customer.updated_at ? formatDate(new Date(customer.updated_at)) : '未知'}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCustomerAction('view_orders', customer)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        查看訂單
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCustomerAction('edit', customer)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        編輯資料
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCustomerAction('message', customer)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        發送訊息
                      </Button>
                      {(customer.status === 'at_risk' || customer.relationship_type === 'at_risk') && (
                        <Button 
                          size="sm" 
                          className="bg-orange-600 hover:bg-orange-700"
                          onClick={() => handleCustomerAction('retention', customer)}
                        >
                          <Award className="h-4 w-4 mr-2" />
                          挽回計畫
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 分頁控制 */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-sm text-gray-500">
            顯示第 {(pagination.page - 1) * pagination.page_size + 1}-{Math.min(pagination.page * pagination.page_size, pagination.total_count)} 位，共 {pagination.total_count} 位客戶
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!pagination.has_previous || loading}
              onClick={() => goToPage(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              上一頁
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(pagination.total_pages, 5) }, (_, i) => {
                const pageNum = Math.max(1, pagination.page - 2) + i;
                if (pageNum > pagination.total_pages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                    disabled={loading}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!pagination.has_next || loading}
              onClick={() => goToPage(pagination.page + 1)}
            >
              下一頁
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}