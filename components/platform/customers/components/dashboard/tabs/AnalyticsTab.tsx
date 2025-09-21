// ============================================================================
// Analytics Tab Component
// ============================================================================
// Deep statistics and trend analysis with charts and insights

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Activity,
  Target,
  Award,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';

import type { 
  DashboardStatistics,
  HierarchyNode,
  SearchResult,
  FilterOptions,
  SortOptions,
  ActivityMetrics
} from '../../../types';

// ============================================================================
// Types
// ============================================================================

interface AnalyticsTabProps {
  dashboardData: DashboardStatistics;
  tree: HierarchyNode[];
  searchResults: SearchResult[];
  filters: FilterOptions;
  sortOptions: SortOptions;
  searchQuery: string;
}

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
  colorScheme: 'green' | 'red' | 'blue' | 'purple' | 'orange';
}

interface TrendData {
  period: string;
  revenue: number;
  orders: number;
  customers: number;
  activity: number;
}

interface RegionalData {
  region: string;
  customers: number;
  revenue: number;
  growth: number;
}

// ============================================================================
// Mock Analytics Data Generation
// ============================================================================

const generateTrendData = (): TrendData[] => {
  const months = ['1月', '2月', '3月', '4月', '5月', '6月'];
  return months.map((month, index) => ({
    period: month,
    revenue: 1800000 + (index * 150000) + (Math.random() * 200000),
    orders: 450 + (index * 30) + (Math.random() * 100),
    customers: 180 + (index * 5) + (Math.random() * 20),
    activity: 70 + (index * 2) + (Math.random() * 15)
  }));
};

const generateRegionalData = (): RegionalData[] => {
  return [
    { region: '台北市', customers: 5, revenue: 1200000, growth: 15.2 },
    { region: '新北市', customers: 3, revenue: 800000, growth: 12.8 },
    { region: '桃園市', customers: 2, revenue: 450000, growth: 8.5 },
    { region: '台中市', customers: 2, revenue: 350000, growth: -2.1 },
    { region: '高雄市', customers: 1, revenue: 180000, growth: 6.7 }
  ];
};

// ============================================================================
// Analytics Metrics Component
// ============================================================================

interface AnalyticsMetricsProps {
  dashboardData: DashboardStatistics;
}

