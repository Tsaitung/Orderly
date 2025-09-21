'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  MapPin,
  Building2,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  Package,
  Star
} from 'lucide-react'

// 篩選器狀態介面
interface ProductFilters {
  search?: string
  categoryId?: string
  brand?: string[]
  origin?: string[]
  productState?: string[]
  taxStatus?: string[]
  allergenTypes?: string[]
  hasAllergenTracking?: boolean
  isActive?: boolean
  isPublic?: boolean
  hasStock?: boolean
  hasNutrition?: boolean
  hasCertifications?: boolean
}

interface ProductFiltersProps {
  filters: ProductFilters
  onFiltersChange: (newFilters: Partial<ProductFilters>) => void
  mode: 'restaurant' | 'supplier'
}

// 過敏原類型常數
const ALLERGEN_TYPES = [
  { value: 'gluten', label: '麩質', icon: '🌾' },
  { value: 'dairy', label: '乳製品', icon: '🥛' },
  { value: 'eggs', label: '蛋類', icon: '🥚' },
  { value: 'fish', label: '魚類', icon: '🐟' },
  { value: 'shellfish', label: '甲殼類', icon: '🦐' },
  { value: 'tree_nuts', label: '堅果', icon: '🥜' },
  { value: 'peanuts', label: '花生', icon: '🥜' },
  { value: 'soybeans', label: '大豆', icon: '🫘' },
  { value: 'sesame', label: '芝麻', icon: '🌰' },
  { value: 'sulfites', label: '亞硫酸鹽', icon: '⚗️' },
  { value: 'mustard', label: '芥末', icon: '🌶️' },
  { value: 'celery', label: '芹菜', icon: '🥬' },
  { value: 'lupin', label: '羽扇豆', icon: '🫘' },
  { value: 'molluscs', label: '軟體動物', icon: '🦪' }
]

