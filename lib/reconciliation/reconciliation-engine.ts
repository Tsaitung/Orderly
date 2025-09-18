/**
 * 對帳引擎 - 30分鐘內完成自動化對帳
 * 支持多維度差異檢測和置信度評分
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface MatchResult {
  orderId: string
  deliveryId: string
  confidence: number
  discrepancies: Discrepancy[]
  autoResolvable: boolean
}

export interface Discrepancy {
  type: 'quantity' | 'price' | 'product' | 'quality'
  severity: 'low' | 'medium' | 'high'
  description: string
  expectedValue: any
  actualValue: any
  suggestedResolution?: string
}

export interface Resolution {
  discrepancyType: string
  action: 'approve' | 'adjust' | 'reject' | 'manual_review'
  adjustmentAmount?: number
  notes?: string
}

/**
 * 對帳引擎核心類別
 */
export class ReconciliationEngine {
  /**
   * 自動匹配算法
   */
  async autoMatch(orders: any[], deliveries: any[]): Promise<MatchResult[]> {
    const matches: MatchResult[] = []
    
    for (const order of orders) {
      const bestMatch = this.findBestDeliveryMatch(order, deliveries)
      if (bestMatch) {
        const matchResult = await this.analyzeMatch(order, bestMatch)
        matches.push(matchResult)
      }
    }
    
    return matches
  }
  
  /**
   * 置信度評分 (0-1.0)
   */
  calculateConfidence(matchResult: MatchResult): number {
    let score = 1.0
    
    // 根據差異降低置信度
    for (const discrepancy of matchResult.discrepancies) {
      switch (discrepancy.severity) {
        case 'low':
          score -= 0.05
          break
        case 'medium':
          score -= 0.15
          break
        case 'high':
          score -= 0.30
          break
      }
    }
    
    return Math.max(0, score)
  }
  
  /**
   * 差異檢測
   */
  detectDiscrepancies(order: any, delivery: any): Discrepancy[] {
    const discrepancies: Discrepancy[] = []
    
    // 數量差異檢測
    for (const orderItem of order.items) {
      const deliveryItem = delivery.items.find((item: any) => 
        item.productCode === orderItem.productCode
      )
      
      if (deliveryItem) {
        if (orderItem.quantity !== deliveryItem.quantity) {
          discrepancies.push({
            type: 'quantity',
            severity: this.calculateQuantitySeverity(orderItem.quantity, deliveryItem.quantity),
            description: `產品 ${orderItem.productCode} 數量不符`,
            expectedValue: orderItem.quantity,
            actualValue: deliveryItem.quantity,
            suggestedResolution: '按實際交付數量調整'
          })
        }
        
        // 價格差異檢測
        if (Math.abs(orderItem.unitPrice - deliveryItem.unitPrice) > 0.01) {
          discrepancies.push({
            type: 'price',
            severity: this.calculatePriceSeverity(orderItem.unitPrice, deliveryItem.unitPrice),
            description: `產品 ${orderItem.productCode} 單價不符`,
            expectedValue: orderItem.unitPrice,
            actualValue: deliveryItem.unitPrice,
            suggestedResolution: '確認價格調整原因'
          })
        }
      } else {
        discrepancies.push({
          type: 'product',
          severity: 'high',
          description: `訂購產品 ${orderItem.productCode} 未交付`,
          expectedValue: orderItem,
          actualValue: null,
          suggestedResolution: '聯繫供應商確認缺貨原因'
        })
      }
    }
    
    return discrepancies
  }
  
  /**
   * 自動解決策略
   */
  autoResolve(discrepancies: Discrepancy[]): Resolution[] {
    return discrepancies.map(discrepancy => {
      switch (discrepancy.type) {
        case 'quantity':
          if (discrepancy.severity === 'low') {
            return {
              discrepancyType: discrepancy.type,
              action: 'approve',
              notes: '數量差異在可接受範圍內'
            }
          }
          break
          
        case 'price':
          if (discrepancy.severity === 'low') {
            return {
              discrepancyType: discrepancy.type,
              action: 'approve',
              notes: '價格差異在可接受範圍內'
            }
          }
          break
      }
      
      return {
        discrepancyType: discrepancy.type,
        action: 'manual_review',
        notes: '需要人工審核'
      }
    })
  }
  
  /**
   * 處理訂單對帳
   */
  async processOrder(organizationId: string, orderId: string): Promise<void> {
    // 暫時實現，實際會包含完整的對帳邏輯
    console.log(`Processing reconciliation for order ${orderId}`)
  }
  
  // 私有輔助方法
  
  private findBestDeliveryMatch(order: any, deliveries: any[]): any | null {
    // 實現匹配邏輯
    return deliveries.find(delivery => 
      delivery.orderNumber === order.orderNumber ||
      delivery.orderId === order.id
    )
  }
  
  private async analyzeMatch(order: any, delivery: any): Promise<MatchResult> {
    const discrepancies = this.detectDiscrepancies(order, delivery)
    const autoResolvable = discrepancies.every(d => d.severity === 'low')
    
    return {
      orderId: order.id,
      deliveryId: delivery.id,
      confidence: 0.95, // 簡化實現
      discrepancies,
      autoResolvable
    }
  }
  
  private calculateQuantitySeverity(expected: number, actual: number): 'low' | 'medium' | 'high' {
    const diff = Math.abs(expected - actual) / expected
    if (diff < 0.05) return 'low'
    if (diff < 0.15) return 'medium'
    return 'high'
  }
  
  private calculatePriceSeverity(expected: number, actual: number): 'low' | 'medium' | 'high' {
    const diff = Math.abs(expected - actual) / expected
    if (diff < 0.02) return 'low'
    if (diff < 0.10) return 'medium'
    return 'high'
  }
}

// 導出單例實例
export const reconciliationEngine = new ReconciliationEngine()