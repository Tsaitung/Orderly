// ============================================================================
// Locations Tab Component
// ============================================================================
// Locations and Business Units view with geographic and operational details

'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Building2,
  Clock,
  Truck,
  Star,
  Navigation,
  Phone,
  ChevronDown,
  ChevronRight,
  Search,
  Filter
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

interface LocationsTabProps {
  tree: HierarchyNode[];
  searchResults: SearchResult[];
  filters: FilterOptions;
  sortOptions: SortOptions;
  searchQuery: string;
}

interface EnhancedLocationNode extends HierarchyNode {
  activity?: ActivityMetrics;
  metrics?: CustomerMetrics;
  companyName?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  operatingHours?: string;
  deliveryZone?: string;
  businessUnits?: EnhancedBusinessUnit[];
}

interface EnhancedBusinessUnit {
  id: string;
  name: string;
  type: 'kitchen' | 'bar' | 'bakery' | 'storage' | 'office' | 'other';
  isActive: boolean;
  activity?: ActivityMetrics;
  budget?: number;
  manager?: string;
}

// ============================================================================
// Mock Data Generation
// ============================================================================

const businessUnitTypes = [
  { type: 'kitchen', label: '廚房', icon: '👨‍🍳' },
  { type: 'bar', label: '酒吧', icon: '🍸' },
  { type: 'bakery', label: '烘焙部', icon: '🥖' },
  { type: 'storage', label: '倉庫', icon: '📦' },
  { type: 'office', label: '辦公室', icon: '🏢' },
  { type: 'other', label: '其他', icon: '📋' }
] as const;

const generateMockLocationData = (node: HierarchyNode): EnhancedLocationNode => {
  const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseScore = 40 + (hash % 50);
  
  const level: ActivityMetrics['level'] = 
    baseScore >= 80 ? 'active' :
    baseScore >= 60 ? 'medium' :
    baseScore >= 40 ? 'low' : 'dormant';

  const activity: ActivityMetrics = {
    score: baseScore,
    level,
    lastOrderDate: new Date(Date.now() - (hash % 14) * 24 * 60 * 60 * 1000),
    orderFrequency: Math.max(1, Math.round(baseScore / 8)),
    monthlyRevenue: (baseScore * 500) + (hash % 50000),
    trend: hash % 3 === 0 ? 'up' : hash % 3 === 1 ? 'down' : 'stable',
    trendScore: -10 + (hash % 30)
  };

  const metrics: CustomerMetrics = {
    totalOrders: 10 + (hash % 100),
    monthlyRevenue: 50000 + (hash % 250000),
    avgOrderValue: 800 + (hash % 3000),
    lastOrderDate: new Date(Date.now() - (hash % 7) * 24 * 60 * 60 * 1000),
    orderFrequency: 3 + (hash % 15),
    deliverySuccessRate: 80 + (hash % 20),
    avgDeliveryTime: 1 + (hash % 4)
  };

  // Generate business units
  const numUnits = 1 + (hash % 4);
  const businessUnits: EnhancedBusinessUnit[] = [];
  
  for (let i = 0; i < numUnits; i++) {
    const unitHash = hash + i * 17;
    const unitType = businessUnitTypes[unitHash % businessUnitTypes.length];
    
    businessUnits.push({
      id: `${node.id}-unit-${i}`,
      name: `${unitType.label}${i > 0 ? ` ${i + 1}` : ''}`,
      type: unitType.type as any,
      isActive: (unitHash % 10) > 1, // 80% active
      activity: {
        score: 30 + (unitHash % 60),
        level: (30 + (unitHash % 60)) >= 70 ? 'active' : 
               (30 + (unitHash % 60)) >= 50 ? 'medium' : 'low',
        lastOrderDate: new Date(Date.now() - (unitHash % 7) * 24 * 60 * 60 * 1000),
        orderFrequency: 1 + (unitHash % 8),
        monthlyRevenue: 10000 + (unitHash % 30000),
        trend: unitHash % 3 === 0 ? 'up' : unitHash % 3 === 1 ? 'down' : 'stable',
        trendScore: -5 + (unitHash % 20)
      },
      budget: 20000 + (unitHash % 80000),
      manager: `經理${String.fromCharCode(65 + (unitHash % 26))}`
    });
  }

  // Mock addresses based on major Taiwan cities
  const cities = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市'];
  const districts = ['信義區', '大安區', '中山區', '松山區', '中正區', '板橋區'];
  const city = cities[hash % cities.length];
  const district = districts[hash % districts.length];
  const road = `${String.fromCharCode(65 + (hash % 26))}路`;
  const number = 1 + (hash % 999);
  const floor = 1 + (hash % 20);

  return {
    ...node,
    activity,
    metrics,
    companyName: node.name.replace(/ - .*/, ''), // Extract company name
    address: `${city}${district}${road}${number}號${floor}樓`,
    coordinates: {
      lat: 23.5 + (hash % 400) / 100, // Taiwan latitude range
      lng: 120.0 + (hash % 400) / 100 // Taiwan longitude range
    },
    operatingHours: `${7 + (hash % 3)}:00 - ${20 + (hash % 4)}:00`,
    deliveryZone: `配送區域 ${String.fromCharCode(65 + (hash % 8))}`,
    businessUnits
  };
};

