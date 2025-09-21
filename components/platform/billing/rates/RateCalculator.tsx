'use client'

import { useState } from 'react'
import { RateCalculationInput, RateCalculationResult, RatingTier } from '@/types/platform-billing'
import { cn } from '@/lib/utils'
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Award,
  Zap,
  X
} from 'lucide-react'

interface RateCalculatorProps {
  input: RateCalculationInput
  result: RateCalculationResult | null
  loading?: boolean
  onInputChange: (input: Partial<RateCalculationInput>) => void
  onCalculate: (input: RateCalculationInput) => void
  onClear: () => void
}

const RATING_OPTIONS: Array<{ value: RatingTier; label: string; color: string }> = [
  { value: 'Bronze', label: '銅級', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'Silver', label: '銀級', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { value: 'Gold', label: '金級', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'Platinum', label: '白金級', color: 'bg-purple-100 text-purple-800 border-purple-200' }
]

export function RateCalculator({
  input,
  result,
  loading,
  onInputChange,
  onCalculate,
  onClear
}: RateCalculatorProps) {
  const [gmvValue, setGmvValue] = useState(input.gmv)

  const handleGMVChange = (value: number) => {
    setGmvValue(value)
    onInputChange({ gmv: value })
  }

  const handleRatingChange = (rating: RatingTier) => {
    onInputChange({ rating })
  }

  const handleCalculate = () => {
    onCalculate(input)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`
  }

  // GMV 滑桿的預設值
  const gmvMarks = [
    { value: 50000, label: '5萬' },
    { value: 100000, label: '10萬' },
    { value: 500000, label: '50萬' },
    { value: 1000000, label: '100萬' },
    { value: 2000000, label: '200萬' }
  ]

  return (
    <div className="space-y-6">
      {/* 輸入區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GMV 滑桿 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              月度 GMV (新台幣)
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">金額</span>
                <span className="text-lg font-bold text-primary-600">
                  {formatCurrency(gmvValue)}
                </span>
              </div>
              
              <input
                type="range"
                min="10000"
                max="2000000"
                step="10000"
                value={gmvValue}
                onChange={(e) => handleGMVChange(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                {gmvMarks.map((mark) => (
                  <button
                    key={mark.value}
                    onClick={() => handleGMVChange(mark.value)}
                    className={cn(
                      'px-2 py-1 rounded transition-colors',
                      gmvValue === mark.value
                        ? 'bg-primary-100 text-primary-600'
                        : 'hover:bg-gray-100'
                    )}
                  >
                    {mark.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 數值輸入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              或直接輸入金額
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                min="0"
                step="1000"
                value={gmvValue}
                onChange={(e) => handleGMVChange(Number(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="輸入 GMV 金額"
              />
            </div>
          </div>
        </div>

        {/* 評級選擇 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              供應商評級
            </label>
            <div className="grid grid-cols-2 gap-3">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleRatingChange(option.value)}
                  className={cn(
                    'flex items-center justify-center space-x-2 p-3 border rounded-lg transition-all',
                    input.rating === option.value
                      ? option.color + ' ring-2 ring-primary-500'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <Award className="h-4 w-4" />
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 計算按鈕 */}
          <div className="space-y-3">
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>計算中...</span>
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  <span>計算費率</span>
                </>
              )}
            </button>

            {result && (
              <button
                onClick={onClear}
                className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
                <span>清除結果</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 計算結果 */}
      {result && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
              <Zap className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">計算結果</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="text-sm text-gray-600 mb-1">基礎費率</div>
              <div className="text-xl font-bold text-gray-900">
                {formatPercentage(result.baseRate)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="text-sm text-gray-600 mb-1">評級折扣</div>
              <div className="text-xl font-bold text-green-600">
                -{formatPercentage(result.discount)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-purple-100">
              <div className="text-sm text-gray-600 mb-1">實際費率</div>
              <div className="text-xl font-bold text-purple-600">
                {formatPercentage(result.effectiveRate)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-orange-100">
              <div className="text-sm text-gray-600 mb-1">預估佣金</div>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(result.estimatedCommission)}
              </div>
            </div>
          </div>

          {/* 詳細分解 */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">費率計算明細</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">GMV 層級</span>
                <span className="font-medium">{result.breakdown.gmvTier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">基礎佣金</span>
                <span className="font-medium">{formatCurrency(result.breakdown.baseCommission)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">評級折扣 ({result.applicableRating})</span>
                <span className="font-medium text-green-600">
                  -{formatCurrency(result.breakdown.ratingDiscount)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>最終佣金</span>
                  <span className="text-primary-600">
                    {formatCurrency(result.breakdown.finalCommission)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}