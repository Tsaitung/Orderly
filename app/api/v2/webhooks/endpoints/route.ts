import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'

const CreateWebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.string()).min(1, 'At least one event type is required'),
  description: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    // 獲取當前用戶會話
    const session = await AuthService.getSessionFromCookie()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '未授權訪問'
      }, { status: 401 })
    }

    // 獲取組織的所有 webhook 端點
    const endpoints = await webhookManager.getEndpoints(session.organizationId)

    // 隱藏敏感的 secret 信息
    const safeEndpoints = endpoints.map(endpoint => ({
      ...endpoint,
      secret: `${endpoint.secret.slice(0, 8)}...` // 只顯示前8字符
    }))

    return NextResponse.json({
      success: true,
      data: safeEndpoints,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Get webhook endpoints error:', error)
    return NextResponse.json({
      success: false,
      error: '獲取 webhook 端點失敗'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 獲取當前用戶會話
    const session = await AuthService.getSessionFromCookie()
    if (!session) {
      return NextResponse.json({
        success: false,
        error: '未授權訪問'
      }, { status: 401 })
    }

    // 驗證請求體
    const body = await request.json()
    const validationResult = CreateWebhookSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: '請求數據格式錯誤',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const { url, events, description } = validationResult.data

    // 驗證事件類型
    const validEventTypes = [
      'order.created', 'order.updated', 'order.confirmed', 'order.shipped',
      'order.delivered', 'order.accepted', 'order.completed', 'order.cancelled',
      'product.created', 'product.updated', 'product.deleted', 'product.price_changed',
      'reconciliation.started', 'reconciliation.completed', 'reconciliation.disputed',
      'reconciliation.resolved', 'inventory.updated', 'inventory.low_stock',
      'payment.processed', 'payment.failed', 'user.created', 'user.updated',
      'organization.updated'
    ]

    const invalidEvents = events.filter(event => !validEventTypes.includes(event))
    if (invalidEvents.length > 0) {
      return NextResponse.json({
        success: false,
        error: `無效的事件類型: ${invalidEvents.join(', ')}`
      }, { status: 400 })
    }

    // 註冊 webhook 端點
    const endpoint = await webhookManager.registerEndpoint(session.organizationId, {
      url,
      events,
      description,
      isActive: true
    })

    return NextResponse.json({
      success: true,
      data: {
        id: endpoint.id,
        url: endpoint.url,
        events: endpoint.events,
        description: endpoint.description,
        isActive: endpoint.isActive,
        secret: endpoint.secret, // 創建時返回完整 secret
        createdAt: endpoint.createdAt
      },
      message: 'Webhook 端點註冊成功'
    }, { status: 201 })

  } catch (error) {
    console.error('Create webhook endpoint error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({
          success: false,
          error: '此 URL 的 webhook 端點已存在'
        }, { status: 409 })
      }
      
      if (error.message.includes('not reachable')) {
        return NextResponse.json({
          success: false,
          error: 'Webhook 端點無法訪問，請檢查 URL 是否正確'
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: false,
      error: '創建 webhook 端點失敗'
    }, { status: 500 })
  }
}