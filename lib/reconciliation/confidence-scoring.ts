// TODO: Replace data access with Order Service FastAPI client
import { CacheService } from '@/lib/redis'
import type {
  MatchResult,
  OrderLineItem,
  DeliveryItem,
  InvoiceItem,
  Discrepancy,
} from './matching-algorithm'

export interface ConfidenceFactors {
  // 基礎匹配因子
  productMatch: number // 產品匹配度 (0-1)
  priceMatch: number // 價格匹配度 (0-1)
  quantityMatch: number // 數量匹配度 (0-1)
  dateMatch: number // 日期匹配度 (0-1)

  // 歷史數據因子
  supplierReliability: number // 供應商可靠度 (0-1)
  productHistory: number // 產品歷史記錄 (0-1)
  seasonalPattern: number // 季節性模式 (0-1)

  // 業務邏輯因子
  orderComplexity: number // 訂單複雜度影響 (0-1)
  marketVolatility: number // 市場波動性 (0-1)
  customerTier: number // 客戶等級影響 (0-1)
}

export interface ConfidenceWeights {
  // 基礎權重
  productMatch: number // 預設: 0.25
  priceMatch: number // 預設: 0.20
  quantityMatch: number // 預設: 0.20
  dateMatch: number // 預設: 0.10

  // 進階權重
  supplierReliability: number // 預設: 0.10
  productHistory: number // 預設: 0.05
  seasonalPattern: number // 預設: 0.03
  orderComplexity: number // 預設: 0.03
  marketVolatility: number // 預設: 0.02
  customerTier: number // 預設: 0.02
}

export interface HistoricalPattern {
  supplierId: string
  productCode: string
  averageDeliveryDelay: number
  priceVariabilityPercent: number
  quantityAccuracyRate: number
  totalOrders: number
  disputeRate: number
  lastUpdated: Date
}

export interface SeasonalFactor {
  productCategory: string
  month: number
  priceVolatilityFactor: number
  supplyReliabilityFactor: number
  demandPattern: 'low' | 'normal' | 'high' | 'peak'
}

export interface SupplierProfile {
  id: string
  reliabilityScore: number // 0-1
  averageResponseTime: number // 小時
  orderFulfillmentRate: number // 0-1
  priceConsistency: number // 0-1
  qualityScore: number // 0-1
  totalOrdersProcessed: number
  disputeResolutionRate: number // 0-1
  lastEvaluated: Date
}

export class AdvancedConfidenceScoring {
  private static readonly DEFAULT_WEIGHTS: ConfidenceWeights = {
    productMatch: 0.25,
    priceMatch: 0.2,
    quantityMatch: 0.2,
    dateMatch: 0.1,
    supplierReliability: 0.1,
    productHistory: 0.05,
    seasonalPattern: 0.03,
    orderComplexity: 0.03,
    marketVolatility: 0.02,
    customerTier: 0.02,
  }

  constructor(private weights: ConfidenceWeights = AdvancedConfidenceScoring.DEFAULT_WEIGHTS) {}

  /**
   * 獲取供應商歷史可靠度
   */
  async getSupplierReliability(supplierId: string): Promise<number> {
    try {
      // 先嘗試從快取獲取
      const cacheKey = `supplier:reliability:${supplierId}`
      const cached = await CacheService.get<number>(cacheKey)
      if (cached !== null) {
        return cached
      }

      // 計算過去6個月的供應商表現
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      // Replace with API aggregation via order-service
      /* const orderStats = await prisma.order.aggregate({
        where: {
          supplierId,
          createdAt: {
            gte: sixMonthsAgo
          }
        },
        _count: true
      }) */

      /* const reconciliationStats = await prisma.reconciliation.aggregate({
        where: {
          supplierId,
          createdAt: {
            gte: sixMonthsAgo
          }
        },
        _count: {
          id: true
        },
        _avg: {
          confidenceScore: true
        }
      }) */

      /* const disputedReconciliations = await prisma.reconciliation.count({
        where: {
          supplierId,
          status: 'disputed',
          createdAt: {
            gte: sixMonthsAgo
          }
        }
      }) */

      // 計算可靠度分數
      let reliabilityScore = 0.5 // 基礎分數

      if (orderStats._count > 0) {
        // 基於平均信心分數 (40% 權重)
        const avgConfidence = reconciliationStats._avg.confidenceScore || 0.5
        reliabilityScore += (avgConfidence - 0.5) * 0.4

        // 基於爭議率 (30% 權重)
        const disputeRate = disputedReconciliations / Math.max(reconciliationStats._count.id, 1)
        reliabilityScore += (1 - disputeRate) * 0.3

        // 基於訂單量 (30% 權重) - 更多數據通常意味著更可靠的統計
        const orderVolumeFactor = Math.min(orderStats._count / 100, 1) // 100單以上視為充分數據
        reliabilityScore += orderVolumeFactor * 0.3
      }

      // 確保分數在 0-1 範圍內
      reliabilityScore = Math.max(0, Math.min(1, reliabilityScore))

      // 快取結果 (1小時)
      await CacheService.set(cacheKey, reliabilityScore, 3600)

      return reliabilityScore
    } catch (error) {
      console.error('Error calculating supplier reliability:', error)
      return 0.5 // 預設中等可靠度
    }
  }