// ============================================================================
// Business Unit Card Component
// ============================================================================

interface BusinessUnitCardProps {
  unit: EnhancedBusinessUnit;
  locationName: string;
}

function BusinessUnitCard({ unit, locationName }: BusinessUnitCardProps) {
  const unitTypeConfig = businessUnitTypes.find(t => t.type === unit.type);
  
  return (
    <Card variant="outlined" colorScheme="gray" className="transition-colors hover:bg-gray-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{unitTypeConfig?.icon}</span>
            <div>
              <h4 className="font-medium text-gray-900">{unit.name}</h4>
              <p className="text-sm text-gray-500">{locationName}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ActivityDot level={unit.activity!.level} size="sm" />
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                unit.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
              )}
            >
              {unit.isActive ? '營運中' : '暫停'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">月預算:</span>
            <span className="ml-1 font-medium">NT$ {unit.budget?.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">負責人:</span>
            <span className="ml-1 font-medium">{unit.manager}</span>
          </div>
          <div>
            <span className="text-gray-500">月營收:</span>
            <span className="ml-1 font-medium">NT$ {(unit.activity!.monthlyRevenue / 1000).toFixed(0)}K</span>
          </div>
          <div>
            <span className="text-gray-500">訂單頻率:</span>
            <span className="ml-1 font-medium">{unit.activity!.orderFrequency} 次/月</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Location Card Component
// ============================================================================

interface LocationCardProps {
  location: EnhancedLocationNode;
  onLocationSelect: (location: HierarchyNode) => void;
  isSelected?: boolean;
}

function LocationCard({ location, onLocationSelect, isSelected }: LocationCardProps) {
  const [showBusinessUnits, setShowBusinessUnits] = useState(false);

  return (
    <Card 
      variant="filled"
      colorScheme="white"
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary-500"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              <Badge variant="secondary" className="text-xs">營業據點</Badge>
              {location.activity!.level === 'active' && (
                <Badge className="text-xs bg-green-100 text-green-800">
                  <Star className="mr-1 h-3 w-3" />
                  熱點
                </Badge>
              )}
            </div>
            
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
              {location.name}
            </CardTitle>
            
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex items-center">
                <Building2 className="mr-1 h-4 w-4" />
                {location.companyName}
              </div>
              <div className="flex items-center">
                <Navigation className="mr-1 h-4 w-4" />
                {location.address}
              </div>
              <div className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                營業時間: {location.operatingHours}
              </div>
            </div>
          </div>
          
          <ActivityDot level={location.activity!.level} size="md" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Activity Status */}
        <div className="flex items-center justify-between mb-4">
          <ActivityBadge 
            level={location.activity!.level} 
            score={location.activity!.score}
            size="sm"
          />
          
          <div className="text-sm text-gray-500">
            配送區域: {location.deliveryZone}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">月營收</div>
            <div className="text-lg font-bold text-gray-900">
              NT$ {(location.metrics!.monthlyRevenue / 1000).toFixed(0)}K
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 mb-1">配送成功率</div>
            <div className="text-lg font-bold text-gray-900">
              {location.metrics!.deliverySuccessRate}%
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 mb-1">平均配送時間</div>
            <div className="text-sm font-medium text-gray-700">
              {location.metrics!.avgDeliveryTime} 小時
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 mb-1">業務單位</div>
            <div className="text-sm font-medium text-gray-700">
              {location.businessUnits?.length || 0} 個單位
            </div>
          </div>
        </div>

        {/* Business Units Toggle */}
        {location.businessUnits && location.businessUnits.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBusinessUnits(!showBusinessUnits)}
              className="w-full justify-between"
            >
              <span>業務單位 ({location.businessUnits.length})</span>
              {showBusinessUnits ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            
            {showBusinessUnits && (
              <div className="mt-3 space-y-2">
                {location.businessUnits.map((unit) => (
                  <BusinessUnitCard
                    key={unit.id}
                    unit={unit}
                    locationName={location.name}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLocationSelect(location)}
            className="w-full"
          >
            查看詳細資料
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Locations Tab Component
// ============================================================================

export default function LocationsTab({
  tree,
  searchResults,
  filters,
  sortOptions,
  searchQuery
}: LocationsTabProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>();

  // Process locations data with mock enhancement
  const enhancedLocations = useMemo<EnhancedLocationNode[]>(() => {
    // Get all locations from the tree (flatten if needed)
    const allLocations: HierarchyNode[] = [];
    
    const collectLocations = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'location') {
          allLocations.push(node);
        }
        if (node.children && node.children.length > 0) {
          collectLocations(node.children);
        }
      });
    };
    
    collectLocations(tree);

    // If searching, filter by search results
    const locations = searchQuery && searchResults.length > 0
      ? searchResults.map(result => result.entity).filter(node => node.type === 'location')
      : allLocations;

    return locations.map(location => generateMockLocationData(location));
  }, [tree, searchResults, searchQuery]);

  // Apply filters
  const filteredLocations = useMemo(() => {
    let result = enhancedLocations;

    // Apply local search
    if (localSearch.trim()) {
      result = result.filter(location => 
        location.name.toLowerCase().includes(localSearch.toLowerCase()) ||
        location.address?.toLowerCase().includes(localSearch.toLowerCase()) ||
        location.companyName?.toLowerCase().includes(localSearch.toLowerCase())
      );
    }

    // Apply activity level filters
    if (filters.activityLevels.length < 4) {
      result = result.filter(location => 
        location.activity && filters.activityLevels.includes(location.activity.level)
      );
    }

    // Apply revenue filters
    if (filters.minRevenue !== undefined) {
      result = result.filter(location => 
        location.metrics && location.metrics.monthlyRevenue >= filters.minRevenue!
      );
    }
    if (filters.maxRevenue !== undefined) {
      result = result.filter(location => 
        location.metrics && location.metrics.monthlyRevenue <= filters.maxRevenue!
      );
    }

    // Apply include inactive filter
    if (!filters.includeInactive) {
      result = result.filter(location => location.isActive);
    }

    return result;
  }, [enhancedLocations, filters, localSearch]);

  const handleLocationSelect = (location: HierarchyNode) => {
    setSelectedLocationId(location.id);
    console.log('Selected location:', location);
  };

  // Calculate total business units
  const totalBusinessUnits = filteredLocations.reduce(
    (sum, location) => sum + (location.businessUnits?.length || 0), 
    0
  );

  return (
    <div className="space-y-6">
      {/* Header with local search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜尋據點名稱、地址、公司..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            顯示 {filteredLocations.length} 個營業據點
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="filled" colorScheme="primary">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary-900">
              {filteredLocations.length}
            </div>
            <div className="text-sm text-primary-700">營業據點</div>
          </CardContent>
        </Card>
        
        <Card variant="filled" colorScheme="green">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-900">
              {filteredLocations.filter(l => l.activity?.level === 'active').length}
            </div>
            <div className="text-sm text-green-700">活躍據點</div>
          </CardContent>
        </Card>
        
        <Card variant="filled" colorScheme="gray">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totalBusinessUnits}
            </div>
            <div className="text-sm text-gray-700">業務單位</div>
          </CardContent>
        </Card>
        
        <Card variant="filled" colorScheme="platform">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-platform-900">
              {Math.round(
                filteredLocations.reduce((sum, l) => sum + (l.metrics?.deliverySuccessRate || 0), 0) / 
                Math.max(1, filteredLocations.length)
              )}%
            </div>
            <div className="text-sm text-platform-700">平均配送成功率</div>
          </CardContent>
        </Card>
      </div>

      {/* Locations Grid */}
      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到營業據點</h3>
            <p className="text-gray-500">請調整篩選條件或搜尋關鍵字</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onLocationSelect={handleLocationSelect}
              isSelected={location.id === selectedLocationId}
            />
          ))}
        </div>
      )}
    </div>
  );
}