'use client'

import React from 'react'
import { TrendingUp, BarChart3, Search, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DemandService, DemandStats, DemandItem, useDebounce } from '@/lib/services/demand-service'

export function DemandItemsManagement() {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [stats, setStats] = React.useState<DemandStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchResults, setSearchResults] = React.useState<DemandItem[]>([])
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [searchError, setSearchError] = React.useState<string | null>(null)
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // 獲取需求統計資料
  const fetchStats = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await DemandService.getDemandStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch demand statistics')
    } finally {
      setLoading(false)
    }
  }, [])

  // 搜尋需求品項
  const searchDemandItems = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      setSearchError(null)
      const items = await DemandService.searchDemandItems({
        search: query,
        limit: 10
      })
      setSearchResults(items)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search demand items')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // 初始載入統計資料
  React.useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 當搜尋詞改變時觸發搜尋
  React.useEffect(() => {
    searchDemandItems(debouncedSearchTerm)
  }, [debouncedSearchTerm, searchDemandItems])

  // 重新載入統計資料的函數
  const handleRefresh = () => {
    fetchStats()
  }

  return (
    <div className="space-y-6">
      {/* 錯誤提示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">載入統計資料時發生錯誤</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
              <button 
                onClick={handleRefresh}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4" />
                <span>重試</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">熱門品項</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-900">{stats?.hotItems ?? 0}</p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">趨勢品項</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-orange-600">{stats?.trendingItems ?? 0}</p>
                )}
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">需求成長</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <p className={`text-2xl font-bold ${(stats?.demandGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(stats?.demandGrowth ?? 0) >= 0 ? '+' : ''}{stats?.demandGrowth?.toFixed(1) ?? '0.0'}%
                    </p>
                  </div>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">預測準確率</p>
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">載入中...</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">{stats?.forecastAccuracy?.toFixed(1) ?? '0.0'}%</p>
                )}
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋區域 */}
      <Card>
        <CardContent className="p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋需求品項..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 搜尋結果 */}
      {searchTerm && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">搜尋結果 - "{searchTerm}"</h3>
                {searchLoading && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-500">搜尋中...</span>
                  </div>
                )}
              </div>

              {searchError && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{searchError}</span>
                </div>
              )}

              {!searchLoading && !searchError && searchResults.length === 0 && searchTerm && (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">沒有找到符合條件的需求品項</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-3">
                    找到 {searchResults.length} 個相關品項
                  </div>
                  {searchResults.map((item, index) => (
                    <div key={`${item.product.id}-${index}`} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{item.product.name}</h4>
                            <span className="text-sm text-gray-500">({item.product.code})</span>
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span>訂購次數: {item.count}</span>
                            <span>總數量: {item.totalQuantity}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={item.count > 10 ? "default" : "secondary"}>
                            {item.count > 10 ? "熱門" : item.count > 5 ? "中等" : "一般"}
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium">需求指數</div>
                            <div className="text-lg font-bold text-blue-600">
                              {Math.round((item.count * item.totalQuantity) / 10)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 預設顯示 - 當沒有搜尋時 */}
      {!searchTerm && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              需求品項分析系統
            </h3>
            <p className="text-gray-500 mb-4">
              使用上方搜尋框來搜尋需求品項，或查看統計資訊了解市場趨勢
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <span>✓ 實時需求統計</span>
              <span>✓ 趨勢分析</span>
              <span>✓ 預測準確率</span>
            </div>
            {stats && stats.totalOrders !== undefined && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">總訂單數: </span>
                    <span className="font-medium">{stats.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">完成率: </span>
                    <span className="font-medium">{stats.completionRate?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}