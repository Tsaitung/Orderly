'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  Save, 
  X, 
  Shield, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  Globe,
  Laptop,
  Settings,
  Copy,
  FileText,
  Users,
  Building2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { PermissionSelector } from './PermissionSelector'

interface RoleFormData {
  name: string
  code: string
  description: string
  type: 'platform' | 'restaurant' | 'supplier'
  priority: number
  isActive: boolean
  permissions: string[]
  tags: string[]
  validFrom?: string
  validTo?: string
  ipRestrictions: string[]
  dataScope: 'all' | 'own_organization' | 'own_department' | 'own_data'
  maxUserCount?: number
}

interface RoleFormProps {
  mode: 'create' | 'edit'
  roleId?: string
}

export function RoleForm({ mode, roleId }: RoleFormProps) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  
  const [formData, setFormData] = React.useState<RoleFormData>({
    name: '',
    code: '',
    description: '',
    type: 'restaurant',
    priority: 50,
    isActive: true,
    permissions: [],
    tags: [],
    ipRestrictions: [],
    dataScope: 'own_organization',
  })

  const [newTag, setNewTag] = React.useState('')
  const [newIpRestriction, setNewIpRestriction] = React.useState('')

  React.useEffect(() => {
    if (mode === 'edit' && roleId) {
      loadRoleData(roleId)
    }
  }, [mode, roleId])

  const loadRoleData = async (id: string) => {
    try {
      setLoading(true)
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 模擬載入現有角色資料
      const mockRole = {
        id: '1',
        name: '餐廳經理',
        code: 'ROLE_RESTAURANT_MANAGER',
        description: '餐廳的主要管理角色，負責營運管理',
        type: 'restaurant' as const,
        priority: 80,
        isActive: true,
        permissions: ['order:read', 'order:create', 'product:read', 'user:read'],
        tags: ['餐廳', '管理員'],
        validFrom: '2024-01-01',
        validTo: '2025-12-31',
        ipRestrictions: ['192.168.1.0/24'],
        dataScope: 'own_organization' as const,
        maxUserCount: 50
      }
      
      setFormData(mockRole)
    } catch (err) {
      console.error('載入角色資料失敗:', err)
    } finally {
      setLoading(false)
    }
  }


  const handleInputChange = (field: keyof RoleFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // 清除對應的錯誤
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handlePermissionChange = (permissions: string[]) => {
    setFormData(prev => ({
      ...prev,
      permissions
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '角色名稱為必填項'
    }
    
    if (!formData.code.trim()) {
      newErrors.code = '角色代碼為必填項'
    } else if (!/^[A-Z_][A-Z0-9_]*$/.test(formData.code)) {
      newErrors.code = '角色代碼只能包含大寫字母、數字和底線，且必須以字母或底線開頭'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = '角色描述為必填項'
    }
    
    if (formData.permissions.length === 0) {
      newErrors.permissions = '至少需要選擇一個權限'
    }
    
    if (formData.priority < 0 || formData.priority > 100) {
      newErrors.priority = '優先級必須在 0-100 之間'
    }
    
    if (formData.validFrom && formData.validTo) {
      if (new Date(formData.validFrom) >= new Date(formData.validTo)) {
        newErrors.validTo = '結束時間必須晚於開始時間'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      setSaving(true)
      
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('儲存角色:', formData)
      
      // 導航回角色列表
      router.push('/platform/roles')
    } catch (err) {
      console.error('儲存角色失敗:', err)
      setErrors({ submit: '儲存失敗，請重試' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addIpRestriction = () => {
    if (newIpRestriction.trim() && !formData.ipRestrictions.includes(newIpRestriction.trim())) {
      setFormData(prev => ({
        ...prev,
        ipRestrictions: [...prev.ipRestrictions, newIpRestriction.trim()]
      }))
      setNewIpRestriction('')
    }
  }

  const removeIpRestriction = (ipToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      ipRestrictions: prev.ipRestrictions.filter(ip => ip !== ipToRemove)
    }))
  }


  const generateCode = () => {
    if (formData.name) {
      const code = `ROLE_${formData.type.toUpperCase()}_${formData.name
        .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')
        .replace(/_{2,}/g, '_')
        .toUpperCase()}`
      setFormData(prev => ({ ...prev, code }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* 基本資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            基本資訊
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">角色名稱 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="請輸入角色名稱"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="code">角色代碼 *</Label>
              <div className="flex space-x-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  placeholder="ROLE_EXAMPLE"
                  className={errors.code ? 'border-red-500' : ''}
                />
                <Button type="button" variant="outline" onClick={generateCode}>
                  自動生成
                </Button>
              </div>
              {errors.code && (
                <p className="text-sm text-red-500 mt-1">{errors.code}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="description">角色描述 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="請輸入角色描述"
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="type">角色類型 *</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
              >
                <option value="platform">平台角色</option>
                <option value="restaurant">餐廳角色</option>
                <option value="supplier">供應商角色</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="priority">優先級 (0-100)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
                className={errors.priority ? 'border-red-500' : ''}
              />
              {errors.priority && (
                <p className="text-sm text-red-500 mt-1">{errors.priority}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-6">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">啟用角色</Label>
            </div>
          </div>

          {/* 標籤管理 */}
          <div>
            <Label>角色標籤</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="輸入標籤"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                新增
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 權限配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            權限配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionSelector
            selectedPermissions={formData.permissions}
            roleType={formData.type}
            onChange={handlePermissionChange}
          />
          {errors.permissions && (
            <p className="text-sm text-red-500 mt-2">{errors.permissions}</p>
          )}
        </CardContent>
      </Card>

      {/* 進階設定 */}
      <Card>
        <CardHeader>
          <CardTitle 
            className="flex items-center cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-5 w-5 mr-2" />
            進階設定
            <Button type="button" variant="ghost" size="sm" className="ml-auto">
              {showAdvanced ? '收起' : '展開'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent className="space-y-4">
            {/* 有效期限 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">生效日期</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.validFrom || ''}
                  onChange={(e) => handleInputChange('validFrom', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="validTo">失效日期</Label>
                <Input
                  id="validTo"
                  type="date"
                  value={formData.validTo || ''}
                  onChange={(e) => handleInputChange('validTo', e.target.value)}
                  className={errors.validTo ? 'border-red-500' : ''}
                />
                {errors.validTo && (
                  <p className="text-sm text-red-500 mt-1">{errors.validTo}</p>
                )}
              </div>
            </div>

            {/* 資料範圍 */}
            <div>
              <Label>資料存取範圍</Label>
              <select
                value={formData.dataScope}
                onChange={(e) => handleInputChange('dataScope', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white mt-2"
              >
                <option value="all">全部資料</option>
                <option value="own_organization">所屬組織</option>
                <option value="own_department">所屬部門</option>
                <option value="own_data">僅自己的資料</option>
              </select>
            </div>

            {/* 使用者數量限制 */}
            <div>
              <Label htmlFor="maxUserCount">最大使用者數量</Label>
              <Input
                id="maxUserCount"
                type="number"
                min="1"
                value={formData.maxUserCount || ''}
                onChange={(e) => handleInputChange('maxUserCount', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="不限制"
              />
            </div>

            {/* IP 限制 */}
            <div>
              <Label>IP 存取限制</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Input
                  value={newIpRestriction}
                  onChange={(e) => setNewIpRestriction(e.target.value)}
                  placeholder="例如: 192.168.1.0/24"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIpRestriction())}
                />
                <Button type="button" variant="outline" onClick={addIpRestriction}>
                  新增
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {formData.ipRestrictions.map(ip => (
                  <div key={ip} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{ip}</span>
                    <button
                      type="button"
                      onClick={() => removeIpRestriction(ip)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 錯誤訊息 */}
      {errors.submit && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">{errors.submit}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按鈕 */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={saving}
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={saving}
          className="flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              儲存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {mode === 'create' ? '建立角色' : '儲存變更'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}