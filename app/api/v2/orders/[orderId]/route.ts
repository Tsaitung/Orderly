import { NextRequest, NextResponse } from 'next/server'
import { OrderService, UpdateOrderSchema } from '@/lib/orders/order-service'
import { AuthService } from '@/lib/auth'

interface RouteParams {
  params: {
    orderId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await AuthService.getSessionFromCookie()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '未授權訪問'
      }, { status: 401 })
    }

    const order = await OrderService.getOrderById(params.orderId)
    
    if (!order) {
      return NextResponse.json({
        success: false,
        error: '訂單不存在'
      }, { status: 404 })
    }

    // 檢查訂單是否屬於該組織
    if (order.organizationId !== session.organizationId) {
      return NextResponse.json({
        success: false,
        error: '無權限訪問此訂單'
      }, { status: 403 })
    }
    
    return NextResponse.json({
      success: true,
      data: order,
      message: '訂單查詢成功'
    })

  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '訂單查詢失敗'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json()
    const order = await OrderService.updateOrder(params.orderId, body)
    
    return NextResponse.json({
      success: true,
      data: order,
      message: '訂單更新成功'
    })

  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '訂單更新失敗'
    }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await OrderService.deleteOrder(params.orderId)
    
    return NextResponse.json({
      success: true,
      message: '訂單刪除成功'
    })

  } catch (error) {
    console.error('Delete order error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '訂單刪除失敗'
    }, { status: 400 })
  }
}