function AnalyticsMetrics({ dashboardData }: AnalyticsMetricsProps) {
  const metrics: AnalyticsMetric[] = [
    {
      id: 'revenue_growth',
      title: '營收成長率',
      value: `${dashboardData.revenueGrowth.toFixed(1)}%`,
      change: dashboardData.revenueGrowth,
      changeLabel: '較上月',
      trend: dashboardData.revenueGrowth > 0 ? 'up' : 'down',
      icon: TrendingUp,
      colorScheme: 'green'
    },
    {
      id: 'customer_retention',
      title: '客戶留存率',
      value: '87.5%',
      change: 3.2,
      changeLabel: '較上月',
      trend: 'up',
      icon: Users,
      colorScheme: 'blue'
    },
    {
      id: 'avg_order_value',
      title: '平均訂單金額',
      value: 'NT$ 3,250',
      change: -2.1,
      changeLabel: '較上月',
      trend: 'down',
      icon: DollarSign,
      colorScheme: 'orange'
    },
    {
      id: 'activity_score',
      title: '整體活躍度',
      value: Math.round(dashboardData.avgActivityScore),
      change: 5.8,
      changeLabel: '較上月',
      trend: 'up',
      icon: Activity,
      colorScheme: 'purple'
    },
    {
      id: 'delivery_performance',
      title: '配送表現',
      value: '94.2%',
      change: 1.5,
      changeLabel: '較上月',
      trend: 'up',
      icon: Target,
      colorScheme: 'green'
    },
    {
      id: 'customer_satisfaction',
      title: '客戶滿意度',
      value: '4.6/5.0',
      change: 0.2,
      changeLabel: '較上月',
      trend: 'up',
      icon: Award,
      colorScheme: 'blue'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const isPositive = metric.trend === 'up';
        
        return (
          <Card key={metric.id} variant="filled" colorScheme="white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {metric.value}
                  </p>
                  <div className="flex items-center">
                    {metric.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    ) : metric.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                    ) : (
                      <div className="h-4 w-4 mr-1" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      isPositive ? "text-green-600" : "text-red-600"
                    )}>
                      {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      {metric.changeLabel}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <Icon className={cn(
                    "h-8 w-8",
                    metric.colorScheme === 'green' ? "text-green-500" :
                    metric.colorScheme === 'blue' ? "text-blue-500" :
                    metric.colorScheme === 'purple' ? "text-purple-500" :
                    metric.colorScheme === 'orange' ? "text-orange-500" :
                    "text-red-500"
                  )} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// Trend Chart Component (Mock)
// ============================================================================

interface TrendChartProps {
  data: TrendData[];
}

function TrendChart({ data }: TrendChartProps) {
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="mr-2 h-5 w-5" />
          營收趨勢分析
        </CardTitle>
        <p className="text-sm text-gray-500">過去 6 個月營收與訂單趨勢</p>
      </CardHeader>
      <CardContent>
        {/* Simple bar chart visualization */}
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-12 text-sm text-gray-600 font-medium">
                {item.period}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">營收</span>
                  <span className="text-sm font-medium">
                    NT$ {(item.revenue / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(item.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-right">
                <div className="text-sm font-medium text-gray-900">
                  {item.orders}
                </div>
                <div className="text-xs text-gray-500">訂單</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">總成長率</span>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="font-medium text-green-600">+22.8%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Regional Analysis Component
// ============================================================================

interface RegionalAnalysisProps {
  data: RegionalData[];
}

function RegionalAnalysis({ data }: RegionalAnalysisProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="mr-2 h-5 w-5" />
          區域分析
        </CardTitle>
        <p className="text-sm text-gray-500">各區域客戶分布與營收表現</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((region, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  index === 0 ? "bg-primary-500" :
                  index === 1 ? "bg-blue-500" :
                  index === 2 ? "bg-green-500" :
                  index === 3 ? "bg-orange-500" : "bg-purple-500"
                )} />
                <div>
                  <div className="font-medium text-gray-900">{region.region}</div>
                  <div className="text-sm text-gray-500">
                    {region.customers} 個客戶 • NT$ {(region.revenue / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className={cn(
                  "text-sm font-medium",
                  region.growth > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {region.growth > 0 ? '+' : ''}{region.growth.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {((region.revenue / totalRevenue) * 100).toFixed(1)}% 占比
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button variant="outline" size="sm" className="w-full">
            查看詳細區域報告
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Insights and Recommendations Component
// ============================================================================

function InsightsAndRecommendations() {
  const insights = [
    {
      type: 'success',
      title: '營收成長強勁',
      description: '本月營收較上月成長 15.8%，主要來自王品集團和瓦城集團的訂單增加。',
      icon: TrendingUp,
      action: '查看詳細分析'
    },
    {
      type: 'warning',
      title: '部分客戶活躍度下降',
      description: '有 3 個客戶集團的活躍度較上月下降超過 10%，建議主動聯繫了解需求。',
      icon: AlertTriangle,
      action: '查看客戶清單'
    },
    {
      type: 'info',
      title: '配送效率優化機會',
      description: '台中地區的平均配送時間比其他地區高 20%，建議檢視配送路線規劃。',
      icon: Target,
      action: '優化配送'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          智能洞察與建議
        </CardTitle>
        <p className="text-sm text-gray-500">基於數據分析的業務洞察</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          
          return (
            <div key={index} className={cn(
              "p-4 rounded-lg border-l-4",
              insight.type === 'success' ? "bg-green-50 border-green-400" :
              insight.type === 'warning' ? "bg-yellow-50 border-yellow-400" :
              "bg-blue-50 border-blue-400"
            )}>
              <div className="flex items-start space-x-3">
                <Icon className={cn(
                  "h-5 w-5 mt-0.5",
                  insight.type === 'success' ? "text-green-600" :
                  insight.type === 'warning' ? "text-yellow-600" :
                  "text-blue-600"
                )} />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    {insight.description}
                  </p>
                  <Button variant="ghost" size="sm" className={cn(
                    "h-auto p-0 font-medium",
                    insight.type === 'success' ? "text-green-700 hover:text-green-800" :
                    insight.type === 'warning' ? "text-yellow-700 hover:text-yellow-800" :
                    "text-blue-700 hover:text-blue-800"
                  )}>
                    {insight.action} →
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Analytics Tab Component
// ============================================================================

export default function AnalyticsTab({
  dashboardData,
  tree,
  searchResults,
  filters,
  sortOptions,
  searchQuery
}: AnalyticsTabProps) {
  const trendData = useMemo(() => generateTrendData(), []);
  const regionalData = useMemo(() => generateRegionalData(), []);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">數據分析總覽</h2>
          <p className="text-sm text-gray-500 mt-1">深度統計分析與業務洞察</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            匯出報告
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            重新整理
          </Button>
        </div>
      </div>

      {/* Analytics Metrics */}
      <AnalyticsMetrics dashboardData={dashboardData} />

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Analysis */}
        <TrendChart data={trendData} />
        
        {/* Regional Analysis */}
        <RegionalAnalysis data={regionalData} />
      </div>

      {/* Insights and Recommendations */}
      <InsightsAndRecommendations />

      {/* Additional Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              客戶類型分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary-500 rounded-full" />
                  <span className="text-sm text-gray-600">連鎖餐飲</span>
                </div>
                <span className="text-sm font-medium">65%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm text-gray-600">獨立餐廳</span>
                </div>
                <span className="text-sm font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-600">團膳業者</span>
                </div>
                <span className="text-sm font-medium">10%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              訂單時段分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">上午 (9-12)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="w-3/5 bg-primary-500 h-2 rounded-full" />
                  </div>
                  <span className="text-sm font-medium">60%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">下午 (12-18)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="w-4/5 bg-blue-500 h-2 rounded-full" />
                  </div>
                  <span className="text-sm font-medium">80%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">晚上 (18-24)</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="w-2/5 bg-green-500 h-2 rounded-full" />
                  </div>
                  <span className="text-sm font-medium">40%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}