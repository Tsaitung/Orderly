'use client'

import { RateHistoryItem } from '@/types/platform-billing'
import { cn } from '@/lib/utils'
import { 
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  Users,
  RotateCcw
} from 'lucide-react'

interface RateHistoryTimelineProps {
  history: RateHistoryItem[]
  loading?: boolean
}

export function RateHistoryTimeline({ history, loading }: RateHistoryTimelineProps) {
  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'rate_update':
        return <TrendingUp className="h-4 w-4" />
      case 'rating_update':
        return <User className="h-4 w-4" />
      case 'tier_adjustment':
        return <RotateCcw className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'rate_update':
        return 'bg-blue-100 text-blue-600 border-blue-200'
      case 'rating_update':
        return 'bg-green-100 text-green-600 border-green-200'
      case 'tier_adjustment':
        return 'bg-purple-100 text-purple-600 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getChangeTypeName = (changeType: string) => {
    switch (changeType) {
      case 'rate_update':
        return '費率更新'
      case 'rating_update':
        return '評級調整'
      case 'tier_adjustment':
        return '層級調整'
      default:
        return '其他變更'
    }
  }

  const formatValue = (value: number, changeType: string) => {
    if (changeType === 'rate_update') {
      return `${value.toFixed(2)}%`
    }
    return value.toString()
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor(diff / (1000 * 60))

    if (days > 0) {
      return `${days}天前`
    } else if (hours > 0) {
      return `${hours}小時前`
    } else if (minutes > 0) {
      return `${minutes}分鐘前`
    } else {
      return '剛剛'
    }
  }

  if (loading && history.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">暫無費率變更記錄</p>
        <p className="text-sm text-gray-500 mt-1">
          費率變更將在此處顯示歷史記錄
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        最近 {history.length} 次變更記錄
      </div>

      <div className="relative">
        {/* 時間軸線 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-6">
          {history.map((item, index) => (
            <div key={item.id} className="relative">
              {/* 時間點 */}
              <div className={cn(
                'absolute left-0 w-8 h-8 rounded-full border-2 flex items-center justify-center',
                getChangeColor(item.changeType)
              )}>
                {getChangeIcon(item.changeType)}
              </div>

              {/* 內容 */}
              <div className="ml-12 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {getChangeTypeName(item.changeType)}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(item.createdAt)} • {item.effectiveDate.toLocaleDateString('zh-TW')} 生效
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-500">
                        {formatValue(item.previousValue, item.changeType)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-gray-900">
                        {formatValue(item.newValue, item.changeType)}
                      </span>
                      {item.newValue > item.previousValue ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3">
                  {item.reason}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>操作人：{item.changedBy}</span>
                    </div>
                    
                    {item.affectedSuppliers > 0 && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>影響 {item.affectedSuppliers} 家供應商</span>
                      </div>
                    )}
                  </div>

                  <span className="text-gray-400">
                    #{item.id.slice(-6)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 加載更多 */}
      {history.length >= 20 && (
        <div className="text-center">
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            載入更多歷史記錄
          </button>
        </div>
      )}

      {/* 統計信息 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {history.filter(h => h.changeType === 'rate_update').length}
            </div>
            <div className="text-xs text-gray-500">費率調整</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {history.filter(h => h.changeType === 'rating_update').length}
            </div>
            <div className="text-xs text-gray-500">評級變更</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {history.filter(h => h.changeType === 'tier_adjustment').length}
            </div>
            <div className="text-xs text-gray-500">層級調整</div>
          </div>
        </div>
      </div>
    </div>
  )
}