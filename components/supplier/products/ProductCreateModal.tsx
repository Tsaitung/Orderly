'use client'

import React, { useState } from 'react'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ProductCreateRequest, ProductCategory, UnitType, PriceType } from '@/lib/api/product-types'
import {
  Save,
  X,
  Loader,
  Package,
  DollarSign,
  Tag,
  Info,
  Truck,
  Calendar,
  AlertCircle,
} from 'lucide-react'

interface ProductCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: ProductCreateRequest) => Promise<void>
  isCreating: boolean
}

const CATEGORIES: { value: ProductCategory; label: string; icon: string }[] = [
  { value: 'fresh_produce', label: '新鮮蔬果', icon: '🥬' },
  { value: 'meat_seafood', label: '肉類海鮮', icon: '🥩' },
  { value: 'dairy', label: '乳製品', icon: '🧀' },
  { value: 'pantry', label: '調料雜貨', icon: '🥫' },
  { value: 'frozen', label: '冷凍食品', icon: '🧊' },
  { value: 'beverages', label: '飲品', icon: '🥤' },
  { value: 'other', label: '其他', icon: '📦' },
]

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: 'kg', label: '公斤 (kg)' },
  { value: 'g', label: '公克 (g)' },
  { value: 'piece', label: '個/件' },
  { value: 'box', label: '盒' },
  { value: 'case', label: '箱' },
  { value: 'liter', label: '公升 (L)' },
  { value: 'ml', label: '毫升 (ml)' },
]

const PRICE_TYPES: { value: PriceType; label: string; description: string }[] = [
  { value: 'fixed', label: '固定價格', description: '統一定價，不因數量變動' },
  { value: 'tiered', label: '階梯定價', description: '依據訂購量提供不同價格' },
  { value: 'negotiable', label: '議價', description: '價格可協商' },
]

const PACKAGE_TYPES = [
  '紙箱',
  '塑膠袋',
  '真空包裝',
  '保溫袋',
  '木箱',
  '鐵罐',
  '玻璃瓶',
  '塑膠盒',
  '其他',
]

