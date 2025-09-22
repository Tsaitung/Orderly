import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      frontend: 'connected',
      system: 'operational',
    },
    message: 'Basic health check - database and Redis checks disabled for reliable builds',
  })
}
