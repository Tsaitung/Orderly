'use client'

import { useEffect } from 'react'
import { usePlatformBillingStore } from '@/stores/platform-billing-store'
import { RateCalculator } from '@/components/platform/billing/rates/RateCalculator'
import { RateConfigTable } from '@/components/platform/billing/rates/RateConfigTable'
import { RateHistoryTimeline } from '@/components/platform/billing/rates/RateHistoryTimeline'
import { LoadingSkeletons } from '@/components/platform/billing/shared/LoadingSkeletons'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { 
  Calculator, 
  Settings, 
  History,
  Percent,
  RefreshCw,
  Download
} from 'lucide-react'

export default function RateManagementPage() {
  const {
    rates: { 
      configs, 
      ratingConfigs, 
      calculator, 
      history, 
      loading, 
      error, 
      previewData 
    },
    actions: { 
      loadRateConfigs, 
      loadRatingConfigs, 
      loadRateHistory,
      calculateRate,
      updateCalculatorInput,
      clearRateCalculation,
      previewRateChange
    }
  } = usePlatformBillingStore()

  useEffect(() => {
    loadRateConfigs()
    loadRatingConfigs()
    loadRateHistory(20)
  }, [loadRateConfigs, loadRatingConfigs, loadRateHistory])

  const handleCalculate = (input: any) => {
    calculateRate(input)
  }

  const handleRefresh = () => {
    loadRateConfigs()
    loadRatingConfigs()
    loadRateHistory(20)
  }

  const handleExportRates = () => {
    // TODO: 實現費率導出功能
    console.log('Exporting rates...')
  }

  if (loading && configs.length === 0) {
    return <LoadingSkeletons type="dashboard" />
  }

  if (error && configs.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-red-800">載入失敗</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">費率管理</h1>
            <p className="text-gray-600 mt-1">
              管理分級費率配置、評級折扣與即時計算
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportRates}
              className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>匯出費率</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新</span>
            </button>
          </div>
        </div>

        {/* 費率計算器 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
              <Calculator className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">即時費率計算器</h2>
          </div>
          
          <RateCalculator
            input={calculator.input}
            result={calculator.result}
            loading={calculator.loading}
            onInputChange={updateCalculatorInput}
            onCalculate={handleCalculate}
            onClear={clearRateCalculation}
          />
        </div>

        {/* 費率配置管理 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                    <Settings className="h-4 w-4 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">費率配置</h2>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    共 {configs.length} 個層級
                  </span>
                </div>
              </div>
              
              <RateConfigTable
                configs={configs}
                ratingConfigs={ratingConfigs}
                loading={loading}
                previewData={previewData}
                onPreviewChange={previewRateChange}
                onRefresh={handleRefresh}
              />
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                  <History className="h-4 w-4 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">費率歷史</h2>
              </div>
              
              <RateHistoryTimeline
                history={history}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* 評級配置摘要 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
              <Percent className="h-4 w-4 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">評級折扣配置</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ratingConfigs.map((config) => (
              <div
                key={config.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{config.rating}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    config.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {config.active ? '啟用' : '停用'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">折扣</span>
                    <span className="font-medium text-green-600">
                      {config.discountPercentage}%
                    </span>
                  </div>
                  {config.minOrderCount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">最低訂單</span>
                      <span className="font-medium">
                        {config.minOrderCount}筆
                      </span>
                    </div>
                  )}
                  {config.minGMV && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">最低GMV</span>
                      <span className="font-medium">
                        NT$ {config.minGMV.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}