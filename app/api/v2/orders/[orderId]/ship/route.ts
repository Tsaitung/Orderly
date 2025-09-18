import { NextRequest, NextResponse } from 'next/server'
import { OrderService } from '@/lib/orders/order-service'
import { AuthService } from '@/lib/auth'

interface RouteParams {
  params: {
    orderId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthService.getSessionFromCookie()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '未授權訪問'
      }, { status: 401 })
    }

    // 先檢查訂單是否存在且屬於該組織
    const existingOrder = await OrderService.getOrderById(params.orderId)
    if (!existingOrder) {
      return NextResponse.json({
        success: false,
        error: '訂單不存在'
      }, { status: 404 })
    }

    if (existingOrder.organizationId !== session.organizationId) {
      return NextResponse.json({
        success: false,
        error: '無權限訪問此訂單'
      }, { status: 403 })
    }

    const order = await OrderService.shipOrder(params.orderId)
    
    return NextResponse.json({
      success: true,
      data: order,
      message: '訂單發貨成功'
    })

  } catch (error) {
    console.error('Ship order error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '訂單發貨失敗'
    }, { status: 400 })
  }
}