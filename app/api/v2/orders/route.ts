import { NextRequest, NextResponse } from 'next/server'
import { OrderService, CreateOrderSchema, OrderQuerySchema } from '@/lib/orders/order-service'
import { AuthService } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookie()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '未授權訪問'
      }, { status: 401 })
    }

    // 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const queryInput = {
      organizationId: session.organizationId,
      status: (searchParams.get('status') as 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled') || undefined,
      supplierCode: searchParams.get('supplierCode') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: (searchParams.get('sortBy') as 'orderDate' | 'deliveryDate' | 'totalAmount' | 'createdAt') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    }

    const result = await OrderService.getOrders(queryInput)
    
    return NextResponse.json({
      success: true,
      data: result.orders,
      pagination: result.pagination,
      message: '訂單列表查詢成功'
    })

  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '訂單查詢失敗'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookie()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '未授權訪問'
      }, { status: 401 })
    }

    const body = await request.json()
    const orderInput = {
      ...body,
      organizationId: session.organizationId
    }

    const order = await OrderService.createOrder(orderInput)
    
    return NextResponse.json({
      success: true,
      data: order,
      message: '訂單創建成功'
    }, { status: 201 })

  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '訂單創建失敗'
    }, { status: 400 })
  }
}