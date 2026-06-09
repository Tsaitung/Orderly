'use client'

import React from 'react'
import { ChevronRight, ChevronDown, FolderTree, Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Category {
  id: string
  code: string
  name: string
  nameEn: string
  level: number
  isActive: boolean
  children?: Category[]
  products?: { id: string; name: string; code: string }[]
  _count?: { products: number }
}

interface CategoryTreeProps {
  categories: Category[]
  onSelectCategory?: (category: Category) => void
  onEditCategory?: (category: Category) => void
  onDeleteCategory?: (category: Category) => void
  onAddChild?: (parentCategory: Category) => void
  selectedCategoryId?: string
}

interface CategoryNodeProps {
  category: Category
  onSelectCategory?: (category: Category) => void
  onEditCategory?: (category: Category) => void
  onDeleteCategory?: (category: Category) => void
  onAddChild?: (parentCategory: Category) => void
  selectedCategoryId?: string
  level?: number
}

function CategoryNode({
  category,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory,
  onAddChild,
  selectedCategoryId,
  level = 0,
}: CategoryNodeProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const hasChildren = category.children && category.children.length > 0

  // Calculate total product count including children
  const calculateTotalProductCount = (cat: Category): number => {
    let totalCount = cat._count?.products || cat.products?.length || 0

    if (cat.children && cat.children.length > 0) {
      cat.children.forEach(child => {
        totalCount += calculateTotalProductCount(child)
      })
    }

    return totalCount
  }

  const productCount = calculateTotalProductCount(category)
  const isSelected = selectedCategoryId === category.id

  return (
    <div className="select-none">
      <div
        className={`
          group flex cursor-pointer items-center justify-between rounded-md p-2
          transition-colors hover:bg-gray-50
          ${isSelected ? 'border border-blue-200 bg-blue-50' : ''}
        `}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={() => onSelectCategory?.(category)}
      >
        <div className="flex min-w-0 flex-1 items-center space-x-2">
          {/* Expand/Collapse Button */}
          <button
            onClick={e => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="rounded p-1 hover:bg-gray-200"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </button>

          {/* Category Icon */}
          <FolderTree className="h-4 w-4 flex-shrink-0 text-gray-500" />

          {/* Category Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span className="truncate font-medium text-gray-900">{category.name}</span>
              <Badge variant="outline" className="text-xs">
                {category.code}
              </Badge>
              {!category.isActive && (
                <Badge variant="secondary" className="text-xs">
                  已停用
                </Badge>
              )}
            </div>
            <div className="truncate text-sm text-gray-500">{category.nameEn}</div>
          </div>

          {/* Children Count and Product Count */}
          <div className="ml-2 flex items-center space-x-2">
            {hasChildren && (
              <Badge variant="outline" className="border-blue-600 text-blue-600">
                {category.children!.length} 個子類
              </Badge>
            )}
            <Badge variant="secondary">{productCount} 個產品</Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onAddChild?.(category)
            }}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onEditCategory?.(category)
            }}
            className="h-6 w-6 p-0"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              onDeleteCategory?.(category)
            }}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            disabled={productCount > 0}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {category.children!.map(child => (
            <CategoryNode
              key={child.id}
              category={child}
              onSelectCategory={onSelectCategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              onAddChild={onAddChild}
              selectedCategoryId={selectedCategoryId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CategoryTree({
  categories,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory,
  onAddChild,
  selectedCategoryId,
}: CategoryTreeProps) {
  // Helper function to build nested tree structure
  const buildTree = (cats: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>()

    // Create a map of all categories with empty children arrays
    cats.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // Build parent-child relationships
    cats.forEach(cat => {
      if (cat.level === 2) {
        // Find parent by matching level 1 categories
        // For level 2 categories, find their level 1 parent
        const possibleParents = cats.filter(p => p.level === 1)

        // Match based on parent_id if available, otherwise use code logic
        const parent = possibleParents.find(p => {
          // If parent_id exists in the data, use it
          if ((cat as any).parent_id) {
            return p.id === (cat as any).parent_id
          }
          if (cat.parentId) {
            return p.id === cat.parentId
          }

          // Otherwise try to match by code logic
          // VEGG -> LETC, ROOT, etc. (蔬菜類的子類)
          if (
            p.code === 'VEGG' &&
            [
              'LETC',
              'ROOT',
              'GOUR',
              'FLFV',
              'BEAN',
              'MUSH',
              'ARSS',
              'HERB',
              'STEM',
              'HVGV',
              'SPRO',
              'SEAW',
              'CUTV',
              'PRVG',
              'VMSC',
            ].includes(cat.code)
          ) {
            return true
          }
          if (
            p.code === 'FRUT' &&
            ['BERR', 'PSTF', 'TROP', 'MELN', 'FRFR', 'PRFR', 'FRMS'].includes(cat.code)
          ) {
            return true
          }
          if (
            p.code === 'BEEF' &&
            [
              'CHUC',
              'RIBE',
              'BLON',
              'BRIS',
              'FLNK',
              'ROUN',
              'BGRD',
              'BOFF',
              'PRBF',
              'BFMS',
            ].includes(cat.code)
          ) {
            return true
          }
          if (
            p.code === 'PORK' &&
            [
              'PHED',
              'BUTT',
              'PLON',
              'BELI',
              'FRNT',
              'HLEG',
              'TROT',
              'PGRD',
              'POFF',
              'PRPK',
              'PKMS',
            ].includes(cat.code)
          ) {
            return true
          }
          if (
            p.code === 'CHKN' &&
            ['WHOL', 'BRST', 'THGH', 'WING', 'FEET', 'COFF', 'CGRD', 'PRCK', 'CKMS'].includes(
              cat.code
            )
          ) {
            return true
          }
          if (p.code === 'OTME' && ['LAMB', 'DUCK', 'GOOS', 'PROT', 'OTMS'].includes(cat.code)) {
            return true
          }
          if (
            p.code === 'SEAF' &&
            ['FISH', 'CRUS', 'SHEL', 'CEPH', 'PRSF', 'DRSF', 'SFMS'].includes(cat.code)
          ) {
            return true
          }
          if (
            p.code === 'DETF' &&
            ['EGGS', 'MILK', 'DAIR', 'SOYP', 'PRDT', 'DTMS'].includes(cat.code)
          ) {
            return true
          }

          return false
        })

        if (parent) {
          const parentCategory = categoryMap.get(parent.id)
          if (parentCategory) {
            parentCategory.children!.push(categoryMap.get(cat.id)!)
          }
        }
      }
    })

    // Return only root categories (level 1) with their children
    return cats
      .filter(cat => cat.level === 1)
      .map(cat => categoryMap.get(cat.id)!)
      .filter(Boolean)
  }

  // Build the tree structure
  const treeCategories = buildTree(categories)

  if (categories.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <FolderTree className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p>尚無類別資料</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {treeCategories.map(category => (
        <CategoryNode
          key={category.id}
          category={category}
          onSelectCategory={onSelectCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
          onAddChild={onAddChild}
          selectedCategoryId={selectedCategoryId}
        />
      ))}
    </div>
  )
}
