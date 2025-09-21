// ============================================================================
// Activity Indicator Component
// ============================================================================
// Visual indicator for customer activity levels with scoring and trends

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Zap, Clock } from 'lucide-react';
import type { ActivityMetrics } from '../../../types';

// ============================================================================
// Types
// ============================================================================

interface ActivityIndicatorProps {
  activity: ActivityMetrics;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  showScore?: boolean;
  showLabel?: boolean;
  className?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const ACTIVITY_CONFIG = {
  active: {
    label: '活躍',
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    badgeClass: 'bg-green-100 text-green-800',
    icon: Zap
  },
  medium: {
    label: '中等',
    color: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    badgeClass: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  low: {
    label: '低活躍',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-800',
    icon: Clock
  },
  dormant: {
    label: '休眠',
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    badgeClass: 'bg-red-100 text-red-800',
    icon: Minus
  }
} as const;

const SIZE_CONFIG = {
  sm: {
    indicator: 'w-2 h-2',
    container: 'text-xs',
    badge: 'text-xs px-1.5 py-0.5',
    icon: 'h-3 w-3',
    score: 'text-xs',
    progress: 'h-1'
  },
  md: {
    indicator: 'w-3 h-3',
    container: 'text-sm',
    badge: 'text-xs px-2 py-1',
    icon: 'h-4 w-4',
    score: 'text-sm',
    progress: 'h-2'
  },
  lg: {
    indicator: 'w-4 h-4',
    container: 'text-base',
    badge: 'text-sm px-3 py-1.5',
    icon: 'h-5 w-5',
    score: 'text-base',
    progress: 'h-3'
  }
} as const;

// ============================================================================
// Component Implementation
// ============================================================================

export default function ActivityIndicator({
  activity,
  size = 'md',
  showTrend = true,
  showScore = true,
  showLabel = true,
  className
}: ActivityIndicatorProps) {
  const config = ACTIVITY_CONFIG[activity.level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  // Format last order date
  const formatLastOrder = (date?: Date) => {
    if (!date) return '從未下單';
    
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays} 天前`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} 週前`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} 月前`;
    return `${Math.ceil(diffDays / 365)} 年前`;
  };

  // Render trend indicator
  const renderTrend = () => {
    if (!showTrend) return null;

    const trendIcon = activity.trend === 'up' ? TrendingUp : 
                     activity.trend === 'down' ? TrendingDown : Minus;
    const TrendIcon = trendIcon;
    
    const trendColor = activity.trend === 'up' ? 'text-green-500' :
                      activity.trend === 'down' ? 'text-red-500' : 'text-gray-400';

    return (
      <div className="flex items-center space-x-1">
        <TrendIcon className={cn(sizeConfig.icon, trendColor)} />
        <span className={cn(
          sizeConfig.container,
          activity.trend === 'up' ? 'text-green-600' :
          activity.trend === 'down' ? 'text-red-600' : 'text-gray-500'
        )}>
          {activity.trend !== 'stable' && (
            <>
              {activity.trend === 'up' ? '+' : ''}
              {activity.trendScore.toFixed(1)}%
            </>
          )}
        </span>
      </div>
    );
  };

  // Render activity score with progress bar
  const renderScore = () => {
    if (!showScore) return null;

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className={cn(sizeConfig.score, "font-medium text-gray-700")}>
            活躍度
          </span>
          <span className={cn(sizeConfig.score, "font-bold", config.textColor)}>
            {activity.score}
          </span>
        </div>
        <div className={cn("w-full bg-gray-200 rounded-full", sizeConfig.progress)}>
          <div 
            className={cn(config.color, sizeConfig.progress, "rounded-full transition-all duration-300")}
            style={{ width: `${activity.score}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main Activity Badge */}
      <div className="flex items-center space-x-2">
        <div className={cn("rounded-full", sizeConfig.indicator, config.color)} />
        
        {showLabel && (
          <Badge className={cn(config.badgeClass, sizeConfig.badge)}>
            <Icon className={cn(sizeConfig.icon, "mr-1")} />
            {config.label}
          </Badge>
        )}
        
        {showTrend && renderTrend()}
      </div>

      {/* Activity Score */}
      {renderScore()}

      {/* Additional Metrics */}
      <div className={cn("space-y-1", sizeConfig.container, "text-gray-600")}>
        <div className="flex justify-between">
          <span>月訂單頻率:</span>
          <span className="font-medium">{activity.orderFrequency} 次</span>
        </div>
        
        <div className="flex justify-between">
          <span>月營收:</span>
          <span className="font-medium">
            NT$ {(activity.monthlyRevenue / 1000).toFixed(0)}K
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>最後訂單:</span>
          <span className="font-medium">
            {formatLastOrder(activity.lastOrderDate)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Simple Activity Badge Component
// ============================================================================

interface ActivityBadgeProps {
  level: ActivityMetrics['level'];
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ActivityBadge({ 
  level, 
  score, 
  size = 'sm', 
  className 
}: ActivityBadgeProps) {
  const config = ACTIVITY_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <Badge className={cn(config.badgeClass, sizeConfig.badge, className)}>
      <Icon className={cn(sizeConfig.icon, "mr-1")} />
      {config.label}
      {score !== undefined && (
        <span className="ml-1 font-bold">{score}</span>
      )}
    </Badge>
  );
}

// ============================================================================
// Simple Activity Dot Component
// ============================================================================

interface ActivityDotProps {
  level: ActivityMetrics['level'];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export function ActivityDot({ 
  level, 
  size = 'sm', 
  className,
  title 
}: ActivityDotProps) {
  const config = ACTIVITY_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div 
      className={cn(
        "rounded-full", 
        sizeConfig.indicator, 
        config.color,
        className
      )}
      title={title || config.label}
    />
  );
}