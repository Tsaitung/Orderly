'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Info, AlertCircle, Zap } from 'lucide-react'

// 過敏原資料介面
interface Allergen {
  allergenType: string
  severity: string
  notes?: string
}

interface AllergenBadgesProps {
  allergens: Allergen[]
  maxDisplay?: number
  showSeverity?: boolean
  size?: 'sm' | 'default' | 'lg'
}

// 過敏原類型映射
const ALLERGEN_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  gluten: { label: '麩質', icon: '🌾' },
  dairy: { label: '乳製品', icon: '🥛' },
  eggs: { label: '蛋類', icon: '🥚' },
  fish: { label: '魚類', icon: '🐟' },
  shellfish: { label: '甲殼類', icon: '🦐' },
  tree_nuts: { label: '堅果', icon: '🥜' },
  peanuts: { label: '花生', icon: '🥜' },
  soybeans: { label: '大豆', icon: '🫘' },
  sesame: { label: '芝麻', icon: '🌰' },
  sulfites: { label: '亞硫酸鹽', icon: '⚗️' },
  mustard: { label: '芥末', icon: '🌶️' },
  celery: { label: '芹菜', icon: '🥬' },
  lupin: { label: '羽扇豆', icon: '🫘' },
  molluscs: { label: '軟體動物', icon: '🦪' }
}

// 嚴重程度映射
type SeverityInfo = { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
}

const SEVERITY_MAP: Record<string, SeverityInfo> = {
  mild: {
    label: '輕微',
    variant: 'outline',
    icon: <Info className="h-3 w-3" />,
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700'
  },
  moderate: {
    label: '中等',
    variant: 'secondary',
    icon: <AlertCircle className="h-3 w-3" />,
    bgColor: 'bg-yellow-50 border-yellow-200',
    textColor: 'text-yellow-700'
  },
  severe: {
    label: '嚴重',
    variant: 'destructive',
    icon: <AlertTriangle className="h-3 w-3" />,
    bgColor: 'bg-red-50 border-red-200',
    textColor: 'text-red-700'
  },
  life_threatening: {
    label: '致命',
    variant: 'destructive',
    icon: <Zap className="h-3 w-3" />,
    bgColor: 'bg-red-100 border-red-300',
    textColor: 'text-red-800'
  }
}

export function AllergenBadges({ 
  allergens, 
  maxDisplay = 5, 
  showSeverity = true,
  size = 'default' 
}: AllergenBadgesProps) {
  if (!allergens || allergens.length === 0) {
    return null
  }

  // 按嚴重程度排序過敏原
  const sortedAllergens = [...allergens].sort((a, b) => {
    const severityOrder = ['life_threatening', 'severe', 'moderate', 'mild']
    const aIndex = severityOrder.indexOf(a.severity)
    const bIndex = severityOrder.indexOf(b.severity)
    return aIndex - bIndex
  })

  // 限制顯示數量
  const displayAllergens = sortedAllergens.slice(0, maxDisplay)
  const remainingCount = allergens.length - maxDisplay


  // 取得Badge大小類名
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5'
      case 'lg':
        return 'text-sm px-3 py-1'
      default:
        return 'text-xs px-2 py-1'
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {displayAllergens.map((allergen, index) => {
        const allergenInfo = getAllergenInfo(allergen.allergenType)
        const severityInfo = getSeverityInfo(allergen.severity)
        
        return (
          <div
            key={`${allergen.allergenType}-${index}`}
            className={`
              inline-flex items-center gap-1 rounded-full border font-medium
              ${severityInfo.bgColor} ${severityInfo.textColor} ${getSizeClass()}
              transition-all duration-200 hover:shadow-sm
            `}
            title={`${allergenInfo.label} (${severityInfo.label})${allergen.notes ? ` - ${allergen.notes}` : ''}`}
          >
            {/* 過敏原圖示 */}
            <span className="flex-shrink-0" role="img" aria-label={allergenInfo.label}>
              {allergenInfo.icon}
            </span>
            
            {/* 過敏原名稱 */}
            <span className="truncate max-w-16">
              {allergenInfo.label}
            </span>
            
            {/* 嚴重程度指示器 */}
            {showSeverity && (
              <span className="flex-shrink-0" title={severityInfo.label}>
                {severityInfo.icon}
              </span>
            )}
          </div>
        )
      })}
      
      {/* 剩餘過敏原數量指示 */}
      {remainingCount > 0 && (
        <Badge 
          variant="outline" 
          className={`${getSizeClass()} bg-gray-50 text-gray-600 border-gray-200`}
          title={`還有 ${remainingCount} 個過敏原`}
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  )
}

// 過敏原嚴重程度指示器組件
interface AllergenSeverityIndicatorProps {
  severity: string
  showLabel?: boolean
}

export function AllergenSeverityIndicator({ 
  severity, 
  showLabel = false 
}: AllergenSeverityIndicatorProps) {
  const severityInfo = getSeverityInfo(severity)
  
  return (
    <div className={`inline-flex items-center gap-1 ${severityInfo.textColor}`}>
      {severityInfo.icon}
      {showLabel && (
        <span className="text-xs font-medium">{severityInfo.label}</span>
      )}
    </div>
  )
}

// 過敏原摘要組件
interface AllergenSummaryProps {
  allergens: Allergen[]
  showCounts?: boolean
}

export function AllergenSummary({ allergens, showCounts = true }: AllergenSummaryProps) {
  if (!allergens || allergens.length === 0) {
    return (
      <div className="text-sm text-gray-500 flex items-center gap-1">
        <Info className="h-3 w-3" />
        <span>無過敏原資訊</span>
      </div>
    )
  }

  // 統計各嚴重程度的過敏原數量
  const severityCounts = allergens.reduce((acc, allergen) => {
    acc[allergen.severity] = (acc[allergen.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // 取得最高嚴重程度
  const highestSeverity = ['life_threatening', 'severe', 'moderate', 'mild']
    .find(severity => (severityCounts[severity] || 0) > 0) || 'mild'

  const severityInfo = getSeverityInfo(highestSeverity)

  return (
    <div className="space-y-2">
      {/* 整體嚴重程度指示 */}
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border ${severityInfo.bgColor} ${severityInfo.textColor}`}>
        {severityInfo.icon}
        <span className="text-xs font-medium">
          含 {allergens.length} 種過敏原
        </span>
      </div>

      {/* 嚴重程度統計 */}
      {showCounts && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(severityCounts).map(([severity, count]) => {
            const info = getSeverityInfo(severity)
            return (
              <Badge 
                key={severity}
                variant="outline" 
                className={`text-xs ${info.bgColor} ${info.textColor} border-current`}
              >
                {info.label}: {count}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

// 輔助函數供其他組件使用
export const getAllergenInfo = (allergenType: string) => {
  return ALLERGEN_TYPE_MAP[allergenType] || { 
    label: allergenType, 
    icon: '⚠️' 
  }
}

export function getSeverityInfo(severity: string): SeverityInfo {
  if (Object.prototype.hasOwnProperty.call(SEVERITY_MAP, severity)) {
    return SEVERITY_MAP[severity] as SeverityInfo
  }
  return SEVERITY_MAP.mild as SeverityInfo
}

export { ALLERGEN_TYPE_MAP, SEVERITY_MAP }