export function ProductFilters({ filters, onFiltersChange, mode }: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    brand: false,
    origin: false,
    productState: false,
    taxStatus: false,
    allergens: false,
    attributes: false
  })

  const [availableOptions, setAvailableOptions] = useState({
    brands: [] as string[],
    origins: [] as string[],
    certifications: [] as string[]
  })

  // 載入可用的篩選選項
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        // 載入品牌選項
        const brandsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/products/brands`)
        if (brandsResponse.ok) {
          const brandsData = await brandsResponse.json()
          if (brandsData.success) {
            setAvailableOptions(prev => ({ ...prev, brands: brandsData.data }))
          }
        }

        // 載入產地選項
        const originsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/products/origins`)
        if (originsResponse.ok) {
          const originsData = await originsResponse.json()
          if (originsData.success) {
            setAvailableOptions(prev => ({ ...prev, origins: originsData.data }))
          }
        }

        // 載入認證選項
        const certsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/products/certifications`)
        if (certsResponse.ok) {
          const certsData = await certsResponse.json()
          if (certsData.success) {
            setAvailableOptions(prev => ({ ...prev, certifications: certsData.data }))
          }
        }
      } catch (error) {
        console.error('Failed to load filter options:', error)
      }
    }

    loadFilterOptions()
  }, [])

  // 切換展開狀態
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // 處理多選篩選器變更
  const handleMultiSelectChange = (
    filterKey: keyof ProductFilters,
    value: string,
    checked: boolean
  ) => {
    const currentValues = (filters[filterKey] as string[]) || []
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value)
    
    onFiltersChange({ [filterKey]: newValues })
  }

  // 處理布林篩選器變更
  const handleBooleanChange = (filterKey: keyof ProductFilters, checked: boolean) => {
    onFiltersChange({ [filterKey]: checked })
  }

  // 清除特定篩選器
  const clearFilter = (filterKey: keyof ProductFilters) => {
    onFiltersChange({ [filterKey]: undefined })
  }

  // 清除所有篩選器
  const clearAllFilters = () => {
    onFiltersChange({
      brand: [],
      origin: [],
      productState: [],
      taxStatus: [],
      allergenTypes: [],
      hasAllergenTracking: undefined,
      hasStock: undefined,
      hasNutrition: undefined,
      hasCertifications: undefined
    })
  }

  // 計算活躍篩選器數量
  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.brand?.length) count += filters.brand.length
    if (filters.origin?.length) count += filters.origin.length
    if (filters.productState?.length) count += filters.productState.length
    if (filters.taxStatus?.length) count += filters.taxStatus.length
    if (filters.allergenTypes?.length) count += filters.allergenTypes.length
    if (filters.hasAllergenTracking !== undefined) count += 1
    if (filters.hasStock !== undefined) count += 1
    if (filters.hasNutrition !== undefined) count += 1
    if (filters.hasCertifications !== undefined) count += 1
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <div className="space-y-4">
      {/* 篩選器標題和重置 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium">篩選器</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            清除全部
          </Button>
        )}
      </div>

      {/* 品牌篩選 */}
      <Collapsible open={expandedSections.brand} onOpenChange={() => toggleSection('brand')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>品牌</span>
              {filters.brand?.length && (
                <Badge variant="secondary" className="text-xs">
                  {filters.brand.length}
                </Badge>
              )}
            </div>
            {expandedSections.brand ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          {availableOptions.brands.length > 0 ? (
            availableOptions.brands.map(brand => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={filters.brand?.includes(brand) || false}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange('brand', brand, checked as boolean)
                  }
                />
                <Label htmlFor={`brand-${brand}`} className="text-sm flex-1">
                  {brand}
                </Label>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 p-2">載入中...</div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 產地篩選 */}
      <Collapsible open={expandedSections.origin} onOpenChange={() => toggleSection('origin')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto p-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>產地</span>
              {filters.origin?.length && (
                <Badge variant="secondary" className="text-xs">
                  {filters.origin.length}
                </Badge>
              )}
            </div>
            {expandedSections.origin ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          {availableOptions.origins.length > 0 ? (
            availableOptions.origins.map(origin => (
              <div key={origin} className="flex items-center space-x-2">
                <Checkbox
                  id={`origin-${origin}`}
                  checked={filters.origin?.includes(origin) || false}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange('origin', origin, checked as boolean)
                  }
                />
                <Label htmlFor={`origin-${origin}`} className="text-sm flex-1">
                  {origin}
                </Label>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 p-2">載入中...</div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 產品狀態篩選 */}
      <Collapsible open={expandedSections.productState} onOpenChange={() => toggleSection('productState')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto p-3">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              <span>產品狀態</span>
              {filters.productState?.length && (
                <Badge variant="secondary" className="text-xs">
                  {filters.productState.length}
                </Badge>
              )}
            </div>
            {expandedSections.productState ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="productState-raw"
              checked={filters.productState?.includes('raw') || false}
              onCheckedChange={(checked) => 
                handleMultiSelectChange('productState', 'raw', checked as boolean)
              }
            />
            <Label htmlFor="productState-raw" className="text-sm flex-1">
              原材料
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="productState-processed"
              checked={filters.productState?.includes('processed') || false}
              onCheckedChange={(checked) => 
                handleMultiSelectChange('productState', 'processed', checked as boolean)
              }
            />
            <Label htmlFor="productState-processed" className="text-sm flex-1">
              加工品
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 稅務狀態篩選 */}
      <Collapsible open={expandedSections.taxStatus} onOpenChange={() => toggleSection('taxStatus')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>稅務狀態</span>
              {filters.taxStatus?.length && (
                <Badge variant="secondary" className="text-xs">
                  {filters.taxStatus.length}
                </Badge>
              )}
            </div>
            {expandedSections.taxStatus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="taxStatus-taxable"
              checked={filters.taxStatus?.includes('taxable') || false}
              onCheckedChange={(checked) => 
                handleMultiSelectChange('taxStatus', 'taxable', checked as boolean)
              }
            />
            <Label htmlFor="taxStatus-taxable" className="text-sm flex-1">
              應稅
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="taxStatus-tax_exempt"
              checked={filters.taxStatus?.includes('tax_exempt') || false}
              onCheckedChange={(checked) => 
                handleMultiSelectChange('taxStatus', 'tax_exempt', checked as boolean)
              }
            />
            <Label htmlFor="taxStatus-tax_exempt" className="text-sm flex-1">
              免稅
            </Label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 過敏原篩選 */}
      <Collapsible open={expandedSections.allergens} onOpenChange={() => toggleSection('allergens')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>過敏原</span>
              {filters.allergenTypes?.length && (
                <Badge variant="secondary" className="text-xs">
                  {filters.allergenTypes.length}
                </Badge>
              )}
            </div>
            {expandedSections.allergens ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          {/* 過敏原追蹤切換 */}
          <div className="flex items-center space-x-2 pb-2 border-b">
            <Checkbox
              id="hasAllergenTracking"
              checked={filters.hasAllergenTracking || false}
              onCheckedChange={(checked) => 
                handleBooleanChange('hasAllergenTracking', checked as boolean)
              }
            />
            <Label htmlFor="hasAllergenTracking" className="text-sm flex-1">
              只顯示有過敏原追蹤的產品
            </Label>
          </div>
          
          {/* 具體過敏原類型 */}
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
            {ALLERGEN_TYPES.map(allergen => (
              <div key={allergen.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`allergen-${allergen.value}`}
                  checked={filters.allergenTypes?.includes(allergen.value) || false}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange('allergenTypes', allergen.value, checked as boolean)
                  }
                />
                <Label htmlFor={`allergen-${allergen.value}`} className="text-sm flex-1 flex items-center gap-1">
                  <span>{allergen.icon}</span>
                  <span>{allergen.label}</span>
                </Label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* 產品屬性篩選 */}
      <Collapsible open={expandedSections.attributes} onOpenChange={() => toggleSection('attributes')}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>產品屬性</span>
            </div>
            {expandedSections.attributes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 p-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasStock"
              checked={filters.hasStock || false}
              onCheckedChange={(checked) => 
                handleBooleanChange('hasStock', checked as boolean)
              }
            />
            <Label htmlFor="hasStock" className="text-sm flex-1">
              有庫存
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasNutrition"
              checked={filters.hasNutrition || false}
              onCheckedChange={(checked) => 
                handleBooleanChange('hasNutrition', checked as boolean)
              }
            />
            <Label htmlFor="hasNutrition" className="text-sm flex-1">
              有營養資訊
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasCertifications"
              checked={filters.hasCertifications || false}
              onCheckedChange={(checked) => 
                handleBooleanChange('hasCertifications', checked as boolean)
              }
            />
            <Label htmlFor="hasCertifications" className="text-sm flex-1">
              有認證標章
            </Label>
          </div>

          {mode === 'supplier' && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={filters.isActive !== false}
                  onCheckedChange={(checked) => 
                    handleBooleanChange('isActive', checked as boolean)
                  }
                />
                <Label htmlFor="isActive" className="text-sm flex-1">
                  啟用中
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={filters.isPublic !== false}
                  onCheckedChange={(checked) => 
                    handleBooleanChange('isPublic', checked as boolean)
                  }
                />
                <Label htmlFor="isPublic" className="text-sm flex-1">
                  公開顯示
                </Label>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* 已選擇的篩選器總覽 */}
      {activeFiltersCount > 0 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">已選擇的篩選器</h4>
          <div className="flex flex-wrap gap-1">
            {filters.brand?.map(brand => (
              <Badge key={`brand-${brand}`} variant="secondary" className="text-xs">
                {brand}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-auto p-0 ml-1"
                  onClick={() => handleMultiSelectChange('brand', brand, false)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
            {filters.origin?.map(origin => (
              <Badge key={`origin-${origin}`} variant="secondary" className="text-xs">
                {origin}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-auto p-0 ml-1"
                  onClick={() => handleMultiSelectChange('origin', origin, false)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
            {filters.allergenTypes?.map(allergen => {
              const allergenData = ALLERGEN_TYPES.find(a => a.value === allergen)
              return (
                <Badge key={`allergen-${allergen}`} variant="secondary" className="text-xs">
                  {allergenData?.icon} {allergenData?.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 ml-1"
                    onClick={() => handleMultiSelectChange('allergenTypes', allergen, false)}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
