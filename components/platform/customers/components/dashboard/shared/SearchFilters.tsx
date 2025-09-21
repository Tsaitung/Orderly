// ============================================================================
// Search Filters Component
// ============================================================================
// Advanced filtering interface for Customer Hierarchy Dashboard

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  Building2,
  MapPin,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

import type { 
  FilterOptions, 
  SortOptions, 
  HierarchyNodeType,
  ActivityMetrics 
} from '../../../types';

// ============================================================================
// Types
// ============================================================================

interface SearchFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  sortOptions: SortOptions;
  onSortChange: (options: SortOptions) => void;
  className?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const NODE_TYPE_OPTIONS = [
  { value: 'group', label: '客戶集團', icon: Users },
  { value: 'company', label: '公司', icon: Building2 },
  { value: 'location', label: '營業據點', icon: MapPin },
  { value: 'business_unit', label: '業務單位', icon: Briefcase }
] as const;

const ACTIVITY_LEVEL_OPTIONS = [
  { value: 'active', label: '活躍', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: '中等', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'low', label: '低活躍', color: 'bg-orange-100 text-orange-800' },
  { value: 'dormant', label: '休眠', color: 'bg-red-100 text-red-800' }
] as const;

const SORT_FIELD_OPTIONS = [
  { value: 'name', label: '名稱' },
  { value: 'revenue', label: '營收' },
  { value: 'orders', label: '訂單數' },
  { value: 'activity', label: '活躍度' },
  { value: 'lastOrder', label: '最後訂單' },
  { value: 'createdAt', label: '建立時間' }
] as const;

// ============================================================================
// Component Implementation
// ============================================================================

export default function SearchFilters({
  filters,
  onFiltersChange,
  sortOptions,
  onSortChange,
  className
}: SearchFiltersProps) {
  
  // Handle node type selection
  const handleNodeTypeChange = (type: HierarchyNodeType, checked: boolean) => {
    const newTypes = checked 
      ? [...filters.types, type]
      : filters.types.filter(t => t !== type);
    
    onFiltersChange({
      ...filters,
      types: newTypes
    });
  };

  // Handle activity level selection
  const handleActivityLevelChange = (level: ActivityMetrics['level'], checked: boolean) => {
    const newLevels = checked
      ? [...filters.activityLevels, level]
      : filters.activityLevels.filter(l => l !== level);
    
    onFiltersChange({
      ...filters,
      activityLevels: newLevels
    });
  };

  // Handle revenue range changes
  const handleRevenueChange = (field: 'minRevenue' | 'maxRevenue', value: string) => {
    const numericValue = value ? parseFloat(value) : undefined;
    onFiltersChange({
      ...filters,
      [field]: numericValue
    });
  };

  // Handle date range changes
  const handleDateRangeChange = (field: 'start' | 'end', date: Date | undefined) => {
    const currentRange = filters.dateRange || { start: new Date(), end: new Date() };
    onFiltersChange({
      ...filters,
      dateRange: {
        ...currentRange,
        [field]: date || new Date()
      }
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      types: ['group', 'company', 'location', 'business_unit'],
      activityLevels: ['active', 'medium', 'low', 'dormant'],
      includeInactive: false
    });
  };

  // Check if any filters are applied
  const hasFiltersApplied = 
    filters.types.length < 4 ||
    filters.activityLevels.length < 4 ||
    filters.minRevenue !== undefined ||
    filters.maxRevenue !== undefined ||
    filters.dateRange !== undefined ||
    filters.includeInactive;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">篩選條件</h3>
        {hasFiltersApplied && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearAllFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="mr-1 h-3 w-3" />
            清除全部
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Node Type Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">客戶類型</Label>
          <div className="space-y-2">
            {NODE_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isChecked = filters.types.includes(option.value);
              
              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => 
                      handleNodeTypeChange(option.value, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`type-${option.value}`}
                    className="flex items-center text-sm text-gray-600 cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Level Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">活躍程度</Label>
          <div className="space-y-2">
            {ACTIVITY_LEVEL_OPTIONS.map((option) => {
              const isChecked = filters.activityLevels.includes(option.value);
              
              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`activity-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => 
                      handleActivityLevelChange(option.value, checked as boolean)
                    }
                  />
                  <Label 
                    htmlFor={`activity-${option.value}`}
                    className="flex items-center text-sm cursor-pointer"
                  >
                    <Badge className={cn("mr-2 text-xs", option.color)}>
                      {option.label}
                    </Badge>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">營收範圍 (月)</Label>
          <div className="space-y-2">
            <div>
              <Label htmlFor="min-revenue" className="text-xs text-gray-500">最低金額</Label>
              <Input
                id="min-revenue"
                type="number"
                placeholder="0"
                value={filters.minRevenue || ''}
                onChange={(e) => handleRevenueChange('minRevenue', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="max-revenue" className="text-xs text-gray-500">最高金額</Label>
              <Input
                id="max-revenue"
                type="number"
                placeholder="無限制"
                value={filters.maxRevenue || ''}
                onChange={(e) => handleRevenueChange('maxRevenue', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">日期範圍</Label>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-gray-500">開始日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
                      !filters.dateRange?.start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.start ? (
                      format(filters.dateRange.start, "yyyy/MM/dd", { locale: zhTW })
                    ) : (
                      "選擇開始日期"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange?.start}
                    onSelect={(date) => handleDateRangeChange('start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <Label className="text-xs text-gray-500">結束日期</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal text-sm",
                      !filters.dateRange?.end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.end ? (
                      format(filters.dateRange.end, "yyyy/MM/dd", { locale: zhTW })
                    ) : (
                      "選擇結束日期"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.dateRange?.end}
                    onSelect={(date) => handleDateRangeChange('end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Options */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200">
        {/* Include Inactive */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-inactive"
            checked={filters.includeInactive}
            onCheckedChange={(checked) => 
              onFiltersChange({ ...filters, includeInactive: checked as boolean })
            }
          />
          <Label htmlFor="include-inactive" className="text-sm text-gray-600 cursor-pointer">
            包含停用的客戶
          </Label>
        </div>

        {/* Sort Options */}
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium text-gray-700">排序:</Label>
          <Select
            value={sortOptions.field}
            onValueChange={(value) => 
              onSortChange({ ...sortOptions, field: value as SortOptions['field'] })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_FIELD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => 
              onSortChange({ 
                ...sortOptions, 
                direction: sortOptions.direction === 'asc' ? 'desc' : 'asc' 
              })
            }
            className="px-2"
          >
            {sortOptions.direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}