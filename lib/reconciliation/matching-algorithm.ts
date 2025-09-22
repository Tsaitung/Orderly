// TODO: Replace data access with Order Service FastAPI client
import { CacheService } from '@/lib/redis'

export interface OrderLineItem {
  id: string
  orderNumber: string
  productCode: string
  productName: string
  orderedQuantity: number
  unitPrice: number
  lineTotal: number
  deliveryDate: Date
  supplierId: string
  restaurantId: string
}

export interface DeliveryItem {
  deliveryNumber: string
  productCode: string
  productName: string
  deliveredQuantity: number
  unitPrice: number
  actualPrice?: number
  deliveredDate: Date
  batchNumber?: string
  expiryDate?: Date
}

export interface InvoiceItem {
  invoiceNumber: string
  productCode: string
  productName: string
  billedQuantity: number
  unitPrice: number
  lineTotal: number
  invoiceDate: Date
  taxAmount?: number
}

export interface MatchResult {
  orderItem: OrderLineItem
  deliveryItem?: DeliveryItem
  invoiceItem?: InvoiceItem
  matchType: 'perfect' | 'partial' | 'disputed' | 'missing'
  confidenceScore: number
  discrepancies: Discrepancy[]
  suggestedActions: string[]
  metadata: Record<string, any>
}

export interface Discrepancy {
  type: 'quantity' | 'price' | 'product' | 'date' | 'missing'
  field: string
  expected: any
  actual: any
  variance: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  autoResolvable: boolean
}

export interface MatchingConfig {
  // Price tolerance settings
  priceTolerancePercent: number // Default: 3%
  freshProducePriceTolerancePercent: number // Default: 5%

  // Quantity tolerance settings
  quantityTolerancePercent: number // Default: 2%
  minimumQuantityVariance: number // Default: 0.1

  // Date validation settings
  deliveryDateToleranceDays: number // Default: 2
  invoiceDateToleranceDays: number // Default: 7

  // Product matching settings
  productNameSimilarityThreshold: number // Default: 0.8
  productCodeStrictMatching: boolean // Default: true

  // Auto-approval thresholds
  autoApprovalThreshold: number // Default: 0.95
  manualReviewThreshold: number // Default: 0.7

  // ML model settings
  useHistoricalLearning: boolean // Default: true
  supplierSpecificRules: boolean // Default: true
}

export class FuzzyMatchingEngine {
  private static readonly DEFAULT_CONFIG: MatchingConfig = {
    priceTolerancePercent: 3,
    freshProducePriceTolerancePercent: 5,
    quantityTolerancePercent: 2,
    minimumQuantityVariance: 0.1,
    deliveryDateToleranceDays: 2,
    invoiceDateToleranceDays: 7,
    productNameSimilarityThreshold: 0.8,
    productCodeStrictMatching: true,
    autoApprovalThreshold: 0.95,
    manualReviewThreshold: 0.7,
    useHistoricalLearning: true,
    supplierSpecificRules: true,
  }

  constructor(private config: MatchingConfig = FuzzyMatchingEngine.DEFAULT_CONFIG) {}

  /**
   * 計算 Levenshtein 距離用於產品名稱相似度比較
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1]
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // substitution
            matrix[j][i - 1] + 1, // insertion
            matrix[j - 1][i] + 1 // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * 計算字串相似度 (0-1)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1

    const cleanStr1 = str1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim()
    const cleanStr2 = str2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim()

    if (cleanStr1 === cleanStr2) return 1

    const maxLength = Math.max(cleanStr1.length, cleanStr2.length)
    const distance = this.calculateLevenshteinDistance(cleanStr1, cleanStr2)

    return 1 - distance / maxLength
  }

  /**
   * 產品匹配分數計算
   */
  private calculateProductMatchScore(
    orderItem: OrderLineItem,
    comparisonItem: DeliveryItem | InvoiceItem
  ): number {
    let score = 0
    let weightSum = 0

    // 產品代碼匹配 (權重: 60%)
    if (this.config.productCodeStrictMatching) {
      if (orderItem.productCode === comparisonItem.productCode) {
        score += 0.6
      }
      weightSum += 0.6
    } else {
      // 模糊匹配產品代碼
      const codeSimilarity = this.calculateStringSimilarity(
        orderItem.productCode,
        comparisonItem.productCode
      )
      score += codeSimilarity * 0.6
      weightSum += 0.6
    }

    // 產品名稱匹配 (權重: 40%)
    const nameSimilarity = this.calculateStringSimilarity(
      orderItem.productName,
      comparisonItem.productName
    )
    score += nameSimilarity * 0.4
    weightSum += 0.4

    return weightSum > 0 ? score / weightSum : 0
  }

