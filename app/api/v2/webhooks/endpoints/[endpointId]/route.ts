import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { AuthService } from '@/lib/auth'
import { z } from 'zod'

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
})

interface RouteParams {
  params: {
    endpointId: string
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

    const endpoint = await webhookManager.getEndpoint(session.organizationId, params.endpointId)
    
    if (!endpoint) {
      return NextResponse.json({
        success: false,
        error: 'Webhook 端點不存在'
      }, { status: 404 })
    }

    // 隱藏敏感信息
    const safeEndpoint = {
      ...endpoint,
      secret: `${endpoint.secret.slice(0, 8)}...`
    }

    return NextResponse.json({
      success: true,
      data: safeEndpoint
    })
  } catch (error) {
    console.error('Get webhook endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: '獲取 webhook 端點失敗'
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

    const body = await request.json()
    const validationResult = UpdateWebhookSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: '請求數據格式錯誤',
        details: validationResult.error.errors
      }, { status: 400 })
    }

    const updatedEndpoint = await webhookManager.updateEndpoint(
      session.organizationId,
      params.endpointId,
      validationResult.data
    )

    // 隱藏敏感信息
    const safeEndpoint = {
      ...updatedEndpoint,
      secret: `${updatedEndpoint.secret.slice(0, 8)}...`
    }

    return NextResponse.json({
      success: true,
      data: safeEndpoint,
      message: 'Webhook 端點更新成功'
    })
  } catch (error) {
    console.error('Update webhook endpoint error:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: 'Webhook 端點不存在'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: false,
      error: '更新 webhook 端點失敗'
    }, { status: 500 })
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

    const success = await webhookManager.deleteEndpoint(session.organizationId, params.endpointId)
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Webhook 端點不存在'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook 端點刪除成功'
    })
  } catch (error) {
    console.error('Delete webhook endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: '刪除 webhook 端點失敗'
    }, { status: 500 })
  }
}