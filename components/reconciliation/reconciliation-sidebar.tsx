'use client'

import * as React from 'react'
import { 
  Brain, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Target,
  Zap,
  Settings,
  BarChart3,
  Calendar,
  Filter
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AccessibleSelect } from '@/components/ui/accessible-form'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'

interface QuickStats {
  title: string
  value: string | number
  change?: {
    value: number
    direction: 'up' | 'down'
    isGood: boolean
  }
  icon: React.ReactNode
  color: string
  description: string
}

interface MLInsight {
  id: string
  type: 'pattern' | 'anomaly' | 'optimization' | 'trend'
  title: string
  description: string
  confidence: number
  impact: 'high' | 'medium' | 'low'
  actionable: boolean
  timestamp: string
}

export default function ReconciliationSidebar() {
  const [timeRange, setTimeRange] = React.useState('today')
  const [refreshing, setRefreshing] = React.useState(false)
  const { announcePolite } = useScreenReaderAnnouncer()

  const quickStats: QuickStats[] = [
    {
      title: '今日處理率',
      value: '94.2%',
      change: { value: 3.1, direction: 'up', isGood: true },
      icon: <Target className="h-4 w-4" />,
      color: 'text-green-600',
      description: '自動對帳成功率'
    },
    {
      title: '平均處理時間',
      value: '2.3s',
      change: { value: 15.2, direction: 'down', isGood: true },
      icon: <Clock className="h-4 w-4" />,
      color: 'text-blue-600',
      description: '單筆訂單處理時間'
    },
    {
      title: '異常檢測',
      value: 7,
      change: { value: 2, direction: 'up', isGood: false },
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      description: '需要人工介入'
    },
    {
      title: 'ML 置信度',
      value: '87.8%',
      change: { value: 5.3, direction: 'up', isGood: true },
      icon: <Brain className="h-4 w-4" />,
      color: 'text-purple-600',
      description: '機器學習模型準確度'
    }
  ]

  const mlInsights: MLInsight[] = [
    {
      id: '1',
      type: 'pattern',
      title: '供應商價格模式',
      description: '「新鮮蔬果」在週末的價格波動較平日高 15%，建議調整預期閾值',
      confidence: 89.2,
      impact: 'medium',
      actionable: true,
      timestamp: '5 分鐘前'
    },
    {
      id: '2',
      type: 'anomaly',
      title: '異常發票金額',
      description: '「優質肉品」今日發票金額異常偏高，可能涉及品質升級或特殊訂單',
      confidence: 76.8,
      impact: 'high',
      actionable: true,
      timestamp: '12 分鐘前'
    },
    {
      id: '3',
      type: 'optimization',
      title: '批次處理建議',
      description: '建議將批次大小調整至 30 筆可提升 12% 處理效率',
      confidence: 93.5,
      impact: 'medium',
      actionable: true,
      timestamp: '28 分鐘前'
    },
    {
      id: '4',
      type: 'trend',
      title: '季節性趨勢',
      description: '預測未來 7 天蔬果類訂單將增加 25%，建議預調配置參數',
      confidence: 82.1,
      impact: 'low',
      actionable: false,
      timestamp: '1 小時前'
    }
  ]

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true)
    announcePolite('正在重新整理 AI 洞察')
    
    // 模擬 API 請求
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setRefreshing(false)
    announcePolite('AI 洞察已更新')
  }, [announcePolite])

  const handleApplyInsight = React.useCallback((insight: MLInsight) => {
    announcePolite(`正在應用洞察：${insight.title}`)
    // TODO: 實現洞察應用邏輯
  }, [announcePolite])

  const getInsightIcon = (type: MLInsight['type']) => {
    switch (type) {
      case 'pattern': return <BarChart3 className="h-4 w-4 text-blue-600" />
      case 'anomaly': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'optimization': return <Zap className="h-4 w-4 text-yellow-600" />
      case 'trend': return <TrendingUp className="h-4 w-4 text-green-600" />
    }
  }

  const getInsightTypeText = (type: MLInsight['type']) => {
    switch (type) {
      case 'pattern': return '模式識別'
      case 'anomaly': return '異常檢測'
      case 'optimization': return '優化建議'
      case 'trend': return '趨勢預測'
    }
  }

  const getImpactColor = (impact: MLInsight['impact']) => {
    switch (impact) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
    }
  }

  const getImpactText = (impact: MLInsight['impact']) => {
    switch (impact) {
      case 'high': return '高影響'
      case 'medium': return '中影響'
      case 'low': return '低影響'
    }
  }

  const timeRangeOptions = [
    { value: 'today', label: '今日' },
    { value: 'week', label: '本週' },
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季' }
  ]

  return (
    <div className="space-y-6">
      {/* 快速統計 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">即時統計</CardTitle>
            <AccessibleSelect
              label="時間範圍"
              name="time-range"
              options={timeRangeOptions}
              value={timeRange}
              onChange={setTimeRange}
              className="w-24 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={stat.color}>
                    {stat.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {stat.title}
                  </span>
                </div>
                <div className={`text-lg font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
              
              {stat.change && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{stat.description}</span>
                  <span className={stat.change.isGood ? 'text-green-600' : 'text-red-600'}>
                    {stat.change.direction === 'up' ? '↗' : '↘'} {stat.change.value}%
                  </span>
                </div>
              )}
              
              {typeof stat.value === 'string' && stat.value.includes('%') && (
                <Progress 
                  value={parseFloat(stat.value)} 
                  className="h-1"
                  variant={parseFloat(stat.value) >= 90 ? 'success' : 'default'}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* AI 洞察與建議 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary-500" />
              <span>AI 洞察</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2"
              aria-label="重新整理 AI 洞察"
            >
              <Settings className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {mlInsights.map((insight) => (
              <div
                key={insight.id}
                className="p-3 border border-gray-200 rounded-lg space-y-2 hover:bg-gray-50 transition-colors"
              >
                {/* 洞察標題和類型 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getInsightIcon(insight.type)}
                    <span className="font-medium text-sm text-gray-900">
                      {insight.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Badge 
                      variant="outline" 
                      size="sm"
                      className="text-xs"
                    >
                      {getInsightTypeText(insight.type)}
                    </Badge>
                  </div>
                </div>

                {/* 洞察描述 */}
                <p className="text-xs text-gray-600 leading-relaxed">
                  {insight.description}
                </p>

                {/* 置信度和影響程度 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-xs text-gray-500">
                      置信度: <span className="font-medium">{insight.confidence.toFixed(1)}%</span>
                    </div>
                    <div className={`text-xs font-medium ${getImpactColor(insight.impact)}`}>
                      {getImpactText(insight.impact)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {insight.timestamp}
                  </div>
                </div>

                {/* 置信度進度條 */}
                <Progress 
                  value={insight.confidence} 
                  className="h-1"
                  variant={
                    insight.confidence >= 85 ? 'success' :
                    insight.confidence >= 70 ? 'default' : 'warning'
                  }
                />

                {/* 操作按鈕 */}
                {insight.actionable && (
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyInsight(insight)}
                      className="text-xs h-7"
                    >
                      應用建議
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 洞察統計 */}
          <div className="pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="space-y-1">
                <div className="text-lg font-bold text-primary-500">
                  {mlInsights.filter(i => i.actionable).length}
                </div>
                <div className="text-xs text-gray-600">可執行建議</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-blue-600">
                  {(mlInsights.reduce((sum, i) => sum + i.confidence, 0) / mlInsights.length).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">平均置信度</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">快速操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => announcePolite('導航到引擎設定')}
          >
            <Settings className="h-4 w-4 mr-2" />
            引擎參數調整
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => announcePolite('導航到歷史分析')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            歷史分析報告
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => announcePolite('導航到排程設定')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            自動排程設定
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => announcePolite('導航到規則管理')}
          >
            <Filter className="h-4 w-4 mr-2" />
            對帳規則管理
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}