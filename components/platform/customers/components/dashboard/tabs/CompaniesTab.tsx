// ============================================================================
// Companies Tab Component
// ============================================================================
// Company table view with detailed business information and metrics

'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Building2,
  MapPin,
  Users,
  Calendar,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  MoreHorizontal,
  Search,
  ArrowUpDown
} from 'lucide-react';

import { ActivityBadge, ActivityDot } from '../shared/ActivityIndicator';

import type { 
  HierarchyNode,
  SearchResult,
  FilterOptions,
  SortOptions,
  ActivityMetrics,
  CustomerMetrics
} from '../../../types';

// ============================================================================
// Types
// ============================================================================

interface CompaniesTabProps {
  tree: HierarchyNode[];
  searchResults: SearchResult[];
  filters: FilterOptions;
  sortOptions: SortOptions;
  searchQuery: string;
}

interface EnhancedCompanyNode extends HierarchyNode {
  activity?: ActivityMetrics;
  metrics?: CustomerMetrics;
  groupName?: string;
  taxId?: string;
  contactInfo?: {
    phone: string;
    email: string;
    address: string;
  };
}

type ViewMode = 'table' | 'cards';

// ============================================================================
// Mock Data Generation
// ============================================================================

const generateMockCompanyData = (node: HierarchyNode): EnhancedCompanyNode => {
  const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseScore = 40 + (hash % 50);
  
  const level: ActivityMetrics['level'] = 
    baseScore >= 80 ? 'active' :
    baseScore >= 60 ? 'medium' :
    baseScore >= 40 ? 'low' : 'dormant';

  const activity: ActivityMetrics = {
    score: baseScore,
    level,
    lastOrderDate: new Date(Date.now() - (hash % 30) * 24 * 60 * 60 * 1000),
    orderFrequency: Math.max(1, Math.round(baseScore / 10)),
    monthlyRevenue: (baseScore * 1000) + (hash % 100000),
    trend: hash % 3 === 0 ? 'up' : hash % 3 === 1 ? 'down' : 'stable',
    trendScore: -10 + (hash % 30)
  };

  const metrics: CustomerMetrics = {
    totalOrders: 20 + (hash % 200),
    monthlyRevenue: 100000 + (hash % 500000),
    avgOrderValue: 1000 + (hash % 5000),
    lastOrderDate: new Date(Date.now() - (hash % 7) * 24 * 60 * 60 * 1000),
    orderFrequency: 5 + (hash % 20),
    deliverySuccessRate: 85 + (hash % 15),
    avgDeliveryTime: 2 + (hash % 6)
  };

  // Generate mock tax ID
  const taxId = `${Math.floor(10000000 + (hash % 90000000))}`;

  return {
    ...node,
    activity,
    metrics,
    groupName: node.name.split(' ')[0] + '集團',
    taxId,
    contactInfo: {
      phone: `02-${Math.floor(1000 + (hash % 9000))}-${Math.floor(1000 + (hash % 9000))}`,
      email: `contact@${node.name.toLowerCase().replace(/\s/g, '')}.com.tw`,
      address: `台北市信義區信義路${hash % 100}號${Math.floor(1 + hash % 20)}樓`
    }
  };
};

// ============================================================================
// Table View Component
// ============================================================================

interface CompaniesTableProps {
  companies: EnhancedCompanyNode[];
  onCompanySelect: (company: HierarchyNode) => void;
}

