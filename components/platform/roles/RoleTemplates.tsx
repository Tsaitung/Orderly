'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  Copy, 
  Edit, 
  Trash2, 
  Shield, 
  Users, 
  Settings, 
  Building2, 
  Star, 
  Clock, 
  Eye, 
  MoreHorizontal,
  FileTemplate,
  Zap,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Heart,
  Bookmark
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

interface RoleTemplate {
  id: string
  name: string
  description: string
  type: 'platform' | 'restaurant' | 'supplier'
  category: 'built-in' | 'custom' | 'popular'
  isBuiltIn: boolean
  permissions: Permission[]
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  usageCount: number
  rating: number
  isBookmarked: boolean
  previewImage?: string
}

interface TemplateStats {
  totalTemplates: number
  builtInTemplates: number
  customTemplates: number
  popularTemplates: number
  recentlyUsed: number
}

export function RoleTemplates() {
  const [templates, setTemplates] = React.useState<RoleTemplate[]>([])
  const [stats, setStats] = React.useState<TemplateStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedType, setSelectedType] = React.useState<string>('all')
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<'name' | 'usage' | 'rating' | 'recent'>('name')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')
  const [showCreateModal, setShowCreateModal] = React.useState(false)

  React.useEffect(() => {
    loadTemplates()
    loadStats()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const mockTemplates: RoleTemplate[] = [
        {
          id: '1',
          name: '餐廳基礎管理員',
          description: '適用於餐廳的基本管理角色，包含訂單管理、產品檢視等基礎權限',
          type: 'restaurant',
          category: 'built-in',
          isBuiltIn: true,
          permissions: [
            { id: 'order:read', name: '檢視訂單', description: '檢視訂單詳情和列表', category: 'order' },
            { id: 'order:create', name: '建立訂單', description: '建立新訂單', category: 'order' },
            { id: 'product:read', name: '檢視產品', description: '檢視產品資訊和目錄', category: 'product' },
            { id: 'user:read', name: '檢視使用者', description: '檢視使用者資訊和列表', category: 'user' }
          ],
          tags: ['基礎', '管理員', '餐廳'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          usageCount: 156,
          rating: 4.8,
          isBookmarked: true
        },
        {
          id: '2',
          name: '供應商客服專員',
          description: '處理客戶服務相關工作的供應商角色，專注於溝通和支援功能',
          type: 'supplier',
          category: 'built-in',
          isBuiltIn: true,
          permissions: [
            { id: 'order:read', name: '檢視訂單', description: '檢視訂單詳情和列表', category: 'order' },
            { id: 'user:read', name: '檢視使用者', description: '檢視使用者資訊和列表', category: 'user' },
            { id: 'report:read', name: '檢視報表', description: '檢視各類業務報表', category: 'report' }
          ],
          tags: ['客服', '支援', '供應商'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          usageCount: 89,
          rating: 4.5,
          isBookmarked: false
        },
        {
          id: '3',
          name: '平台營運分析師',
          description: '負責平台營運數據分析和報表製作的專業角色',
          type: 'platform',
          category: 'popular',
          isBuiltIn: true,
          permissions: [
            { id: 'report:read', name: '檢視報表', description: '檢視各類業務報表', category: 'report' },
            { id: 'report:export', name: '匯出報表', description: '匯出報表資料', category: 'report' },
            { id: 'user:read', name: '檢視使用者', description: '檢視使用者資訊和列表', category: 'user' },
            { id: 'order:read', name: '檢視訂單', description: '檢視訂單詳情和列表', category: 'order' }
          ],
          tags: ['分析', '報表', '營運'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-03-15T00:00:00Z',
          usageCount: 234,
          rating: 4.9,
          isBookmarked: true
        },
        {
          id: '4',
          name: '餐廳採購專員',
          description: '專門負責採購作業的餐廳角色，由使用者自訂建立',
          type: 'restaurant',
          category: 'custom',
          isBuiltIn: false,
          permissions: [
            { id: 'order:create', name: '建立訂單', description: '建立新訂單', category: 'order' },
            { id: 'order:read', name: '檢視訂單', description: '檢視訂單詳情和列表', category: 'order' },
            { id: 'product:read', name: '檢視產品', description: '檢視產品資訊和目錄', category: 'product' },
            { id: 'finance:read', name: '檢視財務', description: '檢視財務報表和數據', category: 'finance' }
          ],
          tags: ['採購', '自定義', '餐廳'],
          createdAt: '2024-02-15T00:00:00Z',
          updatedAt: '2024-03-01T00:00:00Z',
          createdBy: '張經理',
          usageCount: 45,
          rating: 4.2,
          isBookmarked: false
        },
        {
          id: '5',
          name: '供應商財務管理',
          description: '負責供應商財務相關事務的專業角色模板',
          type: 'supplier',
          category: 'custom',
          isBuiltIn: false,
          permissions: [
            { id: 'finance:read', name: '檢視財務', description: '檢視財務報表和數據', category: 'finance' },
            { id: 'order:read', name: '檢視訂單', description: '檢視訂單詳情和列表', category: 'order' },
            { id: 'report:read', name: '檢視報表', description: '檢視各類業務報表', category: 'report' }
          ],
          tags: ['財務', '供應商', '自定義'],
          createdAt: '2024-03-01T00:00:00Z',
          updatedAt: '2024-03-10T00:00:00Z',
          createdBy: '李會計',
          usageCount: 23,
          rating: 4.0,
          isBookmarked: true
        }
      ]
      
      setTemplates(mockTemplates)
    } catch (err) {
      console.error('載入模板失敗:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // 模擬統計資料
      setStats({
        totalTemplates: 5,
        builtInTemplates: 3,
        customTemplates: 2,
        popularTemplates: 1,
        recentlyUsed: 3
      })
    } catch (err) {
      console.error('載入統計失敗:', err)
    }
  }

  const getTypeDisplay = (type: string) => {
    const types = {
      platform: { name: '平台', color: 'bg-blue-100 text-blue-800', icon: Settings },
      restaurant: { name: '餐廳', color: 'bg-orange-100 text-orange-800', icon: Building2 },
      supplier: { name: '供應商', color: 'bg-green-100 text-green-800', icon: Users }
    }
    return types[type as keyof typeof types] || { name: type, color: 'bg-gray-100 text-gray-800', icon: Shield }
  }

  const getCategoryDisplay = (category: string) => {
    const categories = {
      'built-in': { name: '內建模板', color: 'bg-blue-100 text-blue-800', icon: Shield },
      'custom': { name: '自定義', color: 'bg-purple-100 text-purple-800', icon: Settings },
      'popular': { name: '熱門', color: 'bg-yellow-100 text-yellow-800', icon: Star }
    }
    return categories[category as keyof typeof categories] || { name: category, color: 'bg-gray-100 text-gray-800', icon: FileTemplate }
  }

  const toggleBookmark = (templateId: string) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { ...template, isBookmarked: !template.isBookmarked }
        : template
    ))
  }

  const duplicateTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      const newTemplate: RoleTemplate = {
        ...template,
        id: `${template.id}_copy`,
        name: `${template.name} (副本)`,
        category: 'custom',
        isBuiltIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: '當前使用者',
        usageCount: 0,
        rating: 0,
        isBookmarked: false
      }
      setTemplates(prev => [...prev, newTemplate])
    }
  }

  const deleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId))
  }

  const createRoleFromTemplate = (templateId: string) => {
    // 導航到新建角色頁面，並帶上模板ID
    window.location.href = `/platform/roles/new?template=${templateId}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))
  }

  // 篩選和排序
  const filteredTemplates = templates
    .filter(template => {
      if (selectedType !== 'all' && template.type !== selectedType) return false
      if (selectedCategory !== 'all' && template.category !== selectedCategory) return false
      if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !template.description.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.usageCount - a.usageCount
        case 'rating':
          return b.rating - a.rating
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const bookmarkedTemplates = templates.filter(t => t.isBookmarked)
  const popularTemplates = templates.filter(t => t.category === 'popular')
  const recentTemplates = templates.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 3)

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-16 bg-gray-200 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總模板數</CardTitle>
              <FileTemplate className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTemplates}</div>
              <p className="text-xs text-muted-foreground">
                內建 {stats.builtInTemplates} 個，自定義 {stats.customTemplates} 個
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">熱門模板</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.popularTemplates}</div>
              <p className="text-xs text-muted-foreground">
                高使用率模板
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">我的收藏</CardTitle>
              <Heart className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{bookmarkedTemplates.length}</div>
              <p className="text-xs text-muted-foreground">
                已收藏模板
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最近使用</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.recentlyUsed}</div>
              <p className="text-xs text-muted-foreground">
                本週使用次數
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 搜尋和篩選 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜尋模板名稱或描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有類型</option>
                <option value="platform">平台角色</option>
                <option value="restaurant">餐廳角色</option>
                <option value="supplier">供應商角色</option>
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">所有分類</option>
                <option value="built-in">內建模板</option>
                <option value="custom">自定義模板</option>
                <option value="popular">熱門模板</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="name">名稱排序</option>
                <option value="usage">使用次數</option>
                <option value="rating">評分排序</option>
                <option value="recent">最近更新</option>
              </select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                進階篩選
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 標籤頁 */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">全部模板</TabsTrigger>
          <TabsTrigger value="bookmarked">我的收藏</TabsTrigger>
          <TabsTrigger value="popular">熱門推薦</TabsTrigger>
          <TabsTrigger value="recent">最近使用</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => {
              const typeDisplay = getTypeDisplay(template.type)
              const categoryDisplay = getCategoryDisplay(template.category)
              const TypeIcon = typeDisplay.icon
              const CategoryIcon = categoryDisplay.icon
              
              return (
                <Card key={template.id} className="relative hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <TypeIcon className="h-5 w-5 text-primary-600" />
                        <Badge className={typeDisplay.color}>
                          {typeDisplay.name}
                        </Badge>
                        <Badge variant="outline" className={categoryDisplay.color}>
                          <CategoryIcon className="h-3 w-3 mr-1" />
                          {categoryDisplay.name}
                        </Badge>
                      </div>
                      <button
                        onClick={() => toggleBookmark(template.id)}
                        className={`p-1 rounded ${template.isBookmarked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        <Heart className={`h-4 w-4 ${template.isBookmarked ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* 權限預覽 */}
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        包含權限 ({template.permissions.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {template.permissions.slice(0, 3).map(permission => (
                          <Badge key={permission.id} variant="secondary" className="text-xs">
                            {permission.name}
                          </Badge>
                        ))}
                        {template.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.permissions.length - 3} 更多
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* 標籤 */}
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* 統計資訊 */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <Copy className="h-3 w-3" />
                          <span>{template.usageCount}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {getRatingStars(template.rating)}
                          <span>({template.rating})</span>
                        </div>
                      </div>
                      <div>{formatDate(template.updatedAt)}</div>
                    </div>
                    
                    {template.createdBy && (
                      <div className="text-xs text-gray-500">
                        建立者: {template.createdBy}
                      </div>
                    )}
                    
                    {/* 操作按鈕 */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => createRoleFromTemplate(template.id)}
                        className="flex-1 mr-2"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        使用模板
                      </Button>
                      
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => duplicateTemplate(template.id)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        {!template.isBuiltIn && (
                          <>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => deleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="bookmarked">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookmarkedTemplates.length > 0 ? (
              bookmarkedTemplates.map(template => (
                <div key={template.id} className="text-center">
                  {/* 同樣的模板卡片內容 */}
                  <p className="text-sm text-gray-600">您收藏的模板會顯示在這裡</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">您還沒有收藏任何模板</p>
                <p className="text-sm text-gray-500 mt-1">點擊模板卡片上的愛心圖示來收藏模板</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="popular">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularTemplates.map(template => (
              <div key={template.id}>
                {/* 熱門模板卡片 */}
                <p className="text-sm text-gray-600">熱門推薦模板</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentTemplates.map(template => (
              <div key={template.id}>
                {/* 最近使用模板卡片 */}
                <p className="text-sm text-gray-600">最近使用的模板</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 空狀態 */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileTemplate className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到符合條件的模板</h3>
          <p className="text-gray-600 mb-4">嘗試調整搜尋條件或建立新的模板</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            建立新模板
          </Button>
        </div>
      )}
    </div>
  )
}