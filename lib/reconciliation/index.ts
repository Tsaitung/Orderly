/**
 * 對帳引擎主入口文件
 * 導出對帳相關的核心功能
 */

import { matchingAlgorithm } from './matching-algorithm'
import { confidenceScoring } from './confidence-scoring'
import { resolutionWorkflow } from './resolution-workflow'

export interface ReconciliationResult {
  id: string
  status: 'auto_matched' | 'manual_review' | 'disputed'
  confidence: number
  matches: Array<{
    orderId: string
    deliveryId: string
    invoiceId: string
    confidence: number
  }>
  discrepancies?: Array<{
    type: 'quantity' | 'price' | 'item'
    field: string
    expected: any
    actual: any
  }>
  createdAt: Date
  processedAt?: Date
}

export interface ReconciliationEngine {
  processReconciliation: (data: {
    orders: any[]
    deliveries: any[]
    invoices: any[]
  }) => Promise<ReconciliationResult>
  
  getReconciliationStatus: (id: string) => Promise<ReconciliationResult | null>
  
  approveReconciliation: (id: string) => Promise<boolean>
  
  disputeReconciliation: (id: string, reason: string) => Promise<boolean>
}

// 模擬對帳引擎實現
export const reconciliationEngine: ReconciliationEngine = {
  async processReconciliation(data: ReconciliationInput): Promise<ReconciliationResult> {
    const { orders, deliveries, invoices } = data
    
    // 模擬處理邏輯
    const matches = await matchingAlgorithm.findMatches(orders, deliveries, invoices)
    const confidence = confidenceScoring.calculateConfidence(matches)
    
    const result: ReconciliationResult = {
      id: `reconciliation_${Date.now()}`,
      status: confidence > 0.9 ? 'auto_matched' : 'manual_review',
      confidence,
      matches: matches.map((match, index) => ({
        orderId: `order_${index + 1}`,
        deliveryId: `delivery_${index + 1}`,
        invoiceId: `invoice_${index + 1}`,
        confidence: confidence
      })),
      createdAt: new Date()
    }
    
    if (confidence < 0.7) {
      result.discrepancies = [
        {
          type: 'quantity',
          field: 'quantity',
          expected: 100,
          actual: 95
        }
      ]
    }
    
    return result
  },
  
  async getReconciliationStatus(id: string): Promise<ReconciliationResult> {
    // 模擬查詢
    return {
      id,
      status: 'auto_matched' as const,
      confidence: 0.95,
      matches: [],
      createdAt: new Date()
    }
  },
  
  async approveReconciliation(id: string): Promise<boolean> {
    console.log(`Approving reconciliation: ${id}`)
    return true
  },
  
  async disputeReconciliation(id: string, reason: string): Promise<boolean> {
    console.log(`Disputing reconciliation: ${id}, reason: ${reason}`)
    return true
  }
}

// 導出其他模組
export { matchingAlgorithm } from './matching-algorithm'
export { confidenceScoring } from './confidence-scoring'
export { resolutionWorkflow } from './resolution-workflow'