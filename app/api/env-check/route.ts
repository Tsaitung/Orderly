import { NextResponse } from 'next/server'

export async function GET() {
  // ✅ 在函數內部動態讀取環境變數（和 BFF API 一樣的方式）
  const BACKEND_URL = process.env.ORDERLY_BACKEND_URL || 
                     process.env.BACKEND_URL || 
                     'http://localhost:8000'
  
  const nodeEnv = process.env.NODE_ENV || 'development'
  const environment = nodeEnv === 'staging' ? 'staging' :
                     nodeEnv === 'production' ? 'production' : 
                     'development'

  return NextResponse.json({
    // 顯示所有環境變數
    runtime_environment_variables: {
      NODE_ENV: process.env.NODE_ENV,
      ORDERLY_BACKEND_URL: process.env.ORDERLY_BACKEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
      PORT: process.env.PORT,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    },
    // 顯示計算後的配置（和 BFF API 相同的邏輯）
    computed_config: {
      backendUrl: BACKEND_URL,
      nodeEnv: nodeEnv,
      environment: environment,
      debug: environment !== 'production'
    },
    // 驗證狀態
    validation: {
      env_vars_set: {
        NODE_ENV: !!process.env.NODE_ENV,
        ORDERLY_BACKEND_URL: !!process.env.ORDERLY_BACKEND_URL,
        BACKEND_URL: !!process.env.BACKEND_URL,
      },
      backend_url_resolved: BACKEND_URL !== 'http://localhost:8000',
      environment_detected: environment,
    }
  })
}
