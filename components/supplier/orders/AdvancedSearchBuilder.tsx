'use client'

import React, { useState, useCallback } from 'react'
import { formatDateOnly } from '@/lib/date'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { OrderFilterParams, OrderStatus } from '@/lib/api/supplier-types'
import {
  Search,
  Plus,
  X,
  Filter,
  Calendar,
  DollarSign,
  User,
  Package,
  Clock,
  Save,
  RefreshCw
} from 'lucide-react'

interface SearchCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | Date;
  label: string;
}

interface AdvancedSearchBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: OrderFilterParams) => void;
  currentFilters: OrderFilterParams;
}

const SEARCH_FIELDS = {
  order_number: {
    label: '訂單編號',
    type: 'text',
    icon: Package,
    operators: [
      { value: 'contains', label: '包含' },
      { value: 'equals', label: '等於' },
      { value: 'starts_with', label: '開頭是' },
      { value: 'ends_with', label: '結尾是' }
    ]
  },
  customer_name: {
    label: '客戶名稱',
    type: 'text',
    icon: User,
    operators: [
      { value: 'contains', label: '包含' },
      { value: 'equals', label: '等於' },
      { value: 'starts_with', label: '開頭是' }
    ]
  },
  status: {
    label: '訂單狀態',
    type: 'select',
    icon: Clock,
    operators: [
      { value: 'equals', label: '等於' },
      { value: 'in', label: '屬於' }
    ],
    options: [
      { value: 'pending', label: '待處理' },
      { value: 'confirmed', label: '已確認' },
      { value: 'preparing', label: '備貨中' },
      { value: 'ready_for_pickup', label: '待取貨' },
      { value: 'in_transit', label: '配送中' },
      { value: 'delivered', label: '已送達' },
      { value: 'cancelled', label: '已取消' },
      { value: 'disputed', label: '有爭議' }
    ]
  },
  total_amount_ntd: {
    label: '訂單金額',
    type: 'number',
    icon: DollarSign,
    operators: [
      { value: 'equals', label: '等於' },
      { value: 'greater_than', label: '大於' },
      { value: 'less_than', label: '小於' },
      { value: 'between', label: '介於' }
    ]
  },
  created_at: {
    label: '下單日期',
    type: 'date',
    icon: Calendar,
    operators: [
      { value: 'equals', label: '等於' },
      { value: 'after', label: '之後' },
      { value: 'before', label: '之前' },
      { value: 'between', label: '介於' }
    ]
  },
  delivery_date: {
    label: '配送日期',
    type: 'date',
    icon: Calendar,
    operators: [
      { value: 'equals', label: '等於' },
      { value: 'after', label: '之後' },
      { value: 'before', label: '之前' },
      { value: 'between', label: '介於' }
    ]
  },
  priority: {
    label: '優先級',
    type: 'select',
    icon: Package,
    operators: [
      { value: 'equals', label: '等於' },
      { value: 'in', label: '屬於' }
    ],
    options: [
      { value: 'low', label: '低' },
      { value: 'normal', label: '一般' },
      { value: 'high', label: '高' },
      { value: 'urgent', label: '緊急' }
    ]
  }
};