  /**
   * 獲取產品歷史模式
   */
  async getProductHistoryScore(productCode: string, supplierId: string): Promise<number> {
    try {
      const cacheKey = `product:history:${supplierId}:${productCode}`
      const cached = await CacheService.get<number>(cacheKey)
      if (cached !== null) {
        return cached
      }

      // 查詢過去3個月的產品交易記錄
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      /* const productOrders = await prisma.orderItem.findMany({
        where: {
          productCode,
          order: {
            supplierId,
            createdAt: {
              gte: threeMonthsAgo
            }
          }
        },
        include: {
          order: true
        }
      }) */

      if (productOrders.length === 0) {
        return 0.3 // 新產品，較低信心
      }

      // 計算價格穩定性
      const prices = productOrders.map(item => Number(item.unitPrice))
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
      const priceVariance =
        prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length
      const priceStability = Math.max(0, 1 - Math.sqrt(priceVariance) / avgPrice)

      // 計算交易頻率分數
      const transactionFrequency = Math.min(productOrders.length / 30, 1) // 30次交易視為高頻

      // 計算時間一致性 (是否規律下單)
      const orderDates = productOrders.map(item => item.order.createdAt.getTime()).sort()
      let timeConsistency = 1
      if (orderDates.length > 1) {
        const intervals = []
        for (let i = 1; i < orderDates.length; i++) {
          intervals.push(orderDates[i] - orderDates[i - 1])
        }
        const avgInterval =
          intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
        const intervalVariance =
          intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
          intervals.length
        timeConsistency = Math.max(0.3, 1 - Math.sqrt(intervalVariance) / avgInterval)
      }

      // 綜合分數
      const historyScore = priceStability * 0.4 + transactionFrequency * 0.3 + timeConsistency * 0.3

      // 快取結果 (30分鐘)
      await CacheService.set(cacheKey, historyScore, 1800)

      return historyScore
    } catch (error) {
      console.error('Error calculating product history score:', error)
      return 0.5
    }
  }

  /**
   * 獲取季節性調整因子
   */
  async getSeasonalAdjustment(
    productName: string,
    currentDate: Date = new Date()
  ): Promise<number> {
    const month = currentDate.getMonth() + 1 // 1-12

    // 預定義的季節性模式
    const seasonalPatterns: Record<string, Record<number, number>> = {
      // 蔬菜類：夏季價格波動大
      蔬菜: {
        1: 0.8,
        2: 0.8,
        3: 0.9,
        4: 0.9,
        5: 0.7,
        6: 0.6,
        7: 0.5,
        8: 0.5,
        9: 0.6,
        10: 0.8,
        11: 0.9,
        12: 0.8,
      },
      // 海鮮類：春節前後價格不穩定
      海鮮: {
        1: 0.6,
        2: 0.5,
        3: 0.8,
        4: 0.9,
        5: 0.9,
        6: 0.8,
        7: 0.8,
        8: 0.8,
        9: 0.8,
        10: 0.8,
        11: 0.7,
        12: 0.6,
      },
      // 肉類：較穩定
      肉類: {
        1: 0.8,
        2: 0.8,
        3: 0.8,
        4: 0.8,
        5: 0.8,
        6: 0.8,
        7: 0.8,
        8: 0.8,
        9: 0.8,
        10: 0.8,
        11: 0.8,
        12: 0.7,
      },
      // 預設模式
      default: {
        1: 0.8,
        2: 0.8,
        3: 0.8,
        4: 0.8,
        5: 0.8,
        6: 0.8,
        7: 0.8,
        8: 0.8,
        9: 0.8,
        10: 0.8,
        11: 0.8,
        12: 0.8,
      },
    }

    // 判斷產品類別
    let category = 'default'
    if (productName.includes('蔬菜') || productName.includes('青菜')) {
      category = '蔬菜'
    } else if (
      productName.includes('海鮮') ||
      productName.includes('魚') ||
      productName.includes('蝦')
    ) {
      category = '海鮮'
    } else if (
      productName.includes('肉') ||
      productName.includes('牛') ||
      productName.includes('豬') ||
      productName.includes('雞')
    ) {
      category = '肉類'
    }

    return seasonalPatterns[category][month] || 0.8
  }

