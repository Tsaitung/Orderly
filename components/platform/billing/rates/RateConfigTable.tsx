'use client'

import { useState } from 'react'
import { RateConfig, RatingConfig } from '@/types/platform-billing'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { cn } from '@/lib/utils'
import { 
  Edit, 
  Plus, 
  Save, 
  X, 
  Eye,
  AlertTriangle,
  Check,
  TrendingUp,
  Users
} from 'lucide-react'

interface RateConfigTableProps {
  configs: RateConfig[]
  ratingConfigs: RatingConfig[]
  loading?: boolean
  previewData?: any
  onPreviewChange: (config: Partial<RateConfig>) => void
  onRefresh: () => void
}

export function RateConfigTable({
  configs,
  ratingConfigs,
  loading,
  previewData,
  onPreviewChange,
  onRefresh
}: RateConfigTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<RateConfig>>({})
  const [showPreview, setShowPreview] = useState(false)
  const { actions: { updateRateConfig, updateRatingConfig } } = usePlatformBillingStore()

  const handleEdit = (config: RateConfig) => {
    setEditingId(config.id)
    setEditingData(config)
  }

  const handleSave = async () => {
    if (!editingId || !editingData) return

    try {
      await updateRateConfig({ ...editingData, id: editingId })
      setEditingId(null)
      setEditingData({})
      onRefresh()
    } catch (error) {
      console.error('Failed to update rate config:', error)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handlePreview = () => {
    if (editingData) {
      onPreviewChange(editingData)
      setShowPreview(true)
    }
  }

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return '--'
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (rate: number | undefined) => {
    if (rate === undefined) return '--'
    return `${rate.toFixed(2)}%`
  }

  const getTierName = (tier: number) => {
    const tierNames = ['', '入門級', '成長級', '專業級', '企業級', '旗艦級']
    return tierNames[tier] || `第${tier}級`
  }

  if (loading && configs.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 表格標題 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          分級費率配置 - 根據月度 GMV 自動分層
        </div>
        <button className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700">
          <Plus className="h-4 w-4" />
          <span>新增層級</span>
        </button>
      </div>

      {/* 費率層級表格 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                層級
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GMV 範圍
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                佣金費率
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                生效時間
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {configs.map((config) => (
              <tr key={config.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      config.active ? 'bg-green-400' : 'bg-gray-300'
                    )} />
                    <span className="text-sm font-medium text-gray-900">
                      {getTierName(config.tier)}
                    </span>
                    <span className="text-xs text-gray-500">
                      T{config.tier}
                    </span>
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  {editingId === config.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={editingData.minGMV || ''}
                        onChange={(e) => setEditingData(prev => ({ 
                          ...prev, 
                          minGMV: Number(e.target.value) 
                        }))}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="最低"
                      />
                      <span className="text-xs text-gray-500">-</span>
                      <input
                        type="number"
                        value={editingData.maxGMV || ''}
                        onChange={(e) => setEditingData(prev => ({ 
                          ...prev, 
                          maxGMV: Number(e.target.value) || null 
                        }))}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                        placeholder="最高"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">
                      {formatCurrency(config.minGMV)} - {
                        config.maxGMV ? formatCurrency(config.maxGMV) : '無上限'
                      }
                    </div>
                  )}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  {editingId === config.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editingData.commissionRate || ''}
                        onChange={(e) => setEditingData(prev => ({ 
                          ...prev, 
                          commissionRate: Number(e.target.value) 
                        }))}
                        className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">
                      {formatPercentage(config.commissionRate)}
                    </span>
                  )}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {config.effectiveFrom.toLocaleDateString('zh-TW')}
                  {config.effectiveTo && (
                    <div className="text-xs">
                      至 {config.effectiveTo.toLocaleDateString('zh-TW')}
                    </div>
                  )}
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    config.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  )}>
                    {config.active ? '啟用' : '停用'}
                  </span>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingId === config.id ? (
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={handlePreview}
                        className="text-blue-600 hover:text-blue-700"
                        title="預覽影響"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleSave}
                        className="text-green-600 hover:text-green-700"
                        title="保存"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600"
                        title="取消"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(config)}
                      className="text-primary-600 hover:text-primary-700"
                      title="編輯"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 預覽變更影響 */}
      {showPreview && previewData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                變更影響預覽
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700">
                    影響供應商：{previewData.affectedSuppliers} 家
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700">
                    收入影響：{formatCurrency(previewData.estimatedImpact)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-green-700 hover:text-green-800 font-medium"
                  >
                    確認變更
                  </button>
                </div>
              </div>
              
              {previewData.breakdown && previewData.breakdown.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-yellow-700 hover:text-yellow-800">
                    查看詳細影響 ({previewData.breakdown.length} 個供應商)
                  </summary>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <div className="space-y-1 text-xs">
                      {previewData.breakdown.slice(0, 5).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span>{item.supplierName}</span>
                          <span className={cn(
                            'font-medium',
                            item.impactAmount > 0 ? 'text-green-600' : 'text-red-600'
                          )}>
                            {item.impactAmount > 0 ? '+' : ''}{formatCurrency(item.impactAmount)}
                          </span>
                        </div>
                      ))}
                      {previewData.breakdown.length > 5 && (
                        <div className="text-gray-500 text-center">
                          還有 {previewData.breakdown.length - 5} 個供應商...
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="text-yellow-400 hover:text-yellow-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 費率層級說明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">費率層級說明</h4>
        <div className="text-xs text-blue-700 space-y-1">
          <p>• 系統將根據供應商的月度 GMV 自動分配對應的費率層級</p>
          <p>• 評級折扣將在基礎費率基礎上進一步降低實際費率</p>
          <p>• 層級變更將在下個計費週期生效</p>
          <p>• 建議保持層級間費率遞減，鼓勵供應商提升業績</p>
        </div>
      </div>
    </div>
  )
}