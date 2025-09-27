import type {
  SupplierCard,
  SupplierStats as BackendSupplierStats,
} from '@/lib/api/platform-supplier-service'

export interface SupplierSettingsSummary {
  minimumOrderAmount?: number
  paymentTerms?: number
  paymentTermsDisplay?: string
  deliveryZones?: string[]
}

export interface SupplierMetricsSummary {
  qualityScore?: number
  gmvGrowthRate?: number
  ordersGrowthRate?: number
}

export interface SupplierSummary {
  id: string
  name: string
  isActive: boolean
  status?: string
  statusDisplay?: string
  capacityDisplay?: string
  productCount: number
  recentOrderCount: number
  fulfillmentRate: number
  averageDeliveryTime: number
  totalGMV: number
  lastOrderDate: string | null
  activityLevel?: string
  joinDate?: string
  settings?: SupplierSettingsSummary
  metrics?: SupplierMetricsSummary
}

export interface SupplierStatisticsComputed {
  supplierUtilizationRate: number
  averageProductsPerSupplier: number
  averageGMVPerSupplier: number
}

export interface SupplierStatisticsTrends {
  supplierGrowth: number
  gmvGrowth: number
  fulfillmentImprovement: number
}

export interface SupplierStatisticsPeriod {
  start: string
  end: string
  days: number
}

export interface SupplierStatistics {
  totalSuppliers: number
  activeSuppliers: number
  pendingSuppliers: number
  suspendedSuppliers: number
  deactivatedSuppliers: number
  totalGMV: number
  monthlyGMV: number
  averageFulfillmentRate: number
  averageQualityScore: number
  totalOrders: number
  monthlyOrders: number
  capacityDistribution: Record<string, number>
  regionDistribution?: Record<string, number>
  categoryDistribution?: Record<string, number>
  supplierGrowthRate: number
  gmvGrowthRate: number
  ordersGrowthRate: number
  totalProducts?: number
  topSuppliers?: SupplierSummary[]
  computed?: SupplierStatisticsComputed
  trends?: SupplierStatisticsTrends
  period?: SupplierStatisticsPeriod
}

const PAYMENT_TERM_REGEX = /((\d+))/

function parsePaymentTerms(display?: string): number | undefined {
  if (!display) return undefined
  const match = display.match(PAYMENT_TERM_REGEX)
  if (!match || match.length < 2) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function estimateAverageDeliveryDays(activityLevel?: string): number {
  switch (activityLevel) {
    case 'high':
      return 2
    case 'moderate':
      return 3
    case 'low':
      return 5
    default:
      return 4
  }
}

export function mapSupplierCardToSummary(card: SupplierCard): SupplierSummary {
  const settings: SupplierSettingsSummary = {
    minimumOrderAmount: card.minimum_order_amount ?? 0,
    paymentTerms: parsePaymentTerms(card.payment_terms_display),
    paymentTermsDisplay: card.payment_terms_display,
    deliveryZones: [],
  }

  const metrics: SupplierMetricsSummary = {
    qualityScore: card.quality_score ?? 0,
    gmvGrowthRate: card.gmv_growth_rate ?? 0,
    ordersGrowthRate: card.orders_growth_rate ?? 0,
  }

  return {
    id: card.id,
    name: card.name,
    isActive: Boolean(card.is_active),
    status: card.status,
    statusDisplay: card.status_display,
    capacityDisplay: card.capacity_display,
    productCount: Array.isArray(card.product_categories) ? card.product_categories.length : 0,
    recentOrderCount: card.monthly_orders ?? 0,
    fulfillmentRate: Number(card.fulfillment_rate ?? 0),
    averageDeliveryTime: estimateAverageDeliveryDays(card.activity_level),
    totalGMV: Number(card.monthly_gmv ?? 0),
    lastOrderDate: card.last_order_date ? new Date(card.last_order_date).toISOString() : null,
    activityLevel: card.activity_level,
    joinDate: card.join_date ? new Date(card.join_date).toISOString() : undefined,
    settings,
    metrics,
  }
}

export function mapSupplierStats(stats: BackendSupplierStats): SupplierStatistics {
  const totalSuppliers = stats.total_suppliers ?? 0
  const totalProducts = Object.values(stats.category_distribution ?? {}).reduce(
    (acc, value) => acc + (Number(value) || 0),
    0
  )

  const computed: SupplierStatisticsComputed = {
    supplierUtilizationRate:
      totalSuppliers > 0 ? Math.round((stats.active_suppliers / totalSuppliers) * 100) : 0,
    averageProductsPerSupplier:
      totalSuppliers > 0 ? Math.round(totalProducts / totalSuppliers) : 0,
    averageGMVPerSupplier:
      totalSuppliers > 0 ? Math.round((stats.monthly_gmv ?? 0) / totalSuppliers) : 0,
  }

  const trends: SupplierStatisticsTrends = {
    supplierGrowth: stats.supplier_growth_rate ?? 0,
    gmvGrowth: stats.gmv_growth_rate ?? 0,
    fulfillmentImprovement: 0,
  }

  return {
    totalSuppliers,
    activeSuppliers: stats.active_suppliers ?? 0,
    pendingSuppliers: stats.pending_suppliers ?? 0,
    suspendedSuppliers: stats.suspended_suppliers ?? 0,
    deactivatedSuppliers: stats.deactivated_suppliers ?? 0,
    totalGMV: stats.total_gmv ?? 0,
    monthlyGMV: stats.monthly_gmv ?? 0,
    averageFulfillmentRate: stats.avg_fulfillment_rate ?? 0,
    averageQualityScore: stats.avg_quality_score ?? 0,
    totalOrders: stats.total_orders ?? 0,
    monthlyOrders: stats.monthly_orders ?? 0,
    supplierGrowthRate: stats.supplier_growth_rate ?? 0,
    gmvGrowthRate: stats.gmv_growth_rate ?? 0,
    ordersGrowthRate: stats.orders_growth_rate ?? 0,
    capacityDistribution: stats.capacity_distribution ?? {},
    regionDistribution: stats.region_distribution ?? {},
    categoryDistribution: stats.category_distribution ?? {},
    totalProducts,
    topSuppliers: [],
    computed,
    trends,
  }
}