  /**
   * 價格匹配分數計算
   */
  private calculatePriceMatchScore(
    orderItem: OrderLineItem,
    comparisonItem: DeliveryItem | InvoiceItem
  ): number {
    const orderPrice = orderItem.unitPrice
    const comparisonPrice = comparisonItem.unitPrice

    if (orderPrice === comparisonPrice) return 1

    // 判斷是否為生鮮產品 (可以通過產品類別或名稱關鍵字判斷)
    const isFreshProduce = this.isFreshProduce(orderItem.productName)
    const tolerancePercent = isFreshProduce
      ? this.config.freshProducePriceTolerancePercent
      : this.config.priceTolerancePercent

    const priceDifference = Math.abs(orderPrice - comparisonPrice)
    const toleranceAmount = orderPrice * (tolerancePercent / 100)

    if (priceDifference <= toleranceAmount) {
      // 在容許範圍內，根據差異大小給分
      return 1 - (priceDifference / toleranceAmount) * 0.3 // 最多扣30%分數
    }

    // 超出容許範圍，但不是完全不匹配
    const maxReasonableDifference = orderPrice * 0.2 // 20%差異
    if (priceDifference <= maxReasonableDifference) {
      return 0.5 - (priceDifference / maxReasonableDifference) * 0.4
    }

    return 0.1 // 最低分數
  }

  /**
   * 數量匹配分數計算
   */
  private calculateQuantityMatchScore(
    orderItem: OrderLineItem,
    deliveryItem: DeliveryItem
  ): number {
    const orderedQty = orderItem.orderedQuantity
    const deliveredQty = deliveryItem.deliveredQuantity

    if (orderedQty === deliveredQty) return 1

    const quantityDifference = Math.abs(orderedQty - deliveredQty)

    // 檢查是否在最小容許變動範圍內
    if (quantityDifference <= this.config.minimumQuantityVariance) {
      return 0.95
    }

    // 計算百分比差異
    const percentageDifference = (quantityDifference / orderedQty) * 100

    if (percentageDifference <= this.config.quantityTolerancePercent) {
      return 1 - (percentageDifference / this.config.quantityTolerancePercent) * 0.2
    }

    // 超出容許範圍但仍可接受的情況
    if (percentageDifference <= 10) {
      return 0.6 - (percentageDifference / 10) * 0.4
    }

    return 0.2 // 最低分數
  }

