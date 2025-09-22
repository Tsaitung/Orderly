'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

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
}

interface CategoryEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  parentCategory?: Category | null
  categories: Category[]
  onSave: (categoryData: Partial<Category>) => Promise<void>
  loading?: boolean
}

export function CategoryEditor({
  open,
  onOpenChange,
  category,
  parentCategory,
  categories,
  onSave,
  loading = false,
}: CategoryEditorProps) {
  const [formData, setFormData] = React.useState({
    code: '',
    name: '',
    nameEn: '',
    parentId: '',
    description: '',
    isActive: true,
    sortOrder: 0,
  })

  const isEditing = !!category
  const isAddingChild = !!parentCategory

  // Reset form when dialog opens/closes or category changes
  React.useEffect(() => {
    if (open) {
      if (category) {
        // Editing existing category
        setFormData({
          code: category.code,
          name: category.name,
          nameEn: category.nameEn,
          parentId: category.parentId || '',
          description: category.description || '',
          isActive: category.isActive,
          sortOrder: category.sortOrder,
        })
      } else if (parentCategory) {
        // Adding child to specific parent
        setFormData({
          code: '',
          name: '',
          nameEn: '',
          parentId: parentCategory.id,
          description: '',
          isActive: true,
          sortOrder: 0,
        })
      } else {
        // Adding new root category
        setFormData({
          code: '',
          name: '',
          nameEn: '',
          parentId: '',
          description: '',
          isActive: true,
          sortOrder: 0,
        })
      }
    }
  }, [open, category, parentCategory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await onSave({
        ...formData,
        // Don't include parentId if it's empty
        parentId: formData.parentId || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save category:', error)
    }
  }

  // Get available parent categories (exclude the current category and its descendants)
  const availableParents = categories.filter(cat => {
    if (isEditing && category) {
      // Exclude self and descendants when editing
      return cat.id !== category.id && !cat.id.startsWith(category.id)
    }
    return true
  })

  const dialogTitle = isEditing
    ? '編輯類別'
    : isAddingChild
      ? `新增子類別至：${parentCategory?.name}`
      : '新增類別'

  const dialogDescription = isEditing
    ? '修改類別資訊'
    : isAddingChild
      ? `在「${parentCategory?.name}」下方建立新的子類別`
      : '建立新的產品類別'

  return (
    <AccessibleModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={dialogTitle}
      size="md"
      className="sm:max-w-[500px]"
    >
      <div className="mb-2 text-sm text-gray-600">{dialogDescription}</div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Category Code */}
          <div className="space-y-2">
            <Label htmlFor="code">類別代碼 *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder="例如: VEGG"
              maxLength={4}
              required
              disabled={isEditing} // Don't allow editing code
            />
            <p className="text-xs text-gray-500">4位英文字母代碼</p>
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sortOrder">排序</Label>
            <Input
              id="sortOrder"
              type="number"
              value={formData.sortOrder}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  sortOrder: parseInt(e.target.value) || 0,
                }))
              }
              min={0}
            />
          </div>
        </div>

        {/* Category Name (Chinese) */}
        <div className="space-y-2">
          <Label htmlFor="name">類別名稱 (中文) *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="例如: 蔬菜"
            required
          />
        </div>

        {/* Category Name (English) */}
        <div className="space-y-2">
          <Label htmlFor="nameEn">類別名稱 (英文) *</Label>
          <Input
            id="nameEn"
            value={formData.nameEn}
            onChange={e => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
            placeholder="例如: Vegetables"
            required
          />
        </div>

        {/* Parent Category */}
        {!isAddingChild && (
          <div className="space-y-2">
            <Label htmlFor="parentId">上層類別</Label>
            <Select
              value={formData.parentId}
              onValueChange={value => setFormData(prev => ({ ...prev, parentId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇上層類別 (留空為根類別)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">無 (根類別)</SelectItem>
                {availableParents.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">描述</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="類別描述說明..."
            rows={3}
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked: boolean) =>
              setFormData(prev => ({ ...prev, isActive: checked }))
            }
          />
          <Label htmlFor="isActive">啟用此類別</Label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? '儲存中...' : isEditing ? '更新' : '建立'}
          </Button>
        </div>
      </form>
    </AccessibleModal>
  )
}
