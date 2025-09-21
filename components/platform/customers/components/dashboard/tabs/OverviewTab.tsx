// ============================================================================
// Overview Tab Component
// ============================================================================
// Dashboard view with metrics cards, activity heatmap, and top performers

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateOnly } from '@/lib/date';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Building2,
  MapPin,
  DollarSign,
  Activity,
  Clock,
  Star,
  ChevronRight,
  Calendar
} from 'lucide-react';

import type { 
  DashboardStatistics,
  CustomerPerformer,
  HierarchyNode,
  SearchResult,
  FilterOptions,
  SortOptions,
  ActivityHeatmapData
} from '../../../types';

// ============================================================================
// Types
// ============================================================================

interface OverviewTabProps {
  dashboardData: DashboardStatistics;
  tree: HierarchyNode[];
  searchResults: SearchResult[];
  filters: FilterOptions;
  sortOptions: SortOptions;
  searchQuery: string;
}

// ============================================================================
// Mock Activity Heatmap Data
// ============================================================================

const generateMockHeatmapData = (): ActivityHeatmapData[] => {
  const data: ActivityHeatmapData[] = [];
  const today = new Date();
  
  // Generate last 90 days of data
  for (let i = 89; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Mock activity with some patterns (higher on weekdays)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseActivity = isWeekend ? 20 : 60;
    const randomVariation = Math.random() * 40;
    const value = Math.min(100, Math.max(0, baseActivity + randomVariation));
    
    data.push({
      date: formatDateOnly(date),
      value: Math.round(value),
      orders: Math.round(value / 10),
      revenue: Math.round(value * 1000 + Math.random() * 50000)
    });
  }
  
  return data;
};

// ============================================================================
// Sub Components
// ============================================================================

interface MetricsCardsProps {
  dashboardData: DashboardStatistics;
}

