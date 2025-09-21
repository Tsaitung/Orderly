'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen,
  Package,
  Loader2
} from 'lucide-react'

// 分類資料類型
interface Category {
  id: string
  code: string
  name: string
  nameEn: string
  parentId?: string
  level: number
  description?: string
  metadata: any
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  children?: Category[]
  _count?: {
    products: number
  }
}

interface CategoryTreeProps {
  selectedCategoryId?: string | null
  onCategorySelect: (categoryId: string | null) => void
  showProductCount?: boolean
  expandLevel?: number // 預設展開到第幾層
}

export function CategoryTree({
  selectedCategoryId,
  onCategorySelect,
  showProductCount = true,
  expandLevel = 2
}: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // 載入分類樹
  useEffect(() => {
    const loadCategoryTree = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          includeProductCount: showProductCount.toString(),
          onlyActive: 'true'
        })

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/products/categories/tree?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success) {
          setCategories(data.data)
          
          // 自動展開到指定層級
          const toExpand = new Set<string>()
          const expandToLevel = (cats: Category[], currentLevel: number) => {
            cats.forEach(cat => {
              if (currentLevel < expandLevel && cat.children && cat.children.length > 0) {
                toExpand.add(cat.id)
                expandToLevel(cat.children, currentLevel + 1)
              }
            })
          }
          expandToLevel(data.data, 1)
          setExpandedCategories(toExpand)
        } else {
          throw new Error(data.error || 'Failed to load categories')
        }
      } catch (err) {
        console.error('Error loading categories:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setCategories([])
      } finally {
        setLoading(false)
      }
    }

    loadCategoryTree()
  }, [showProductCount, expandLevel])

  // 切換分類展開/收合
  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  // 選擇分類
  const handleCategorySelect = (categoryId: string) => {
    if (selectedCategoryId === categoryId) {
      // 如果點擊已選中的分類，則取消選擇
      onCategorySelect(null)
    } else {
      onCategorySelect(categoryId)
    }
  }

  // 取得分類圖示
  const getCategoryIcon = (category: Category, isExpanded: boolean) => {
    const hasChildren = category.children && category.children.length > 0
    
    if (hasChildren) {
      return isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
    } else {
      return <Package className="h-4 w-4" />
    }
  }

  // 遞歸渲染分類樹
  const renderCategory = (category: Category, depth: number = 0) => {
    const isExpanded = expandedCategories.has(category.id)
    const isSelected = selectedCategoryId === category.id
    const hasChildren = category.children && category.children.length > 0
    const productCount = category._count?.products || 0

    return (
      <div key={category.id} className="w-full">
        <div 
          className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-blue-100 text-blue-900 border border-blue-200' 
              : 'hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* 展開/收合按鈕 */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(category.id)
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-6" /> // 佔位符
          )}

          {/* 分類圖示 */}
          <div className="flex-shrink-0">
            {getCategoryIcon(category, isExpanded)}
          </div>

          {/* 分類名稱 */}
          <div 
            className="flex-1 flex items-center justify-between min-w-0"
            onClick={() => handleCategorySelect(category.id)}
          >
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">
                {category.name}
              </div>
              {category.nameEn && (
                <div className="text-xs text-gray-500 truncate">
                  {category.nameEn}
                </div>
              )}
            </div>

            {/* 產品數量 */}
            {showProductCount && productCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {productCount}
              </Badge>
            )}
          </div>
        </div>

        {/* 子分類 */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {category.children?.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">載入分類中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500 mb-2">載入分類失敗</p>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">暫無分類資料</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {/* 全部產品選項 */}
      <div 
        className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors ${
          selectedCategoryId === null 
            ? 'bg-blue-100 text-blue-900 border border-blue-200' 
            : 'hover:bg-gray-50'
        }`}
        onClick={() => onCategorySelect(null)}
      >
        <div className="w-6" /> {/* 佔位符 */}
        <Package className="h-4 w-4" />
        <span className="font-medium text-sm">全部產品</span>
      </div>

      {/* 分類樹 */}
      {categories.map(category => renderCategory(category))}

      {/* 展開/收合全部控制 */}
      <div className="pt-2 border-t">
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              const allIds = new Set<string>()
              const collectIds = (cats: Category[]) => {
                cats.forEach(cat => {
                  if (cat.children && cat.children.length > 0) {
                    allIds.add(cat.id)
                    collectIds(cat.children)
                  }
                })
              }
              collectIds(categories)
              setExpandedCategories(allIds)
            }}
          >
            展開全部
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setExpandedCategories(new Set())}
          >
            收合全部
          </Button>
        </div>
      </div>
    </div>
  )
}
