import { NextRequest, NextResponse } from 'next/server'
import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { AuthService } from '@/lib/auth'

interface RouteParams {
  params: {
    endpointId: string
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

    const result = await webhookManager.testEndpoint(session.organizationId, params.endpointId)
    
    return NextResponse.json({
      success: result.success,
      data: {
        testResult: result.success ? 'passed' : 'failed',
        response: result.response,
        error: result.error
      },
      message: result.success ? 'Webhook 測試成功' : 'Webhook 測試失敗'
    }, { status: result.success ? 200 : 400 })

  } catch (error) {
    console.error('Test webhook endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: '測試 webhook 端點失敗'
    }, { status: 500 })
  }
}