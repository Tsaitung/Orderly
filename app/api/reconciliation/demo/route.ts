import { NextResponse } from 'next/server'
import { reconciliationEngine } from '@/lib/reconciliation'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    // 獲取示例數據
    const restaurant = await prisma.organization.findFirst({
      where: { type: 'restaurant' }
    })
    
    const supplier = await prisma.organization.findFirst({
      where: { type: 'supplier' }
    })

    if (!restaurant || !supplier) {
      return NextResponse.json({
        error: '找不到示例組織數據，請先執行種子數據初始化'
      }, { status: 400 })
    }

    // 執行對帳處理
    const result = await reconciliationEngine.processReconciliation(
      restaurant.id,
      supplier.id,
      new Date('2025-01-01'),
      new Date('2025-01-31')
    )

    return NextResponse.json({
      success: true,
      result,
      message: '對帳處理完成',
      performance: {
        processingTime: `${result.processingTimeMs}ms`,
        efficiency: result.matchedItems / (result.matchedItems + result.disputedItems) * 100
      }
    })
  } catch (error) {
    console.error('對帳演示失敗:', error)
    
    return NextResponse.json({
      error: '對帳處理失敗',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}