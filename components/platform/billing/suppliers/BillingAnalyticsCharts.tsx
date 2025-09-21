'use client'

import { useState } from 'react'
import { BillingAnalytics } from '@/types/platform-billing'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  PieChart as PieIcon,
  BarChart3,
  Activity,
  DollarSign,
  Users,
  Percent
} from 'lucide-react'

interface BillingAnalyticsChartsProps {
  data: BillingAnalytics | null
  loading?: boolean
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f']

export function BillingAnalyticsCharts({ data, loading }: BillingAnalyticsChartsProps) {
  const [activeChart, setActiveChart] = useState<'revenue' | 'suppliers' | 'commissions' | 'trends'>('revenue')

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex space-x-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-gray-500">載入圖表中...</div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">暫無分析數據</p>
          <p className="text-sm text-gray-500 mt-1">請稍後再試或聯繫系統管理員</p>
        </div>
      </div>
    )
  }

  const chartTabs = [
    {
      id: 'revenue' as const,
      label: '收入分析',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      id: 'suppliers' as const,
      label: '供應商分布',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      id: 'commissions' as const,
      label: '佣金分析',
      icon: Percent,
      color: 'text-purple-600'
    },
    {
      id: 'trends' as const,
      label: '趋势分析',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ]

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.name.includes('率') || entry.name.includes('Rate') 
                  ? `${entry.value}%`
                  : entry.name.includes('金額') || entry.name.includes('Amount')
                  ? `NT$ ${entry.value.toLocaleString()}`
                  : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderRevenueChart = () => {
    const revenueData = data.revenue.revenueByTier.map(tier => ({
      tier: `T${tier.tier}`,
      tierName: tier.tierName,
      revenue: tier.totalRevenue,
      suppliers: tier.supplierCount,
      avgRevenue: tier.averageRevenue
    }))

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">各層級收入分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#8884d8" name="總收入" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">收入成長趨勢</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.trends.gmvTrend.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#82ca9d" 
                fill="#82ca9d" 
                fillOpacity={0.3}
                name="GMV"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderSuppliersChart = () => {
    const tierData = data.suppliers.tierDistribution
    const ratingData = data.suppliers.ratingDistribution

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">層級分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tierData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ tierName, percentage }) => `${tierName} ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {tierData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">評級分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rating" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#82ca9d" name="供應商數量" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderCommissionsChart = () => {
    const topSuppliers = data.commissions.topEarningSuppliers.slice(0, 10)
    const categoryData = data.commissions.commissionByCategory

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">頂級供應商佣金</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topSuppliers} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis type="category" dataKey="supplierName" width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalCommission" fill="#ff7300" name="總佣金" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">類別佣金分布</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="totalCommission"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  const renderTrendsChart = () => {
    const combinedTrendData = data.trends.gmvTrend.slice(-30).map((item, index) => ({
      date: item.date,
      gmv: item.value,
      commission: data.trends.commissionTrend[index]?.value || 0,
      suppliers: data.trends.supplierCountTrend[index]?.value || 0
    }))

    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">綜合趨勢分析 (最近30天)</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={combinedTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="gmv" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="GMV"
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="commission" 
                stroke="#82ca9d" 
                strokeWidth={2}
                name="佣金收入"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="suppliers" 
                stroke="#ffc658" 
                strokeWidth={2}
                name="活躍供應商"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 趨勢統計摘要 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">GMV 成長</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {data.revenue.growth.monthly > 0 ? '+' : ''}{data.revenue.growth.monthly.toFixed(1)}%
            </div>
            <div className="text-xs text-blue-700">月同比</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">佣金成長</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {data.revenue.growth.quarterly > 0 ? '+' : ''}{data.revenue.growth.quarterly.toFixed(1)}%
            </div>
            <div className="text-xs text-green-700">季同比</div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">供應商留存</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {data.suppliers.retentionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-purple-700">年留存率</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 圖表選項卡 */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {chartTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeChart === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <tab.icon className={cn('h-4 w-4', tab.color)} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 圖表內容 */}
      <div className="bg-white">
        {activeChart === 'revenue' && renderRevenueChart()}
        {activeChart === 'suppliers' && renderSuppliersChart()}
        {activeChart === 'commissions' && renderCommissionsChart()}
        {activeChart === 'trends' && renderTrendsChart()}
      </div>
    </div>
  )
}