  /**
   * 計算訂單複雜度影響
   */
  calculateOrderComplexity(orderItem: OrderLineItem, totalOrderItems: number): number {
    let complexityScore = 1.0

    // 大批量訂單通常更準確
    if (orderItem.orderedQuantity > 100) {
      complexityScore += 0.1
    } else if (orderItem.orderedQuantity < 5) {
      complexityScore -= 0.1
    }

    // 複雜訂單 (多項目) 可能有更高的錯誤率
    if (totalOrderItems > 20) {
      complexityScore -= 0.1
    } else if (totalOrderItems > 50) {
      complexityScore -= 0.2
    }

    // 高價值訂單通常處理更仔細
    if (orderItem.lineTotal > 10000) {
      complexityScore += 0.1
    }

    return Math.max(0, Math.min(1, complexityScore))
  }

  /**
   * 獲取客戶等級調整因子
   */
  async getCustomerTierAdjustment(restaurantId: string): Promise<number> {
    try {
      const cacheKey = `customer:tier:${restaurantId}`
      const cached = await CacheService.get<number>(cacheKey)
      if (cached !== null) {
        return cached
      }

      // 計算客戶等級基於歷史訂單量和準確度
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      /* const customerStats = await prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: {
            gte: threeMonthsAgo
          }
        },
        _count: true,
        _sum: {
          totalAmount: true
        }
      }) */

      const totalOrders = customerStats._count
      const totalValue = Number(customerStats._sum.totalAmount || 0)

      let tierScore = 0.5 // 基礎分數

      // 基於訂單量調整
      if (totalOrders > 50) {
        tierScore += 0.2 // VIP客戶
      } else if (totalOrders > 20) {
        tierScore += 0.1 // 重要客戶
      }

      // 基於訂單金額調整
      if (totalValue > 500000) {
        tierScore += 0.2 // 高價值客戶
      } else if (totalValue > 200000) {
        tierScore += 0.1 // 中等價值客戶
      }

      // 確保在範圍內
      tierScore = Math.max(0.3, Math.min(1, tierScore))

      // 快取結果 (1天)
      await CacheService.set(cacheKey, tierScore, 86400)

      return tierScore
    } catch (error) {
      console.error('Error calculating customer tier adjustment:', error)
      return 0.5
    }
  }

  /**
   * 計算市場波動性影響
   */
  getMarketVolatilityFactor(productName: string, currentDate: Date = new Date()): number {
    // 基於外部因素的簡化波動性模型
    const volatileKeywords = ['油', '燃料', '進口', '有機', '高級']
    const stableKeywords = ['罐頭', '冷凍', '乾貨', '調味料']

    let volatilityScore = 0.8 // 基礎穩定度

    if (volatileKeywords.some(keyword => productName.includes(keyword))) {
      volatilityScore -= 0.2
    }

    if (stableKeywords.some(keyword => productName.includes(keyword))) {
      volatilityScore += 0.1
    }

    // 考慮特殊時期 (例如年節前後)
    const month = currentDate.getMonth() + 1
    if (month === 1 || month === 2 || month === 12) {
      volatilityScore -= 0.1 // 年節期間價格較不穩定
    }

    return Math.max(0.3, Math.min(1, volatilityScore))
  }