export default function ProductCreateModal({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}: ProductCreateModalProps) {
  const [formData, setFormData] = useState<ProductCreateRequest>({
    sku: '',
    name: '',
    description: '',
    category: 'fresh_produce',
    subcategory: '',
    unit_type: 'kg',
    base_price: 0,
    price_type: 'fixed',
    min_order_quantity: 1,
    max_order_quantity: undefined,
    packaging_info: {
      package_type: '紙箱',
      units_per_package: 1,
      package_weight_kg: undefined,
      refrigeration_required: false,
      shelf_life_days: undefined,
    },
    specifications: {},
    tags: [],
    quality_info: {
      organic_certified: false,
    },
    supplier_notes: '',
    is_featured: false,
  })

  const [currentTag, setCurrentTag] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle form field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev }
      const keys = field.split('.')

      if (keys.length === 1) {
        newData[keys[0] as keyof ProductCreateRequest] = value
      } else if (keys.length === 2) {
        ;(newData as any)[keys[0]][keys[1]] = value
      }

      return newData
    })

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Add tag
  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      handleFieldChange('tags', [...(formData.tags || []), currentTag.trim()])
      setCurrentTag('')
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    handleFieldChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || [])
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU 為必填欄位'
    }

    if (!formData.name.trim()) {
      newErrors.name = '產品名稱為必填欄位'
    }

    if (formData.base_price <= 0) {
      newErrors.base_price = '售價必須大於 0'
    }

    if (formData.min_order_quantity <= 0) {
      newErrors.min_order_quantity = '最小訂購量必須大於 0'
    }

    if (formData.max_order_quantity && formData.max_order_quantity < formData.min_order_quantity) {
      newErrors.max_order_quantity = '最大訂購量不能小於最小訂購量'
    }

    if (formData.packaging_info.units_per_package <= 0) {
      newErrors['packaging_info.units_per_package'] = '包裝數量必須大於 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      await onCreate(formData)
      handleClose()
    } catch (error) {
      console.error('Failed to create product:', error)
    }
  }

  // Handle close
  const handleClose = () => {
    if (!isCreating) {
      // Reset form
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: 'fresh_produce',
        subcategory: '',
        unit_type: 'kg',
        base_price: 0,
        price_type: 'fixed',
        min_order_quantity: 1,
        max_order_quantity: undefined,
        packaging_info: {
          package_type: '紙箱',
          units_per_package: 1,
          package_weight_kg: undefined,
          refrigeration_required: false,
          shelf_life_days: undefined,
        },
        specifications: {},
        tags: [],
        quality_info: {
          organic_certified: false,
        },
        supplier_notes: '',
        is_featured: false,
      })
      setCurrentTag('')
      setErrors({})
      onClose()
    }
  }

  // Calculate profit margin

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleClose}
      title="新增產品"
      size="xl"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              SKU <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.sku}
              onChange={e => handleFieldChange('sku', e.target.value)}
              placeholder="例：VEG-TOM-001"
              className={errors.sku ? 'border-red-500' : ''}
            />
            {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              產品名稱 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              placeholder="例：有機牛番茄"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">產品描述</label>
          <Textarea
            value={formData.description}
            onChange={e => handleFieldChange('description', e.target.value)}
            placeholder="詳細描述產品特色、來源、品質等..."
            rows={3}
          />
        </div>

        {/* Category and Classification */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              產品分類 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={e => handleFieldChange('category', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map(category => (
                <option key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">子分類</label>
            <Input
              value={formData.subcategory}
              onChange={e => handleFieldChange('subcategory', e.target.value)}
              placeholder="例：蔬菜、水果"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              計量單位 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.unit_type}
              onChange={e => handleFieldChange('unit_type', e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {UNIT_TYPES.map(unit => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-4">
          <h3 className="flex items-center font-medium text-gray-900">
            <DollarSign className="mr-2 h-4 w-4" />
            價格設定
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                售價 (NT$) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.base_price}
                onChange={e => handleFieldChange('base_price', parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                step="0.01"
                className={errors.base_price ? 'border-red-500' : ''}
              />
              {errors.base_price && (
                <p className="mt-1 text-sm text-red-600">{errors.base_price}</p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">定價類型</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {PRICE_TYPES.map(priceType => (
                <div
                  key={priceType.value}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    formData.price_type === priceType.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleFieldChange('price_type', priceType.value)}
                >
                  <h4 className="text-sm font-medium">{priceType.label}</h4>
                  <p className="mt-1 text-xs text-gray-600">{priceType.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Quantities */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              最小訂購量 <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              value={formData.min_order_quantity}
              onChange={e => handleFieldChange('min_order_quantity', parseInt(e.target.value) || 1)}
              placeholder="1"
              min="1"
              className={errors.min_order_quantity ? 'border-red-500' : ''}
            />
            {errors.min_order_quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.min_order_quantity}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              最大訂購量 (選填)
            </label>
            <Input
              type="number"
              value={formData.max_order_quantity || ''}
              onChange={e =>
                handleFieldChange(
                  'max_order_quantity',
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              placeholder="不限制"
              min="1"
              className={errors.max_order_quantity ? 'border-red-500' : ''}
            />
            {errors.max_order_quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.max_order_quantity}</p>
            )}
          </div>
        </div>

        {/* Packaging Information */}
        <div className="space-y-4">
          <h3 className="flex items-center font-medium text-gray-900">
            <Truck className="mr-2 h-4 w-4" />
            包裝資訊
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">包裝類型</label>
              <select
                value={formData.packaging_info.package_type}
                onChange={e => handleFieldChange('packaging_info.package_type', e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {PACKAGE_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                包裝數量 <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.packaging_info.units_per_package}
                onChange={e =>
                  handleFieldChange(
                    'packaging_info.units_per_package',
                    parseInt(e.target.value) || 1
                  )
                }
                placeholder="1"
                min="1"
                className={errors['packaging_info.units_per_package'] ? 'border-red-500' : ''}
              />
              {errors['packaging_info.units_per_package'] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors['packaging_info.units_per_package']}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">包裝重量 (kg)</label>
              <Input
                type="number"
                value={formData.packaging_info.package_weight_kg || ''}
                onChange={e =>
                  handleFieldChange(
                    'packaging_info.package_weight_kg',
                    e.target.value ? parseFloat(e.target.value) : undefined
                  )
                }
                placeholder="選填"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.packaging_info.refrigeration_required}
                onChange={checked =>
                  handleFieldChange('packaging_info.refrigeration_required', checked)
                }
              />
              <label className="text-sm text-gray-700">需要冷藏</label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">保存期限 (天)</label>
              <Input
                type="number"
                value={formData.packaging_info.shelf_life_days || ''}
                onChange={e =>
                  handleFieldChange(
                    'packaging_info.shelf_life_days',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                placeholder="選填"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">產品標籤</label>
          <div className="mb-2 flex items-center space-x-2">
            <Input
              value={currentTag}
              onChange={e => setCurrentTag(e.target.value)}
              placeholder="輸入標籤並按 Enter"
              onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="flex-1"
            />
            <Button type="button" onClick={addTag} size="sm">
              新增
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags?.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Quality Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">品質資訊</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">產地</label>
              <Input
                value={formData.quality_info?.origin || ''}
                onChange={e => handleFieldChange('quality_info.origin', e.target.value)}
                placeholder="例：彰化縣田尾鄉"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">品質等級</label>
              <Input
                value={formData.quality_info?.quality_grade || ''}
                onChange={e => handleFieldChange('quality_info.quality_grade', e.target.value)}
                placeholder="例：A+、特級"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.quality_info?.organic_certified || false}
              onChange={checked => handleFieldChange('quality_info.organic_certified', checked)}
            />
            <label className="text-sm text-gray-700">有機認證</label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">保存說明</label>
            <Textarea
              value={formData.quality_info?.storage_instructions || ''}
              onChange={e => handleFieldChange('quality_info.storage_instructions', e.target.value)}
              placeholder="例：請保存在2-8°C冷藏環境"
              rows={2}
            />
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">供應商備註</label>
            <Textarea
              value={formData.supplier_notes}
              onChange={e => handleFieldChange('supplier_notes', e.target.value)}
              placeholder="內部備註、特殊說明等..."
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.is_featured}
              onChange={checked => handleFieldChange('is_featured', checked)}
            />
            <label className="text-sm text-gray-700">設為精選商品</label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                建立中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                建立產品
              </>
            )}
          </Button>
        </div>
      </div>
    </AccessibleModal>
  )
}
