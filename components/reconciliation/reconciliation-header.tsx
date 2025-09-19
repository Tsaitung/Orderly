'use client'

import * as React from 'react'
import { 
  Play, 
  Pause, 
  Square, 
  Settings, 
  Download,
  Upload,
  RefreshCw,
  Zap,
  Brain,
  AlertTriangle,
  Clock,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { FormDialog } from '@/components/ui/accessible-modal'
import { AccessibleFormField, AccessibleSelect } from '@/components/ui/accessible-form'
import { useScreenReaderAnnouncer } from '@/hooks/use-accessibility'

interface ReconciliationStats {
  isRunning: boolean
  totalProcessed: number
  successRate: number
  avgProcessingTime: number
  queueSize: number
  mlConfidence: number
  anomaliesDetected: number
  lastRunTime: string
}

interface MLEngineConfig {
  confidenceThreshold: number
  batchSize: number
  maxRetries: number
  timeoutSeconds: number
  enableAutoApproval: boolean
  enableAdvancedMatching: boolean
}

export default function ReconciliationHeader() {
  const [stats, setStats] = React.useState<ReconciliationStats>({
    isRunning: false,
    totalProcessed: 1247,
    successRate: 94.2,
    avgProcessingTime: 2.3,
    queueSize: 15,
    mlConfidence: 87.8,
    anomaliesDetected: 3,
    lastRunTime: '2024-01-15 16:45:23'
  })

  const [isConfigOpen, setIsConfigOpen] = React.useState(false)
  const [config, setConfig] = React.useState<MLEngineConfig>({
    confidenceThreshold: 85,
    batchSize: 50,
    maxRetries: 3,
    timeoutSeconds: 30,
    enableAutoApproval: true,
    enableAdvancedMatching: true
  })

  const { announcePolite, announceSuccess, announceUrgent } = useScreenReaderAnnouncer()

  const handleStartEngine = React.useCallback(() => {
    setStats(prev => ({ ...prev, isRunning: true }))
    announcePolite('AI 對帳引擎已啟動')
    
    // 模擬即時數據更新
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalProcessed: prev.totalProcessed + Math.floor(Math.random() * 5) + 1,
        queueSize: Math.max(0, prev.queueSize - Math.floor(Math.random() * 3)),
        avgProcessingTime: 2.1 + Math.random() * 0.8,
        mlConfidence: 85 + Math.random() * 10
      }))
    }, 3000)

    // 清理定時器
    setTimeout(() => {
      clearInterval(interval)
    }, 60000)
  }, [announcePolite])

  const handleStopEngine = React.useCallback(() => {
    setStats(prev => ({ ...prev, isRunning: false }))
    announceSuccess('AI 對帳引擎已停止')
  }, [announceSuccess])

  const handlePauseEngine = React.useCallback(() => {
    setStats(prev => ({ ...prev, isRunning: false }))
    announcePolite('AI 對帳引擎已暫停')
  }, [announcePolite])

  const handleConfigSave = React.useCallback(() => {
    // TODO: 保存配置到後端
    announceSuccess('引擎配置已更新')
    setIsConfigOpen(false)
  }, [announceSuccess])

  const handleExportResults = React.useCallback(() => {
    announcePolite('正在匯出對帳結果')
    // TODO: 實現匯出功能
  }, [announcePolite])

  const handleImportOrders = React.useCallback(() => {
    announcePolite('正在匯入待對帳訂單')
    // TODO: 實現匯入功能
  }, [announcePolite])

  const getEngineStatusColor = () => {
    if (stats.isRunning) return 'bg-green-500'
    if (stats.queueSize > 0) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const getEngineStatusText = () => {
    if (stats.isRunning) return '運行中'
    if (stats.queueSize > 0) return '待處理'
    return '閒置'
  }

  const confidenceThresholdOptions = [
    { value: '70', label: '70% - 寬鬆模式' },
    { value: '80', label: '80% - 平衡模式' },
    { value: '85', label: '85% - 推薦模式' },
    { value: '90', label: '90% - 嚴格模式' },
    { value: '95', label: '95% - 極嚴格模式' }
  ]

  const batchSizeOptions = [
    { value: '10', label: '10 筆 - 小批量' },
    { value: '25', label: '25 筆 - 中批量' },
    { value: '50', label: '50 筆 - 大批量' },
    { value: '100', label: '100 筆 - 超大批量' }
  ]

  return (
    <div className="space-y-4">
      {/* 引擎控制面板 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* 左側：引擎狀態和控制 */}
            <div className="flex items-center space-x-6">
              {/* 引擎狀態指示器 */}
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className={`w-4 h-4 rounded-full ${getEngineStatusColor()}`}>
                    {stats.isRunning && (
                      <div className="absolute inset-0 w-4 h-4 rounded-full bg-green-500 animate-ping" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-primary-500" />
                    <span>AI 對帳引擎</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    狀態: {getEngineStatusText()}
                  </div>
                </div>
              </div>

              {/* 控制按鈕 */}
              <div className="flex items-center space-x-2">
                {!stats.isRunning ? (
                  <Button
                    onClick={handleStartEngine}
                    className="flex items-center space-x-2"
                    disabled={stats.queueSize === 0}
                  >
                    <Play className="h-4 w-4" />
                    <span>啟動引擎</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={handlePauseEngine}
                      className="flex items-center space-x-2"
                    >
                      <Pause className="h-4 w-4" />
                      <span>暫停</span>
                    </Button>
                    <Button
                      variant="solid"
                      colorScheme="red"
                      onClick={handleStopEngine}
                      className="flex items-center space-x-2"
                    >
                      <Square className="h-4 w-4" />
                      <span>停止</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* 右側：功能按鈕 */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportOrders}
                className="flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">匯入訂單</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportResults}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">匯出結果</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigOpen(true)}
                className="flex items-center space-x-2"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden md:inline">引擎設定</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  announcePolite('正在重新整理引擎狀態')
                  // TODO: 重新載入狀態
                }}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 即時統計儀表板 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* 處理總數 */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalProcessed.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">總處理筆數</div>
          </CardContent>
        </Card>

        {/* 成功率 */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.successRate}%
            </div>
            <div className="text-sm text-gray-600">成功率</div>
            <div className="mt-2">
              <Progress value={stats.successRate} className="h-1" />
            </div>
          </CardContent>
        </Card>

        {/* 平均處理時間 */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 flex items-center justify-center space-x-1">
              <span>{stats.avgProcessingTime.toFixed(1)}</span>
              <span className="text-sm">s</span>
            </div>
            <div className="text-sm text-gray-600">平均處理時間</div>
            <div className="flex items-center justify-center mt-1">
              <Clock className="h-3 w-3 text-gray-400 mr-1" />
              <span className="text-xs text-gray-500">比目標快 70%</span>
            </div>
          </CardContent>
        </Card>

        {/* 待處理佇列 */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.queueSize}
            </div>
            <div className="text-sm text-gray-600">待處理佇列</div>
            {stats.queueSize > 10 && (
              <Badge variant="warning" size="sm" className="mt-1">
                佇列壅塞
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* ML 置信度 */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary-500 flex items-center justify-center space-x-1">
              <Zap className="h-5 w-5" />
              <span>{stats.mlConfidence.toFixed(1)}%</span>
            </div>
            <div className="text-sm text-gray-600">ML 置信度</div>
            <div className="mt-2">
              <Progress 
                value={stats.mlConfidence} 
                className="h-1"
                variant={stats.mlConfidence >= 85 ? 'success' : 'warning'}
              />
            </div>
          </CardContent>
        </Card>

        {/* 異常檢測 */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600 flex items-center justify-center space-x-1">
              <AlertTriangle className="h-5 w-5" />
              <span>{stats.anomaliesDetected}</span>
            </div>
            <div className="text-sm text-gray-600">異常檢測</div>
            {stats.anomaliesDetected > 0 && (
              <Badge variant="destructive" size="sm" className="mt-1">
                需要處理
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* 引擎效能 */}
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 flex items-center justify-center space-x-1">
              <Target className="h-5 w-5" />
              <span>A+</span>
            </div>
            <div className="text-sm text-gray-600">引擎效能</div>
            <div className="text-xs text-gray-500 mt-1">
              超越目標 94%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 引擎配置對話框 */}
      <FormDialog
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        title="AI 引擎配置"
        description="調整機器學習引擎的參數以優化對帳性能"
        onSubmit={handleConfigSave}
        submitText="保存配置"
        size="lg"
      >
        <div className="space-y-6">
          {/* 核心參數 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">核心參數</h4>
            
            <AccessibleSelect
              label="置信度閾值"
              name="confidence-threshold"
              options={confidenceThresholdOptions}
              value={config.confidenceThreshold.toString()}
              onChange={(value) => setConfig(prev => ({ 
                ...prev, 
                confidenceThreshold: parseInt(value) 
              }))}
              helperText="低於此置信度的匹配將標記為需要人工審核"
            />

            <AccessibleSelect
              label="批次處理大小"
              name="batch-size"
              options={batchSizeOptions}
              value={config.batchSize.toString()}
              onChange={(value) => setConfig(prev => ({ 
                ...prev, 
                batchSize: parseInt(value) 
              }))}
              helperText="每次處理的訂單數量，影響記憶體使用和處理速度"
            />

            <AccessibleFormField
              label="最大重試次數"
              name="max-retries"
              type="number"
              value={config.maxRetries.toString()}
              onChange={(value) => setConfig(prev => ({ 
                ...prev, 
                maxRetries: parseInt(value) || 0
              }))}
              helperText="處理失敗時的重試次數"
            />

            <AccessibleFormField
              label="超時時間 (秒)"
              name="timeout-seconds"
              type="number"
              value={config.timeoutSeconds.toString()}
              onChange={(value) => setConfig(prev => ({ 
                ...prev, 
                timeoutSeconds: parseInt(value) || 30
              }))}
              helperText="單筆訂單處理的最大等待時間"
            />
          </div>

          {/* 進階設定 */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">進階設定</h4>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.enableAutoApproval}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    enableAutoApproval: e.target.checked 
                  }))}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">啟用自動核准</div>
                  <div className="text-sm text-gray-600">
                    高置信度匹配將自動核准，無需人工審核
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.enableAdvancedMatching}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    enableAdvancedMatching: e.target.checked 
                  }))}
                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900">啟用進階匹配</div>
                  <div className="text-sm text-gray-600">
                    使用深度學習算法進行模糊匹配和語義分析
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 配置預覽 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">配置預覽</h5>
            <div className="text-sm text-gray-600 space-y-1">
              <div>• 置信度閾值: {config.confidenceThreshold}%</div>
              <div>• 批次大小: {config.batchSize} 筆</div>
              <div>• 重試次數: {config.maxRetries} 次</div>
              <div>• 超時時間: {config.timeoutSeconds} 秒</div>
              <div>• 自動核准: {config.enableAutoApproval ? '啟用' : '停用'}</div>
              <div>• 進階匹配: {config.enableAdvancedMatching ? '啟用' : '停用'}</div>
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  )
}