  /**
   * 綜合信心分數計算
   */
  async calculateAdvancedConfidenceScore(
    matchResult: MatchResult,
    totalOrderItems: number
  ): Promise<number> {
    const factors: ConfidenceFactors = {
      // 基礎因子來自匹配結果
      productMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'product'),
      priceMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'price'),
      quantityMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'quantity'),
      dateMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'date'),

      // 歷史數據因子
      supplierReliability: await this.getSupplierReliability(matchResult.orderItem.supplierId),
      productHistory: await this.getProductHistoryScore(
        matchResult.orderItem.productCode,
        matchResult.orderItem.supplierId
      ),
      seasonalPattern: await this.getSeasonalAdjustment(matchResult.orderItem.productName),

      // 業務邏輯因子
      orderComplexity: this.calculateOrderComplexity(matchResult.orderItem, totalOrderItems),
      marketVolatility: this.getMarketVolatilityFactor(matchResult.orderItem.productName),
      customerTier: await this.getCustomerTierAdjustment(matchResult.orderItem.restaurantId),
    }

    // 加權計算最終分數
    let weightedScore = 0
    let totalWeight = 0

    for (const [factor, weight] of Object.entries(this.weights)) {
      const factorValue = factors[factor as keyof ConfidenceFactors]
      if (factorValue !== undefined) {
        weightedScore += factorValue * weight
        totalWeight += weight
      }
    }

    // 正規化分數
    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0

    // 確保分數在合理範圍內
    return Math.max(0, Math.min(1, finalScore))
  }

  /**
   * 從差異中提取因子分數
   */
  private extractFactorFromDiscrepancies(discrepancies: Discrepancy[], type: string): number {
    const relevantDiscrepancy = discrepancies.find(d => d.type === type)

    if (!relevantDiscrepancy) {
      return 1.0 // 沒有差異表示完美匹配
    }

    // 基於差異嚴重程度計算分數
    switch (relevantDiscrepancy.severity) {
      case 'low':
        return 0.9
      case 'medium':
        return 0.7
      case 'high':
        return 0.4
      case 'critical':
        return 0.1
      default:
        return 0.8
    }
  }

  /**
   * 生成信心分數詳細報告
   */
  async generateConfidenceReport(
    matchResult: MatchResult,
    totalOrderItems: number
  ): Promise<{
    finalScore: number
    factors: ConfidenceFactors
    weights: ConfidenceWeights
    recommendations: string[]
  }> {
    const factors: ConfidenceFactors = {
      productMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'product'),
      priceMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'price'),
      quantityMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'quantity'),
      dateMatch: this.extractFactorFromDiscrepancies(matchResult.discrepancies, 'date'),
      supplierReliability: await this.getSupplierReliability(matchResult.orderItem.supplierId),
      productHistory: await this.getProductHistoryScore(
        matchResult.orderItem.productCode,
        matchResult.orderItem.supplierId
      ),
      seasonalPattern: await this.getSeasonalAdjustment(matchResult.orderItem.productName),
      orderComplexity: this.calculateOrderComplexity(matchResult.orderItem, totalOrderItems),
      marketVolatility: this.getMarketVolatilityFactor(matchResult.orderItem.productName),
      customerTier: await this.getCustomerTierAdjustment(matchResult.orderItem.restaurantId),
    }

    const finalScore = await this.calculateAdvancedConfidenceScore(matchResult, totalOrderItems)

    const recommendations: string[] = []

    // 基於各因子生成建議
    if (factors.supplierReliability < 0.6) {
      recommendations.push('建議增加對此供應商的監控頻率')
    }

    if (factors.productHistory < 0.5) {
      recommendations.push('建議建立此產品的歷史價格監控')
    }

    if (factors.seasonalPattern < 0.6) {
      recommendations.push('注意季節性因素對價格的影響')
    }

    if (finalScore < 0.7) {
      recommendations.push('建議人工審查此筆對帳')
    } else if (finalScore > 0.95) {
      recommendations.push('建議自動核准此筆對帳')
    }

    return {
      finalScore,
      factors,
      weights: this.weights,
      recommendations,
    }
  }
}

export default AdvancedConfidenceScoring