const PRESET_FILTERS = [
  {
    id: 'pending_orders',
    name: '待處理訂單',
    description: '所有需要確認的訂單',
    conditions: [
      { field: 'status', operator: 'equals', value: 'pending' }
    ]
  },
  {
    id: 'urgent_orders',
    name: '緊急訂單',
    description: '高優先級且未完成的訂單',
    conditions: [
      { field: 'priority', operator: 'in', value: ['high', 'urgent'] },
      { field: 'status', operator: 'in', value: ['pending', 'confirmed', 'preparing'] }
    ]
  },
  {
    id: 'large_orders',
    name: '大額訂單',
    description: '金額超過10萬的訂單',
    conditions: [
      { field: 'total_amount_ntd', operator: 'greater_than', value: 100000 }
    ]
  },
  {
    id: 'recent_orders',
    name: '近期訂單',
    description: '最近7天的訂單',
    conditions: [
      { field: 'created_at', operator: 'after', value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    ]
  },
  {
    id: 'delivery_today',
    name: '今日配送',
    description: '今天需要配送的訂單',
    conditions: [
      { field: 'delivery_date', operator: 'equals', value: new Date() },
      { field: 'status', operator: 'in', value: ['ready_for_pickup', 'in_transit'] }
    ]
  }
];

export default function AdvancedSearchBuilder({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters
}: AdvancedSearchBuilderProps) {
  const [conditions, setConditions] = useState<SearchCondition[]>([]);
  const [searchName, setSearchName] = useState('');

  // Add new condition
  const addCondition = () => {
    const newCondition: SearchCondition = {
      id: Date.now().toString(),
      field: 'order_number',
      operator: 'contains',
      value: '',
      label: ''
    };
    setConditions([...conditions, newCondition]);
  };

  // Remove condition
  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  // Update condition
  const updateCondition = (id: string, updates: Partial<SearchCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  // Apply preset filter
  const applyPreset = (preset: typeof PRESET_FILTERS[0]) => {
    const newConditions = preset.conditions.map((condition, index) => ({
      id: `preset_${Date.now()}_${index}`,
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
      label: `${SEARCH_FIELDS[condition.field]?.label} ${condition.operator} ${condition.value}`
    }));
    setConditions(newConditions);
    setSearchName(preset.name);
  };

  // Convert conditions to API filters
  const convertToApiFilters = useCallback((): OrderFilterParams => {
    const filters: OrderFilterParams = { ...currentFilters };

    conditions.forEach(condition => {
      const field = condition.field;
      const value = condition.value;
      const operator = condition.operator;

      switch (field) {
        case 'order_number':
          if (operator === 'contains') {
            filters.search_query = value as string;
          }
          break;
        
        case 'customer_name':
          if (operator === 'contains') {
            filters.search_query = value as string;
          }
          break;
        
        case 'status':
          if (operator === 'equals') {
            filters.status = value as OrderStatus;
          } else if (operator === 'in' && Array.isArray(value)) {
            filters.status = value[0] as OrderStatus; // API might not support multiple statuses
          }
          break;
        
        case 'priority':
          if (operator === 'equals') {
            filters.priority = value as string;
          }
          break;
        
        case 'total_amount_ntd':
          // Custom filter for amount ranges
          break;
        
        case 'created_at':
        case 'delivery_date':
          if (operator === 'after' || operator === 'equals') {
            if (field === 'created_at') {
              filters.date_from = value instanceof Date ? formatDateOnly(value) : value as string;
            }
          } else if (operator === 'before') {
            if (field === 'created_at') {
              filters.date_to = value instanceof Date ? formatDateOnly(value) : value as string;
            }
          }
          break;
      }
    });

    return filters;
  }, [conditions, currentFilters]);

  // Apply filters
  const handleApplyFilters = () => {
    const apiFilters = convertToApiFilters();
    onApplyFilters(apiFilters);
    onClose();
  };

  // Clear all conditions
  const clearConditions = () => {
    setConditions([]);
    setSearchName('');
  };

  // Render condition form
  const renderConditionForm = (condition: SearchCondition) => {
    const fieldConfig = SEARCH_FIELDS[condition.field];
    if (!fieldConfig) return null;

    const Icon = fieldConfig.icon;

    return (
      <div key={condition.id} className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg bg-gray-50">
        {/* Field Selection */}
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">欄位</label>
          <select
            value={condition.field}
            onChange={(e) => updateCondition(condition.id, { 
              field: e.target.value,
              operator: SEARCH_FIELDS[e.target.value]?.operators[0]?.value || 'equals',
              value: ''
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {Object.entries(SEARCH_FIELDS).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* Operator Selection */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">條件</label>
          <select
            value={condition.operator}
            onChange={(e) => updateCondition(condition.id, { operator: e.target.value, value: '' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            {fieldConfig.operators.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        {/* Value Input */}
        <div className="col-span-6">
          <label className="block text-xs font-medium text-gray-700 mb-1">值</label>
          {fieldConfig.type === 'select' ? (
            <select
              value={condition.value as string}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">請選擇...</option>
              {fieldConfig.options?.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : fieldConfig.type === 'date' ? (
            <input
              type="date"
              value={condition.value instanceof Date ? formatDateOnly(condition.value) : condition.value as string}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          ) : fieldConfig.type === 'number' ? (
            <input
              type="number"
              value={condition.value as number}
              onChange={(e) => updateCondition(condition.id, { value: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="輸入數字..."
            />
          ) : (
            <input
              type="text"
              value={condition.value as string}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="輸入搜尋值..."
            />
          )}
        </div>

        {/* Remove Button */}
        <div className="col-span-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeCondition(condition.id)}
            className="w-full h-10 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AccessibleModal isOpen={isOpen} onClose={onClose} title={"高級搜索建構器"} size="xl" className="max-h-[90vh] overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Search className="h-6 w-6" />
          <span className="text-lg font-semibold">高級搜索建構器</span>
        </div>
          {/* Preset Filters */}
          <div>
            <h3 className="font-medium mb-3">預設篩選條件</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESET_FILTERS.map(preset => (
                <Card 
                  key={preset.id} 
                  className="p-3 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors"
                  onClick={() => applyPreset(preset)}
                >
                  <h4 className="font-medium text-sm">{preset.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{preset.description}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Search Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              搜索名稱 (選填)
            </label>
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="為這個搜索條件命名..."
              className="max-w-md"
            />
          </div>

          {/* Search Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">搜索條件</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearConditions}
                  disabled={conditions.length === 0}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  清空
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新增條件
                </Button>
              </div>
            </div>

            {conditions.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2">
                <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="font-medium text-gray-600 mb-2">尚未設定搜索條件</h4>
                <p className="text-sm text-gray-500 mb-4">
                  點擊「新增條件」開始建立您的搜索條件，或選擇上方的預設篩選條件
                </p>
                <Button onClick={addCondition} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  新增第一個條件
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {conditions.map(renderConditionForm)}
              </div>
            )}
          </div>

          {/* Summary */}
          {conditions.length > 0 && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">搜索條件摘要</h4>
              <div className="flex flex-wrap gap-2">
                {conditions.map(condition => {
                  const fieldConfig = SEARCH_FIELDS[condition.field];
                  const operatorLabel = fieldConfig?.operators.find(op => op.value === condition.operator)?.label;
                  
                  return (
                    <Badge key={condition.id} variant="outline" className="text-blue-700 border-blue-300">
                      {fieldConfig?.label} {operatorLabel} {String(condition.value)}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button 
              onClick={handleApplyFilters}
              disabled={conditions.length === 0}
            >
              <Search className="h-4 w-4 mr-2" />
              套用搜索條件
            </Button>
          </div>
      </div>
    </AccessibleModal>
  );
}
