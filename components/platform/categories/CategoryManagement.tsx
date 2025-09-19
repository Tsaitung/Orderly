'use client'

import React from 'react'
import { FolderTree, FolderOpen, Tag, Search, Settings, Plus, Upload, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CategoryTree } from './CategoryTree'
import { CategoryEditor } from './CategoryEditor'

interface Category {
  id: string
  code: string
  name: string
  nameEn: string
  level: number
  parentId?: string
  description?: string
  isActive: boolean
  sortOrder: number
  children?: Category[]
  products?: { id: string; name: string; code: string }[]
  _count?: { products: number }
}

export function CategoryManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [categories, setCategories] = React.useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
  const [parentForNewChild, setParentForNewChild] = React.useState<Category | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)

  // Fetch categories from API
  const fetchCategories = React.useCallback(async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/products/categories?includeProducts=true`)
      if (response.ok) {
        const data = await response.json()
        setCategories(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setRefreshing(false)
    }
  }, [])

  // Load categories on mount
  React.useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Calculate statistics
  const stats = React.useMemo(() => {
    const totalCategories = categories.length
    const level1Categories = categories.filter(cat => cat.level === 1).length
    const level2Categories = categories.filter(cat => cat.level === 2).length
    const activeCategories = categories.filter(cat => cat.isActive).length
    const categoriesWithProducts = categories.filter(cat => 
      (cat._count?.products || cat.products?.length || 0) > 0
    ).length
    const mappingAccuracy = totalCategories > 0 ? 
      Math.round((categoriesWithProducts / totalCategories) * 100 * 10) / 10 : 0

    return {
      totalCategories,
      level1Categories,
      level2Categories,
      activeCategories,
      standardizedCategories: categoriesWithProducts,
      mappingAccuracy
    }
  }, [categories])

  // Filter categories based on search
  const filteredCategories = React.useMemo(() => {
    if (!searchTerm) return categories
    
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [categories, searchTerm])

  // Handle category operations
  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    try {
      setLoading(true)
      
      const url = editingCategory 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/products/categories/${editingCategory.id}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/products/categories`
      
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      })

      if (response.ok) {
        await fetchCategories() // Refresh the list
        setEditorOpen(false)
        setEditingCategory(null)
        setParentForNewChild(null)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save category')
      }
    } catch (error) {
      console.error('Failed to save category:', error)
      alert('儲存類別失敗：' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setParentForNewChild(null)
    setEditorOpen(true)
  }

  const handleAddChild = (parentCategory: Category) => {
    setEditingCategory(null)
    setParentForNewChild(parentCategory)
    setEditorOpen(true)
  }

  const handleAddRoot = () => {
    setEditingCategory(null)
    setParentForNewChild(null)
    setEditorOpen(true)
  }

  const handleDeleteCategory = (category: Category) => {
    const productCount = category._count?.products || category.products?.length || 0
    if (productCount > 0) {
      alert('無法刪除含有產品的類別')
      return
    }
    
    if (confirm(`確定要刪除類別「${category.name}」嗎？`)) {
      // TODO: Implement delete API call
      console.log('Delete category:', category.id)
    }
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">大類數</p>
                <p className="text-2xl font-bold text-blue-600">{stats.level1Categories}</p>
              </div>
              <FolderTree className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">子類數</p>
                <p className="text-2xl font-bold text-purple-600">{stats.level2Categories}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">活躍類別</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeCategories}</p>
              </div>
              <Tag className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">有產品類別</p>
                <p className="text-2xl font-bold text-purple-600">{stats.standardizedCategories}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">使用率</p>
                <p className="text-2xl font-bold text-[#A47864]">{stats.mappingAccuracy}%</p>
              </div>
              <FolderTree className="h-8 w-8 text-[#A47864]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要管理區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 類別樹狀結構 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <FolderTree className="h-5 w-5" />
                  <span>類別階層</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchCategories}
                    disabled={refreshing}
                  >
                    <RotateCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    重新整理
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddRoot}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    新增類別
                  </Button>
                </div>
              </div>
              
              {/* 搜尋 */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋產品類別..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <CategoryTree
                categories={filteredCategories}
                onSelectCategory={(c) => setSelectedCategory(c as any)}
                onEditCategory={(c) => handleEditCategory(c as any)}
                onDeleteCategory={(c) => handleDeleteCategory(c as any)}
                onAddChild={(c) => handleAddChild(c as any)}
                selectedCategoryId={selectedCategory?.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* 詳細資訊面板 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>類別詳細資訊</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCategory ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">類別代碼</Label>
                    <p className="text-lg font-mono">{selectedCategory.code}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">中文名稱</Label>
                    <p className="text-lg">{selectedCategory.name}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">英文名稱</Label>
                    <p className="text-lg">{selectedCategory.nameEn}</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">層級</Label>
                    <p>第 {selectedCategory.level} 級</p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">狀態</Label>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedCategory.isActive ? "default" : "secondary"}>
                        {selectedCategory.isActive ? '啟用' : '停用'}
                      </Badge>
                    </div>
                  </div>
                  
                  {selectedCategory.description && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">描述</Label>
                      <p className="text-sm text-gray-700">{selectedCategory.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">產品數量</Label>
                    <p>{selectedCategory._count?.products || selectedCategory.products?.length || 0} 個產品</p>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={() => handleEditCategory(selectedCategory)}
                    >
                      編輯類別
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleAddChild(selectedCategory)}
                    >
                      新增子類別
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FolderTree className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>選擇一個類別以查看詳細資訊</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 類別編輯器 */}
      <CategoryEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        category={editingCategory}
        parentCategory={parentForNewChild}
        categories={categories}
        onSave={handleSaveCategory}
        loading={loading}
      />
    </div>
  )
}

// Simple Label component for the detail panel
function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-sm font-medium ${className}`}>{children}</label>
}
