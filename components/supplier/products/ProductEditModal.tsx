'use client'

import React, { useState, useEffect } from 'react'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Product, ProductUpdateRequest, ProductStatus } from '@/lib/api/product-types'
import {
  Save,
  X,
  Loader,
  Package,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdate: (id: string, data: ProductUpdateRequest) => Promise<void>;
  isUpdating: boolean;
}

const STATUS_OPTIONS: { value: ProductStatus; label: string; description: string; color: string }[] = [
  { 
    value: 'active', 
    label: '上架中', 
    description: '產品正常販售中',
    color: 'text-green-600'
  },
  { 
    value: 'inactive', 
    label: '下架', 
    description: '暫停販售，但保留產品資料',
    color: 'text-gray-600'
  },
  { 
    value: 'discontinued', 
    label: '停產', 
    description: '永久停止生產販售',
    color: 'text-red-600'
  },
  { 
    value: 'out_of_stock', 
    label: '缺貨', 
    description: '臨時缺貨，預計將補貨',
    color: 'text-yellow-600'
  }
];

export default function ProductEditModal({
  isOpen,
  onClose,
  product,
  onUpdate,
  isUpdating
}: ProductEditModalProps) {
  const [formData, setFormData] = useState<ProductUpdateRequest>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'quality'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        status: product.status,
        base_price: product.base_price,
        min_order_quantity: product.min_order_quantity,
        max_order_quantity: product.max_order_quantity,
        tags: product.tags,
        quality_info: product.quality_info,
        supplier_notes: product.supplier_notes,
        is_featured: product.is_featured
      });
    }
  }, [product]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = field.split('.');
      
      if (keys.length === 1) {
        newData[keys[0] as keyof ProductUpdateRequest] = value;
      } else if (keys.length === 2) {
        if (!newData[keys[0] as keyof ProductUpdateRequest]) {
          (newData as any)[keys[0]] = {};
        }
        (newData as any)[keys[0]][keys[1]] = value;
      }
      
      return newData;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Add tag
  const addTag = (newTag: string) => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      handleFieldChange('tags', [...(formData.tags || []), newTag.trim()]);
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    handleFieldChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.name && !formData.name.trim()) {
      newErrors.name = '產品名稱不能為空';
    }

    if (formData.base_price !== undefined && formData.base_price <= 0) {
      newErrors.base_price = '售價必須大於 0';
    }

    if (formData.min_order_quantity !== undefined && formData.min_order_quantity <= 0) {
      newErrors.min_order_quantity = '最小訂購量必須大於 0';
    }

    if (formData.max_order_quantity !== undefined && 
        formData.min_order_quantity !== undefined && 
        formData.max_order_quantity < formData.min_order_quantity) {
      newErrors.max_order_quantity = '最大訂購量不能小於最小訂購量';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!product || !validateForm()) return;

    try {
      await onUpdate(product.id, formData);
      handleClose();
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isUpdating) {
      setFormData({});
      setErrors({});
      setActiveTab('basic');
      onClose();
    }
  };

  if (!product) return null;

  return (
    <AccessibleModal isOpen={isOpen} onClose={handleClose} title={`編輯產品 - ${product.name}`} size="xl" className="max-h-[90vh] overflow-y-auto">

        {/* Product Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg overflow-hidden">
                {product.images[0] ? (
                  <img
                    src={product.images[0].url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Package className="h-6 w-6" />
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                <p className="text-sm text-gray-500">
                  分類: {product.category}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                NT$ {product.base_price.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                {product.category}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'basic', label: '基本資訊' },
              { id: 'pricing', label: '價格設定' },
              { id: 'quality', label: '品質資訊' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  產品名稱
                </label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  產品描述
                </label>
                <Textarea
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  產品狀態
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {STATUS_OPTIONS.map(status => (
                    <div
                      key={status.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.status === status.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleFieldChange('status', status.value)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          status.value === 'active' ? 'bg-green-500' :
                          status.value === 'inactive' ? 'bg-gray-500' :
                          status.value === 'discontinued' ? 'bg-red-500' :
                          'bg-yellow-500'
                        }`} />
                        <div>
                          <h4 className={`font-medium ${status.color}`}>
                            {status.label}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {status.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    checked={formData.is_featured || false}
                    onChange={(checked) => handleFieldChange('is_featured', checked)}
                  />
                  <label className="text-sm font-medium text-gray-700">
                    設為精選商品
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  精選商品會在產品列表中優先顯示
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  供應商備註
                </label>
                <Textarea
                  value={formData.supplier_notes || ''}
                  onChange={(e) => handleFieldChange('supplier_notes', e.target.value)}
                  placeholder="內部備註、特殊說明等..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    售價 (NT$)
                  </label>
                  <Input
                    type="number"
                    value={formData.base_price || ''}
                    onChange={(e) => handleFieldChange('base_price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className={errors.base_price ? 'border-red-500' : ''}
                  />
                  {errors.base_price && (
                    <p className="text-sm text-red-600 mt-1">{errors.base_price}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    目前售價: NT$ {product.base_price.toLocaleString()}
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最小訂購量
                  </label>
                  <Input
                    type="number"
                    value={formData.min_order_quantity || ''}
                    onChange={(e) => handleFieldChange('min_order_quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    className={errors.min_order_quantity ? 'border-red-500' : ''}
                  />
                  {errors.min_order_quantity && (
                    <p className="text-sm text-red-600 mt-1">{errors.min_order_quantity}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    目前: {product.min_order_quantity} {product.unit_type}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最大訂購量
                  </label>
                  <Input
                    type="number"
                    value={formData.max_order_quantity || ''}
                    onChange={(e) => handleFieldChange('max_order_quantity', e.target.value ? parseInt(e.target.value) : undefined)}
                    min="1"
                    placeholder="不限制"
                    className={errors.max_order_quantity ? 'border-red-500' : ''}
                  />
                  {errors.max_order_quantity && (
                    <p className="text-sm text-red-600 mt-1">{errors.max_order_quantity}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    目前: {product.max_order_quantity ? `${product.max_order_quantity} ${product.unit_type}` : '不限制'}
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">價格變更提醒</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  修改價格將會影響所有新訂單，現有訂單不會受到影響。建議在修改前通知相關客戶。
                </p>
              </div>
            </div>
          )}


          {/* Quality Tab */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    產地
                  </label>
                  <Input
                    value={formData.quality_info?.origin || ''}
                    onChange={(e) => handleFieldChange('quality_info.origin', e.target.value)}
                    placeholder="例：彰化縣田尾鄉"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    品質等級
                  </label>
                  <Input
                    value={formData.quality_info?.quality_grade || ''}
                    onChange={(e) => handleFieldChange('quality_info.quality_grade', e.target.value)}
                    placeholder="例：A+、特級"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.quality_info?.organic_certified || false}
                  onChange={(checked) => handleFieldChange('quality_info.organic_certified', checked)}
                />
                <label className="text-sm text-gray-700">有機認證</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  保存說明
                </label>
                <Textarea
                  value={formData.quality_info?.storage_instructions || ''}
                  onChange={(e) => handleFieldChange('quality_info.storage_instructions', e.target.value)}
                  placeholder="例：請保存在2-8°C冷藏環境"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  過敏原資訊
                </label>
                <Input
                  value={formData.quality_info?.allergen_info?.join(', ') || ''}
                  onChange={(e) => handleFieldChange('quality_info.allergen_info', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="例：牛奶, 雞蛋, 堅果"
                />
                <p className="text-xs text-gray-500 mt-1">
                  多個過敏原請用逗號分隔
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  更新中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  儲存變更
                </>
              )}
            </Button>
          </div>
        </div>
    </AccessibleModal>
  );
}
