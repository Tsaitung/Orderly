'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Truck,
  MapPin,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Users,
  Fuel,
  Route,
  Timer,
} from 'lucide-react'

// 模擬物流統計數據
const logisticsStats = {
  totalDeliveries: 234,
  activeDeliveries: 18,
  completedToday: 45,
  onTimeRate: 94.2,
  averageDeliveryTime: 32,
  totalDistance: 1567,
  fuelEfficiency: 8.5,
  activeVehicles: 12,
  totalVehicles: 15,
  activeDrivers: 12,
  exceptionsToday: 3,
  customerSatisfaction: 4.6,
}

const statsCards = [
  {
    title: '今日配送',
    value: logisticsStats.activeDeliveries.toString(),
    subValue: `已完成 ${logisticsStats.completedToday}`,
    icon: Truck,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badge: { text: '進行中', variant: 'info' as const },
    trend: { value: '+12%', isPositive: true },
    description: '當前配送任務',
  },
  {
    title: '準時交付率',
    value: `${logisticsStats.onTimeRate}%`,
    subValue: `目標 95%`,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badge: { text: '優秀', variant: 'success' as const },
    trend: { value: '+2.1%', isPositive: true },
    description: '本月表現',
  },
  {
    title: '平均配送時間',
    value: `${logisticsStats.averageDeliveryTime}`,
    subValue: '分鐘',
    icon: Clock,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badge: { text: '良好', variant: 'success' as const },
    trend: { value: '-5min', isPositive: true },
    description: '較上月改善',
  },
  {
    title: '車輛利用率',
    value: `${Math.round((logisticsStats.activeVehicles / logisticsStats.totalVehicles) * 100)}%`,
    subValue: `${logisticsStats.activeVehicles}/${logisticsStats.totalVehicles} 車輛`,
    icon: MapPin,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badge: { text: '高效', variant: 'warning' as const },
    trend: { value: '+8%', isPositive: true },
    description: '資源配置',
  },
]

const performanceMetrics = [
  {
    label: '今日里程',
    value: `${logisticsStats.totalDistance} km`,
    icon: Route,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    change: '+156 km',
  },
  {
    label: '油耗效率',
    value: `${logisticsStats.fuelEfficiency} km/L`,
    icon: Fuel,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    change: '+0.3',
  },
  {
    label: '在線司機',
    value: `${logisticsStats.activeDrivers} 位`,
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    change: '+2 位',
  },
  {
    label: '異常事件',
    value: `${logisticsStats.exceptionsToday} 起`,
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    change: '-1 起',
  },
  {
    label: '客戶滿意度',
    value: `${logisticsStats.customerSatisfaction}/5.0`,
    icon: TrendingUp,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    change: '+0.2',
  },
  {
    label: '平均速度',
    value: '45 km/h',
    icon: Timer,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    change: '+3 km/h',
  },
]

const deliveryStatusData = [
  { status: '待出發', count: 12, color: 'bg-gray-500' },
  { status: '配送中', count: 18, color: 'bg-blue-500' },
  { status: '已送達', count: 45, color: 'bg-green-500' },
  { status: '異常', count: 3, color: 'bg-red-500' },
  { status: '已取消', count: 2, color: 'bg-gray-400' },
]

const regionalStats = [
  { region: '台北市', deliveries: 28, onTime: 96.4, avgTime: 28 },
  { region: '新北市', deliveries: 22, onTime: 92.1, avgTime: 35 },
  { region: '桃園市', deliveries: 15, onTime: 94.7, avgTime: 42 },
  { region: '台中市', deliveries: 18, onTime: 91.2, avgTime: 38 },
  { region: '其他地區', deliveries: 8, onTime: 89.5, avgTime: 55 },
]

export default function LogisticsStats() {
  return (
    <div className="space-y-6">
      {/* 主要物流指標 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <Card
            key={index}
            className={`p-6 ${card.borderColor} border-l-4 transition-all duration-200 hover:shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center space-x-2">
                  <div className={`rounded-lg p-2 ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                    {card.trend && (
                      <span
                        className={`text-sm font-medium ${
                          card.trend.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {card.trend.value}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{card.description}</p>
                      <p className="text-xs text-gray-400">{card.subValue}</p>
                    </div>
                    <Badge variant={card.badge.variant} size="sm">
                      {card.badge.text}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 詳細指標 */}
      <Card className="p-6">
        <h3 className="mb-4 font-medium text-gray-900">營運指標</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {performanceMetrics.map((metric, index) => (
            <div key={index} className={`rounded-lg p-4 ${metric.bgColor} border`}>
              <div className="mb-2 flex items-center space-x-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-sm font-medium text-gray-700">{metric.label}</span>
              </div>
              <div className="space-y-1">
                <div className="text-xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-xs text-gray-600">{metric.change}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* 配送狀態分布與地區統計 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 配送狀態分布 */}
        <Card className="p-6">
          <h3 className="mb-4 font-medium text-gray-900">配送狀態分布</h3>
          <div className="space-y-4">
            {deliveryStatusData.map((item, index) => {
              const total = deliveryStatusData.reduce((sum, item) => sum + item.count, 0)
              const percentage = (item.count / total) * 100

              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">{item.status}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{item.count} 筆</span>
                      <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* 地區配送統計 */}
        <Card className="p-6">
          <h3 className="mb-4 font-medium text-gray-900">地區配送統計</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 border-b pb-2 text-xs font-medium text-gray-600">
              <span>地區</span>
              <span className="text-center">配送數</span>
              <span className="text-center">準時率</span>
              <span className="text-center">平均時間</span>
            </div>
            {regionalStats.map((region, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 text-sm">
                <span className="font-medium text-gray-900">{region.region}</span>
                <span className="text-center font-medium text-blue-600">{region.deliveries}</span>
                <span
                  className={`text-center font-medium ${
                    region.onTime >= 95
                      ? 'text-green-600'
                      : region.onTime >= 90
                        ? 'text-orange-600'
                        : 'text-red-600'
                  }`}
                >
                  {region.onTime}%
                </span>
                <span className="text-center text-gray-600">{region.avgTime}分</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 即時監控 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="mb-4 font-medium text-gray-900">實時警報</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded border border-red-200 bg-red-50 p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">配送延遲</span>
              </div>
              <Badge variant="destructive" size="sm">
                2 筆
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">即將逾期</span>
              </div>
              <Badge variant="warning" size="sm">
                5 筆
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center space-x-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">車輛維修</span>
              </div>
              <Badge variant="info" size="sm">
                1 台
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-medium text-gray-900">今日目標</h3>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">配送完成率</span>
                <span className="font-medium">{logisticsStats.completedToday}/60</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${(logisticsStats.completedToday / 60) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">準時交付率</span>
                <span className="font-medium">{logisticsStats.onTimeRate}%/95%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{ width: `${(logisticsStats.onTimeRate / 95) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">車輛使用率</span>
                <span className="font-medium">80%/85%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-purple-600" style={{ width: '94%' }}></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 font-medium text-gray-900">效率趨勢</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">配送效率</span>
              <span className="text-sm font-medium text-green-600">↗ +15%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">油耗成本</span>
              <span className="text-sm font-medium text-green-600">↘ -8%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">客戶滿意度</span>
              <span className="text-sm font-medium text-blue-600">↗ +0.2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">異常率</span>
              <span className="text-sm font-medium text-green-600">↘ -12%</span>
            </div>
            <div className="mt-3 border-t pt-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">綜合評分</span>
                <span className="text-sm font-medium text-blue-600">92/100</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