  /**
   * 日期匹配分數計算
   */
  private calculateDateMatchScore(
    orderItem: OrderLineItem,
    comparisonItem: DeliveryItem | InvoiceItem
  ): number {
    const orderDate = orderItem.deliveryDate
    const comparisonDate =
      'deliveredDate' in comparisonItem ? comparisonItem.deliveredDate : comparisonItem.invoiceDate

    const daysDifference = Math.abs(
      (orderDate.getTime() - comparisonDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const toleranceDays =
      'deliveredDate' in comparisonItem
        ? this.config.deliveryDateToleranceDays
        : this.config.invoiceDateToleranceDays

    if (daysDifference === 0) return 1
    if (daysDifference <= toleranceDays) {
      return 1 - (daysDifference / toleranceDays) * 0.3
    }

    // 超出容許範圍但仍在合理範圍內
    const maxReasonableDays = toleranceDays * 2
    if (daysDifference <= maxReasonableDays) {
      return 0.4 - (daysDifference / maxReasonableDays) * 0.3
    }

    return 0.1
  }

  /**
   * 判斷是否為生鮮產品
   */
  private isFreshProduce(productName: string): boolean {
    const freshKeywords = ['新鮮', '生鮮', '海鮮', '蔬菜', '水果', '肉類', '魚', '蝦', '蟹', '貝類']
    return freshKeywords.some(keyword => productName.includes(keyword))
  }

  /**
   * 綜合匹配分數計算
   */
  calculateOverallMatchScore(
    orderItem: OrderLineItem,
    deliveryItem?: DeliveryItem,
    invoiceItem?: InvoiceItem
  ): number {
    if (!deliveryItem && !invoiceItem) return 0

    let totalScore = 0
    let scoreCount = 0

    // 與送貨單匹配
    if (deliveryItem) {
      const productScore = this.calculateProductMatchScore(orderItem, deliveryItem)
      const priceScore = this.calculatePriceMatchScore(orderItem, deliveryItem)
      const quantityScore = this.calculateQuantityMatchScore(orderItem, deliveryItem)
      const dateScore = this.calculateDateMatchScore(orderItem, deliveryItem)

      // 加權平均 (產品40%, 價格25%, 數量25%, 日期10%)
      const deliveryScore =
        productScore * 0.4 + priceScore * 0.25 + quantityScore * 0.25 + dateScore * 0.1
      totalScore += deliveryScore
      scoreCount++
    }

    // 與發票匹配
    if (invoiceItem) {
      const productScore = this.calculateProductMatchScore(orderItem, invoiceItem)
      const priceScore = this.calculatePriceMatchScore(orderItem, invoiceItem)
      const dateScore = this.calculateDateMatchScore(orderItem, invoiceItem)

      // 發票沒有數量比較，調整權重 (產品50%, 價格35%, 日期15%)
      const invoiceScore = productScore * 0.5 + priceScore * 0.35 + dateScore * 0.15
      totalScore += invoiceScore
      scoreCount++
    }

    return scoreCount > 0 ? totalScore / scoreCount : 0
  }

  /**
   * 檢測差異
   */
  detectDiscrepancies(
    orderItem: OrderLineItem,
    deliveryItem?: DeliveryItem,
    invoiceItem?: InvoiceItem
  ): Discrepancy[] {
    const discrepancies: Discrepancy[] = []

    if (deliveryItem) {
      // 數量差異
      if (
        Math.abs(orderItem.orderedQuantity - deliveryItem.deliveredQuantity) >
        this.config.minimumQuantityVariance
      ) {
        const variance =
          ((deliveryItem.deliveredQuantity - orderItem.orderedQuantity) /
            orderItem.orderedQuantity) *
          100
        discrepancies.push({
          type: 'quantity',
          field: 'deliveredQuantity',
          expected: orderItem.orderedQuantity,
          actual: deliveryItem.deliveredQuantity,
          variance: Math.abs(variance),
          severity: Math.abs(variance) > 10 ? 'high' : Math.abs(variance) > 5 ? 'medium' : 'low',
          description: `送貨數量 ${deliveryItem.deliveredQuantity} 與訂購數量 ${orderItem.orderedQuantity} 不符`,
          autoResolvable: Math.abs(variance) <= this.config.quantityTolerancePercent,
        })
      }

      // 價格差異
      const priceDifference = Math.abs(orderItem.unitPrice - deliveryItem.unitPrice)
      const priceVariancePercent = (priceDifference / orderItem.unitPrice) * 100

      if (priceVariancePercent > this.config.priceTolerancePercent) {
        discrepancies.push({
          type: 'price',
          field: 'unitPrice',
          expected: orderItem.unitPrice,
          actual: deliveryItem.unitPrice,
          variance: priceVariancePercent,
          severity:
            priceVariancePercent > 15 ? 'critical' : priceVariancePercent > 10 ? 'high' : 'medium',
          description: `送貨單價 $${deliveryItem.unitPrice} 與訂購單價 $${orderItem.unitPrice} 差異 ${priceVariancePercent.toFixed(1)}%`,
          autoResolvable: false,
        })
      }

      // 產品差異
      const productSimilarity = this.calculateStringSimilarity(
        orderItem.productName,
        deliveryItem.productName
      )
      if (productSimilarity < this.config.productNameSimilarityThreshold) {
        discrepancies.push({
          type: 'product',
          field: 'productName',
          expected: orderItem.productName,
          actual: deliveryItem.productName,
          variance: (1 - productSimilarity) * 100,
          severity: productSimilarity < 0.5 ? 'critical' : 'medium',
          description: `送貨商品 "${deliveryItem.productName}" 與訂購商品 "${orderItem.productName}" 不符`,
          autoResolvable: false,
        })
      }
    }

    if (invoiceItem) {
      // 發票價格與訂單價格比較
      const invoicePriceDifference = Math.abs(orderItem.unitPrice - invoiceItem.unitPrice)
      const invoicePriceVariancePercent = (invoicePriceDifference / orderItem.unitPrice) * 100

      if (invoicePriceVariancePercent > this.config.priceTolerancePercent) {
        discrepancies.push({
          type: 'price',
          field: 'invoiceUnitPrice',
          expected: orderItem.unitPrice,
          actual: invoiceItem.unitPrice,
          variance: invoicePriceVariancePercent,
          severity:
            invoicePriceVariancePercent > 15
              ? 'critical'
              : invoicePriceVariancePercent > 10
                ? 'high'
                : 'medium',
          description: `發票單價 $${invoiceItem.unitPrice} 與訂購單價 $${orderItem.unitPrice} 差異 ${invoicePriceVariancePercent.toFixed(1)}%`,
          autoResolvable: false,
        })
      }
    }

    return discrepancies
  }

  /**
   * 生成解決建議
   */
  generateSuggestedActions(discrepancies: Discrepancy[], orderItem: OrderLineItem): string[] {
    const actions: string[] = []

    for (const discrepancy of discrepancies) {
      switch (discrepancy.type) {
        case 'quantity':
          if (discrepancy.severity === 'low' && discrepancy.autoResolvable) {
            actions.push('系統建議：接受數量差異，更新庫存記錄')
          } else {
            actions.push('人工處理：聯繫供應商確認實際送貨數量')
            actions.push('記錄差異原因並更新驗收標準')
          }
          break

        case 'price':
          if (discrepancy.severity === 'critical') {
            actions.push('緊急處理：暫停付款，立即聯繫供應商核對價格')
          } else {
            actions.push('價格核對：確認是否有促銷活動或合約調整')
          }
          break

        case 'product':
          actions.push('產品確認：核對實際送達商品是否符合訂購規格')
          actions.push('考慮建立產品代碼對照表')
          break

        case 'date':
          actions.push('檢查送貨時程安排，評估是否影響營運')
          break

        default:
          actions.push('詳細檢查並記錄差異原因')
      }
    }

    if (actions.length === 0) {
      actions.push('系統建議：自動核准此筆對帳')
    }

    return [...new Set(actions)] // 去除重複建議
  }

  /**
   * 主要匹配函數
   */
  async performMatching(
    orderItems: OrderLineItem[],
    deliveryItems: DeliveryItem[],
    invoiceItems: InvoiceItem[]
  ): Promise<MatchResult[]> {
    const results: MatchResult[] = []

    for (const orderItem of orderItems) {
      // 尋找最佳匹配的送貨項目
      let bestDeliveryMatch: DeliveryItem | undefined
      let bestDeliveryScore = 0

      for (const deliveryItem of deliveryItems) {
        const score = this.calculateOverallMatchScore(orderItem, deliveryItem)
        if (score > bestDeliveryScore) {
          bestDeliveryScore = score
          bestDeliveryMatch = deliveryItem
        }
      }

      // 尋找最佳匹配的發票項目
      let bestInvoiceMatch: InvoiceItem | undefined
      let bestInvoiceScore = 0

      for (const invoiceItem of invoiceItems) {
        const score = this.calculateOverallMatchScore(orderItem, undefined, invoiceItem)
        if (score > bestInvoiceScore) {
          bestInvoiceScore = score
          bestInvoiceMatch = invoiceItem
        }
      }

      // 計算最終分數
      const finalScore = this.calculateOverallMatchScore(
        orderItem,
        bestDeliveryMatch,
        bestInvoiceMatch
      )

      // 檢測差異
      const discrepancies = this.detectDiscrepancies(orderItem, bestDeliveryMatch, bestInvoiceMatch)

      // 決定匹配類型
      let matchType: MatchResult['matchType']
      if (finalScore >= this.config.autoApprovalThreshold) {
        matchType = 'perfect'
      } else if (finalScore >= this.config.manualReviewThreshold) {
        matchType = 'partial'
      } else if (finalScore > 0.3) {
        matchType = 'disputed'
      } else {
        matchType = 'missing'
      }

      // 生成建議動作
      const suggestedActions = this.generateSuggestedActions(discrepancies, orderItem)

      results.push({
        orderItem,
        deliveryItem: bestDeliveryMatch,
        invoiceItem: bestInvoiceMatch,
        matchType,
        confidenceScore: finalScore,
        discrepancies,
        suggestedActions,
        metadata: {
          processedAt: new Date(),
          algorithmVersion: '1.0',
          config: this.config,
        },
      })
    }

    return results
  }
}

export default FuzzyMatchingEngine
