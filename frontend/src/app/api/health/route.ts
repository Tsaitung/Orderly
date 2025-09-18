import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 嘗試連接後端健康檢查
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
    
    try {
      const backendResponse = await fetch(`${backendUrl.replace('/api', '')}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        return NextResponse.json({
          status: 'healthy',
          service: 'frontend',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'development',
          backend: {
            status: 'connected',
            data: backendData,
          },
        });
      }
    } catch (backendError) {
      // 後端暫時不可用，但前端仍正常
    }
    
    return NextResponse.json({
      status: 'healthy',
      service: 'frontend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      backend: {
        status: 'disconnected',
        message: 'Backend service not available',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'frontend',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}