function MetricsCards({ dashboardData }: MetricsCardsProps) {
  const metrics = [
    {
      title: '總收入 (月)',
      value: `NT$ ${(dashboardData.totalMonthlyRevenue / 1000).toFixed(0)}K`,
      trend: dashboardData.revenueGrowth,
      icon: DollarSign,
      colorScheme: 'green'
    },
    {
      title: '活躍客戶',
      value: dashboardData.activeCustomers,
      total: dashboardData.totalCustomers,
      percentage: Math.round((dashboardData.activeCustomers / dashboardData.totalCustomers) * 100),
      icon: Users,
      colorScheme: 'primary'
    },
    {
      title: '平均活躍度',
      value: `${Math.round(dashboardData.avgActivityScore)}分`,
      trend: 5.2, // Mock trend
      icon: Activity,
      colorScheme: 'platform'
    },
    {
      title: '營業據點',
      value: dashboardData.locationsCount,
      subtitle: `${dashboardData.businessUnitsCount} 個業務單位`,
      icon: MapPin,
      colorScheme: 'gray'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <Card key={index} variant="filled" colorScheme={metric.colorScheme}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {metric.title}
                  </p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-bold text-gray-900">
                      {metric.value}
                    </p>
                    {metric.total && (
                      <span className="ml-2 text-sm text-gray-500">
                        / {metric.total}
                      </span>
                    )}
                  </div>
                  
                  {metric.trend !== undefined && (
                    <div className="flex items-center mt-2">
                      {metric.trend > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      ) : metric.trend < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-400 mr-1" />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        metric.trend > 0 ? "text-green-600" : 
                        metric.trend < 0 ? "text-red-600" : "text-gray-500"
                      )}>
                        {metric.trend > 0 ? '+' : ''}{metric.trend}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs 上月</span>
                    </div>
                  )}
                  
                  {metric.percentage !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">活躍率</span>
                        <span className="font-medium">{metric.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-500 h-2 rounded-full" 
                          style={{ width: `${metric.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {metric.subtitle && (
                    <p className="text-sm text-gray-500 mt-1">
                      {metric.subtitle}
                    </p>
                  )}
                </div>
                
                <div className="ml-4">
                  <Icon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface ActivityHeatmapProps {
  data: ActivityHeatmapData[];
}

function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const weeks = useMemo(() => {
    const weeksData: ActivityHeatmapData[][] = [];
    let currentWeek: ActivityHeatmapData[] = [];
    
    data.forEach((day, index) => {
      currentWeek.push(day);
      
      // If it's Sunday (end of week) or last day, start new week
      const date = new Date(day.date);
      if (date.getDay() === 0 || index === data.length - 1) {
        weeksData.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeksData;
  }, [data]);

  const getIntensityColor = (value: number) => {
    if (value === 0) return 'bg-gray-100';
    if (value < 25) return 'bg-green-200';
    if (value < 50) return 'bg-green-300';
    if (value < 75) return 'bg-green-400';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="mr-2 h-5 w-5" />
          活躍度熱圖
        </CardTitle>
        <p className="text-sm text-gray-500">過去 90 天的客戶活躍度分布</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex space-x-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    "w-3 h-3 rounded-sm",
                    getIntensityColor(day.value)
                  )}
                  title={`${day.date}: ${day.value}% 活躍度, ${day.orders} 訂單, NT$ ${day.revenue.toLocaleString()}`}
                />
              ))}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>90 天前</span>
          <div className="flex items-center space-x-2">
            <span>低</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 rounded-sm" />
              <div className="w-3 h-3 bg-green-200 rounded-sm" />
              <div className="w-3 h-3 bg-green-300 rounded-sm" />
              <div className="w-3 h-3 bg-green-400 rounded-sm" />
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
            </div>
            <span>高</span>
          </div>
          <span>今天</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface TopPerformersProps {
  performers: CustomerPerformer[];
}

function TopPerformers({ performers }: TopPerformersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Star className="mr-2 h-5 w-5" />
          表現優秀客戶
        </CardTitle>
        <p className="text-sm text-gray-500">本月營收前三名客戶</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {performers.map((performer, index) => (
          <div key={performer.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-shrink-0">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                index === 0 ? "bg-yellow-100 text-yellow-800" :
                index === 1 ? "bg-gray-100 text-gray-800" :
                "bg-orange-100 text-orange-800"
              )}>
                {index + 1}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {performer.name}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {performer.type === 'group' ? '集團' : 
                   performer.type === 'company' ? '公司' : 
                   performer.type === 'location' ? '據點' : '單位'}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-sm text-gray-500">
                  NT$ {(performer.monthlyRevenue / 1000).toFixed(0)}K
                </span>
                <span className="text-sm text-gray-500">
                  {performer.orderCount} 訂單
                </span>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-1">活躍度</span>
                  <span className="text-sm font-medium text-green-600">
                    {performer.activityScore}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {performer.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : performer.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-gray-400" />
              )}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        ))}
        
        <div className="pt-2">
          <Button variant="outline" className="w-full" size="sm">
            查看完整排行榜
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionsProps {}

function QuickActions({}: QuickActionsProps) {
  const actions = [
    {
      title: '新增客戶集團',
      description: '建立新的客戶組織結構',
      icon: Users,
      action: () => console.log('Add customer group')
    },
    {
      title: '匯入客戶資料',
      description: '批量匯入客戶資訊',
      icon: Building2,
      action: () => console.log('Import customers')
    },
    {
      title: '效能分析報告',
      description: '生成詳細分析報告',
      icon: Activity,
      action: () => console.log('Generate report')
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>快速操作</CardTitle>
        <p className="text-sm text-gray-500">常用管理功能</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={action.action}
            >
              <Icon className="mr-3 h-5 w-5 text-gray-500" />
              <div className="text-left">
                <div className="font-medium">{action.title}</div>
                <div className="text-sm text-gray-500">{action.description}</div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Overview Tab Component
// ============================================================================

export default function OverviewTab({
  dashboardData,
  tree,
  searchResults,
  filters,
  sortOptions,
  searchQuery
}: OverviewTabProps) {
  const heatmapData = useMemo(() => generateMockHeatmapData(), []);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <MetricsCards dashboardData={dashboardData} />
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Heatmap */}
        <ActivityHeatmap data={heatmapData} />
        
        {/* Top Performers */}
        <TopPerformers performers={dashboardData.topPerformers} />
      </div>
      
      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