function CompaniesTable({ companies, onCompanySelect }: CompaniesTableProps) {
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-TW');
          break;
        case 'revenue':
          comparison = (a.metrics?.monthlyRevenue || 0) - (b.metrics?.monthlyRevenue || 0);
          break;
        case 'activity':
          comparison = (a.activity?.score || 0) - (b.activity?.score || 0);
          break;
        case 'locations':
          comparison = a.childrenCount - b.childrenCount;
          break;
        case 'lastOrder':
          const aDate = a.activity?.lastOrderDate?.getTime() || 0;
          const bDate = b.activity?.lastOrderDate?.getTime() || 0;
          comparison = aDate - bDate;
          break;
      }
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [companies, sortField, sortDirection]);

  if (companies.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到公司資料</h3>
          <p className="text-gray-500">請調整篩選條件或搜尋關鍵字</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>公司名稱</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    活躍狀態
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('revenue')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>月營收</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('locations')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>營業據點</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    聯絡資訊
                  </span>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('lastOrder')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>最後訂單</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-6 py-3 text-right">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {company.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {company.groupName} • 統編: {company.taxId}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <ActivityDot level={company.activity!.level} size="sm" />
                      <ActivityBadge 
                        level={company.activity!.level} 
                        score={company.activity!.score}
                        size="sm"
                      />
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      NT$ {(company.metrics!.monthlyRevenue / 1000).toFixed(0)}K
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      {company.activity!.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : company.activity!.trend === 'down' ? (
                        <TrendingUp className="h-3 w-3 text-red-500 rotate-180 mr-1" />
                      ) : null}
                      {company.activity!.trend !== 'stable' && (
                        <span className={cn(
                          company.activity!.trend === 'up' ? "text-green-600" : "text-red-600"
                        )}>
                          {company.activity!.trend === 'up' ? '+' : ''}
                          {company.activity!.trendScore.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      {company.childrenCount} 個據點
                    </div>
                    <div className="text-sm text-gray-500">
                      配送成功率: {company.metrics!.deliverySuccessRate}%
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <Phone className="h-3 w-3 text-gray-400 mr-1" />
                        {company.contactInfo!.phone}
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Mail className="h-3 w-3 text-gray-400 mr-1" />
                        {company.contactInfo!.email}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                      {company.activity!.lastOrderDate ? 
                        new Date(company.activity!.lastOrderDate).toLocaleDateString('zh-TW') : 
                        '從未訂購'
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      月頻率: {company.activity!.orderFrequency} 次
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCompanySelect(company)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Companies Tab Component
// ============================================================================

export default function CompaniesTab({
  tree,
  searchResults,
  filters,
  sortOptions,
  searchQuery
}: CompaniesTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [localSearch, setLocalSearch] = useState('');

  // Process companies data with mock enhancement
  const enhancedCompanies = useMemo<EnhancedCompanyNode[]>(() => {
    // Get all companies from the tree (flatten if needed)
    const allCompanies: HierarchyNode[] = [];
    
    const collectCompanies = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'company') {
          allCompanies.push(node);
        }
        if (node.children && node.children.length > 0) {
          collectCompanies(node.children);
        }
      });
    };
    
    collectCompanies(tree);

    // If searching, filter by search results
    const companies = searchQuery && searchResults.length > 0
      ? searchResults.map(result => result.entity).filter(node => node.type === 'company')
      : allCompanies;

    return companies.map(company => generateMockCompanyData(company));
  }, [tree, searchResults, searchQuery]);

  // Apply filters
  const filteredCompanies = useMemo(() => {
    let result = enhancedCompanies;

    // Apply local search
    if (localSearch.trim()) {
      result = result.filter(company => 
        company.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        company.taxId?.includes(localSearch) ||
        company.contactInfo?.email.toLowerCase().includes(localSearch.toLowerCase())
      );
    }

    // Apply activity level filters
    if (filters.activityLevels.length < 4) {
      result = result.filter(company => 
        company.activity && filters.activityLevels.includes(company.activity.level)
      );
    }

    // Apply revenue filters
    if (filters.minRevenue !== undefined) {
      result = result.filter(company => 
        company.metrics && company.metrics.monthlyRevenue >= filters.minRevenue!
      );
    }
    if (filters.maxRevenue !== undefined) {
      result = result.filter(company => 
        company.metrics && company.metrics.monthlyRevenue <= filters.maxRevenue!
      );
    }

    // Apply include inactive filter
    if (!filters.includeInactive) {
      result = result.filter(company => company.isActive);
    }

    return result;
  }, [enhancedCompanies, filters, localSearch]);

  const handleCompanySelect = (company: HierarchyNode) => {
    console.log('Selected company:', company);
    // In real implementation, this would navigate to company details
  };

  return (
    <div className="space-y-6">
      {/* Header with local search and view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜尋公司名稱、統編、聯絡資訊..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            顯示 {filteredCompanies.length} 間公司
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="filled" colorScheme="primary">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary-900">
              {filteredCompanies.length}
            </div>
            <div className="text-sm text-primary-700">公司總數</div>
          </CardContent>
        </Card>
        
        <Card variant="filled" colorScheme="green">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900">
              {filteredCompanies.filter(c => c.activity?.level === 'active').length}
            </div>
            <div className="text-sm text-green-700">活躍公司</div>
          </CardContent>
        </Card>
        
        <Card variant="filled" colorScheme="gray">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {filteredCompanies.reduce((sum, c) => sum + c.childrenCount, 0)}
            </div>
            <div className="text-sm text-gray-700">營業據點</div>
          </CardContent>
        </Card>
        
        <Card variant="filled" colorScheme="platform">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-platform-900">
              NT$ {Math.round(
                filteredCompanies.reduce((sum, c) => sum + (c.metrics?.monthlyRevenue || 0), 0) / 1000
              )}K
            </div>
            <div className="text-sm text-platform-700">總月營收</div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <CompaniesTable
        companies={filteredCompanies}
        onCompanySelect={handleCompanySelect}
      />
    </div>
  );
}