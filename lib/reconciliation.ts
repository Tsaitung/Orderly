import { prisma } from './db'
import { ReconciliationStatus, Prisma } from '@prisma/client'

export interface ReconciliationEngine {
  processReconciliation(restaurantId: string, supplierId: string, periodStart: Date, periodEnd: Date): Promise<ReconciliationResult>
  calculateConfidenceScore(orderData: OrderMatchData, invoiceData: InvoiceMatchData): number
}

export interface OrderMatchData {
  productCode: string
  orderedQuantity: number
  deliveredQuantity: number
  unitPrice: number
  deliveryDate: Date
}

export interface InvoiceMatchData {
  productCode: string
  billedQuantity: number
  unitPrice: number
  lineTotal: number
}

export interface ReconciliationResult {
  reconciliationId: string
  matchedItems: number
  disputedItems: number
  totalValue: number
  confidenceScore: number
  processingTimeMs: number
}

export interface DiscrepancyDetection {
  type: 'quantity' | 'price' | 'product' | 'date'
  severity: 'low' | 'medium' | 'high'
  description: string
  suggestedAction: string
}

export class AutomatedReconciliationEngine implements ReconciliationEngine {
  private readonly AUTO_APPROVAL_THRESHOLD = 0.95
  private readonly CONFIDENCE_WEIGHTS = {
    quantityMatch: 0.4,
    priceMatch: 0.3,
    deliveryDateMatch: 0.2,
    productCodeMatch: 0.1
  }

