'use client'

import React, { useState } from 'react'
import { AccessibleModal } from '@/components/ui/accessible-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { OrderFilterParams } from '@/lib/api/supplier-types'
import {
  Download,
  FileText,
  Table,
  BarChart3,
  Calendar,
  Filter,
  Settings,
  CheckCircle,
  Loader,
  X
} from 'lucide-react'

interface ExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  currentFilters: OrderFilterParams;
  totalOrders: number;
  isExporting?: boolean;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  fields: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  filters: OrderFilterParams;
  includeItems: boolean;
  includeNotes: boolean;
  groupBy?: 'status' | 'customer' | 'date' | 'none';
  summaryStats: boolean;
}

const EXPORT_FORMATS = {
  csv: {
    label: 'CSV 檔案',
    description: '純文字格式，適合數據分析',
    icon: FileText,
    maxRows: 10000,
    features: ['快速處理', '輕量級', '通用格式']
  },
  xlsx: {
    label: 'Excel 檔案',
    description: '完整的試算表格式，包含格式設定',
    icon: Table,
    maxRows: 50000,
    features: ['豐富格式', '公式支援', '圖表功能']
  },
  pdf: {
    label: 'PDF 報告',
    description: '專業報告格式，適合列印和分享',
    icon: BarChart3,
    maxRows: 1000,
    features: ['專業外觀', '列印友善', '安全分享']
  }
};

const AVAILABLE_FIELDS = [
  { key: 'order_number', label: '訂單編號', required: true },
  { key: 'customer_name', label: '客戶名稱', required: true },
  { key: 'status', label: '訂單狀態', required: false },
  { key: 'total_amount_ntd', label: '訂單金額', required: false },
  { key: 'item_count', label: '商品數量', required: false },
  { key: 'created_at', label: '下單時間', required: false },
  { key: 'delivery_date', label: '交貨日期', required: false },
  { key: 'priority', label: '優先級', required: false },
  { key: 'payment_status', label: '付款狀態', required: false },
  { key: 'delivery_address', label: '配送地址', required: false },
  { key: 'contact_person', label: '聯絡人', required: false },
  { key: 'contact_phone', label: '聯絡電話', required: false }
];

const GROUP_BY_OPTIONS = [
  { value: 'none', label: '不分組' },
  { value: 'status', label: '依狀態分組' },
  { value: 'customer', label: '依客戶分組' },
  { value: 'date', label: '依日期分組' }
];

export default function ExportOptionsModal({
  isOpen,
  onClose,
  onExport,
  currentFilters,
  totalOrders,
  isExporting = false
}: ExportOptionsModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [selectedFields, setSelectedFields] = useState<string[]>(
    AVAILABLE_FIELDS.filter(f => f.required).map(f => f.key)
  );
  const [includeItems, setIncludeItems] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [groupBy, setGroupBy] = useState<'status' | 'customer' | 'date' | 'none'>('none');
  const [summaryStats, setSummaryStats] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  const formatConfig = EXPORT_FORMATS[selectedFormat];
  const estimatedRows = Math.min(totalOrders, formatConfig.maxRows);
  const willBeTruncated = totalOrders > formatConfig.maxRows;

  // Handle field selection
  const toggleField = (fieldKey: string) => {
    const field = AVAILABLE_FIELDS.find(f => f.key === fieldKey);
    if (field?.required) return; // 不能取消必要欄位

    setSelectedFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(AVAILABLE_FIELDS.map(f => f.key));
  };

  const selectRequiredFields = () => {
    setSelectedFields(AVAILABLE_FIELDS.filter(f => f.required).map(f => f.key));
  };

  // Handle export
  const handleExport = async () => {
    const options: ExportOptions = {
      format: selectedFormat,
      fields: selectedFields,
      dateRange: dateRange.from && dateRange.to ? dateRange : undefined,
      filters: currentFilters,
      includeItems,
      includeNotes,
      groupBy,
      summaryStats
    };

    try {
      await onExport(options);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
    }
  };

  return (
    <AccessibleModal isOpen={isOpen} onClose={handleClose} title="匯出訂單資料" size="xl" className="max-h-[90vh] overflow-y-auto">
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span className="text-lg font-semibold">匯出訂單資料</span>
        </div>
          {/* Export Format Selection */}
          <div>
            <h3 className="font-medium mb-3">選擇匯出格式</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(EXPORT_FORMATS).map(([format, config]) => {
                const Icon = config.icon;
                const isSelected = selectedFormat === format;

                return (
                  <Card
                    key={format}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFormat(format as any)}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-6 w-6 mt-1 ${
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {config.label}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          isSelected ? 'text-blue-700' : 'text-gray-600'
                        }`}>
                          {config.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {config.features.map(feature => (
                            <Badge 
                              key={feature} 
                              variant="outline" 
                              className={`text-xs ${
                                isSelected ? 'border-blue-300 text-blue-700' : ''
                              }`}
                            >
                              {feature}
                            </Badge>
                          ))}
                        </div>
                        <p className={`text-xs mt-2 ${
                          isSelected ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          最多 {config.maxRows.toLocaleString()} 筆記錄
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {willBeTruncated && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    資料將被截斷：共 {totalOrders.toLocaleString()} 筆，將匯出前 {formatConfig.maxRows.toLocaleString()} 筆
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">選擇欄位</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectRequiredFields}
                >
                  僅必要欄位
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFields}
                >
                  全部欄位
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AVAILABLE_FIELDS.map(field => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedFields.includes(field.key)}
                    onChange={() => toggleField(field.key)}
                    disabled={field.required}
                  />
                  <label className={`text-sm ${
                    field.required ? 'font-medium text-gray-900' : 'text-gray-700'
                  }`}>
                    {field.label}
                    {field.required && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        必要
                      </Badge>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Range */}
            <div>
              <h3 className="font-medium mb-3">日期範圍（選填）</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">開始日期</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">結束日期</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div>
              <h3 className="font-medium mb-3">匯出選項</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeItems}
                    onChange={setIncludeItems}
                  />
                  <label className="text-sm text-gray-700">
                    包含商品明細
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeNotes}
                    onChange={setIncludeNotes}
                  />
                  <label className="text-sm text-gray-700">
                    包含備註說明
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={summaryStats}
                    onChange={setSummaryStats}
                  />
                  <label className="text-sm text-gray-700">
                    包含統計摘要
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">分組方式</label>
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {GROUP_BY_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Current Filters Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">目前的篩選條件</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(currentFilters).map(([key, value]) => {
                if (!value || key === 'page' || key === 'page_size') return null;
                
                return (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                );
              })}
              {Object.keys(currentFilters).filter(k => 
                currentFilters[k] && k !== 'page' && k !== 'page_size'
              ).length === 0 && (
                <span className="text-sm text-gray-500">無篩選條件</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              預計匯出 {estimatedRows.toLocaleString()} 筆記錄
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isExporting}
            >
              取消
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || selectedFields.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  匯出中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  開始匯出
                </>
              )}
            </Button>
          </div>
      </div>
    </AccessibleModal>
  );
}