  async processReconciliation(
    restaurantId: string, 
    supplierId: string, 
    periodStart: Date, 
    periodEnd: Date
  ): Promise<ReconciliationResult> {
    const startTime = Date.now()
    
    // 1. 獲取期間內的所有訂單
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        supplierId,
        deliveryDate: {
          gte: periodStart,
          lte: periodEnd
        },
        status: {
          in: ['delivered', 'accepted', 'completed']
        }
      },
      include: {
        items: true
      }
    })

    // 2. 為每個訂單項目計算匹配信心分數
    const reconciliationItems = []
    let matchedCount = 0
    let disputedCount = 0
    let totalValue = 0

    for (const order of orders) {
      for (const item of order.items) {
        const confidence = this.calculateConfidenceScore(
          {
            productCode: item.productCode,
            orderedQuantity: Number(item.quantity),
            deliveredQuantity: Number(item.quantity), // 假設送達數量等於訂購數量
            unitPrice: Number(item.unitPrice),
            deliveryDate: order.deliveryDate
          },
          {
            productCode: item.productCode,
            billedQuantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.lineTotal)
          }
        )

        const isMatched = confidence >= this.AUTO_APPROVAL_THRESHOLD
        if (isMatched) {
          matchedCount++
        } else {
          disputedCount++
        }

        totalValue += Number(item.lineTotal)

        reconciliationItems.push({
          orderId: order.id,
          productCode: item.productCode,
          orderedQuantity: Number(item.quantity),
          deliveredQuantity: Number(item.quantity),
          acceptedQuantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.lineTotal),
          discrepancyType: isMatched ? null : 'confidence_low',
          resolutionAction: isMatched ? 'auto_approved' : 'manual_review'
        })
      }
    }

    // 3. 計算總體信心分數
    const overallConfidence = reconciliationItems.length > 0 
      ? reconciliationItems.reduce((sum, item) => {
          return sum + this.calculateItemConfidence(item)
        }, 0) / reconciliationItems.length
      : 0

    // 4. 創建對帳記錄
    const reconciliationNumber = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
    
    const reconciliation = await prisma.reconciliation.create({
      data: {
        reconciliationNumber,
        periodStart,
        periodEnd,
        restaurantId,
        supplierId,
        status: overallConfidence >= this.AUTO_APPROVAL_THRESHOLD 
          ? ReconciliationStatus.approved 
          : ReconciliationStatus.review_required,
        summary: {
          totalOrders: orders.length,
          totalItems: reconciliationItems.length,
          matchedItems: matchedCount,
          disputedItems: disputedCount,
          totalValue,
          processingTime: Date.now() - startTime
        },
        confidenceScore: overallConfidence,
        autoApproved: overallConfidence >= this.AUTO_APPROVAL_THRESHOLD,
        createdBy: 'system', // TODO: 從 context 獲取用戶ID
        items: {
          create: reconciliationItems
        }
      }
    })

    return {
      reconciliationId: reconciliation.id,
      matchedItems: matchedCount,
      disputedItems: disputedCount,
      totalValue,
      confidenceScore: overallConfidence,
      processingTimeMs: Date.now() - startTime
    }
  }

  calculateConfidenceScore(orderData: OrderMatchData, invoiceData: InvoiceMatchData): number {
    // 數量匹配分數
    const quantityMatch = orderData.orderedQuantity === invoiceData.billedQuantity ? 1.0 : 
      Math.max(0, 1 - Math.abs(orderData.orderedQuantity - invoiceData.billedQuantity) / orderData.orderedQuantity)

    // 價格匹配分數
    const priceMatch = orderData.unitPrice === invoiceData.unitPrice ? 1.0 :
      Math.max(0, 1 - Math.abs(orderData.unitPrice - invoiceData.unitPrice) / orderData.unitPrice)

    // 產品代碼匹配分數
    const productCodeMatch = orderData.productCode === invoiceData.productCode ? 1.0 : 0.0

    // 交期匹配分數 (假設在合理範圍內)
    const deliveryDateMatch = 1.0 // 簡化處理

    // 加權計算總信心分數
    return (
      quantityMatch * this.CONFIDENCE_WEIGHTS.quantityMatch +
      priceMatch * this.CONFIDENCE_WEIGHTS.priceMatch +
      deliveryDateMatch * this.CONFIDENCE_WEIGHTS.deliveryDateMatch +
      productCodeMatch * this.CONFIDENCE_WEIGHTS.productCodeMatch
    )
  }

  private calculateItemConfidence(item: any): number {
    // 基於項目數據計算信心分數的簡化版本
    const quantityMatch = item.orderedQuantity === item.deliveredQuantity ? 1.0 : 0.8
    const priceConsistency = 1.0 // 假設價格一致
    return (quantityMatch + priceConsistency) / 2
  }

  detectDiscrepancies(orderData: OrderMatchData, invoiceData: InvoiceMatchData): DiscrepancyDetection[] {
    const discrepancies: DiscrepancyDetection[] = []

    // 數量差異檢測
    if (orderData.orderedQuantity !== invoiceData.billedQuantity) {
      const difference = Math.abs(orderData.orderedQuantity - invoiceData.billedQuantity)
      const severity = difference > orderData.orderedQuantity * 0.1 ? 'high' : 'medium'
      
      discrepancies.push({
        type: 'quantity',
        severity,
        description: `數量不符：訂購 ${orderData.orderedQuantity}，實際計費 ${invoiceData.billedQuantity}`,
        suggestedAction: '請確認實際交貨數量並調整計費'
      })
    }

    // 價格差異檢測
    if (Math.abs(orderData.unitPrice - invoiceData.unitPrice) > 0.01) {
      const percentDiff = Math.abs(orderData.unitPrice - invoiceData.unitPrice) / orderData.unitPrice
      const severity = percentDiff > 0.1 ? 'high' : percentDiff > 0.05 ? 'medium' : 'low'
      
      discrepancies.push({
        type: 'price',
        severity,
        description: `價格不符：訂購價格 $${orderData.unitPrice}，計費價格 $${invoiceData.unitPrice}`,
        suggestedAction: '請確認價格政策並協調調整'
      })
    }

    // 產品代碼檢測
    if (orderData.productCode !== invoiceData.productCode) {
      discrepancies.push({
        type: 'product',
        severity: 'high',
        description: `產品代碼不符：訂購 ${orderData.productCode}，計費 ${invoiceData.productCode}`,
        suggestedAction: '請確認產品規格並重新匹配'
      })
    }

    return discrepancies
  }
}

export const reconciliationEngine = new AutomatedReconciliationEngine()