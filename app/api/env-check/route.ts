import { NextResponse } from 'next/server'

export async function GET() {
  // ✅ 完全繞過 Next.js，直接讀取 Node.js 進程環境變數
  const BACKEND_URL = process.env.ORDERLY_BACKEND_URL || 
                     process.env.BACKEND_URL || 
                     'http://localhost:8000'
  
  const nodeEnv = process.env.NODE_ENV || 'development'
  const environment = nodeEnv === 'staging' ? 'staging' :
                     nodeEnv === 'production' ? 'production' : 
                     'development'

  return NextResponse.json({
    // 顯示原始環境變數
    raw_environment_variables: {
      NODE_ENV: process.env.NODE_ENV,
      ORDERLY_BACKEND_URL: process.env.ORDERLY_BACKEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
      PORT: process.env.PORT,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    },
    // 顯示所有以 ORDERLY_ 或 BACKEND_ 開頭的環境變數
    debug_all_env: Object.fromEntries(
      Object.entries(process.env).filter(([key]) => 
        key.startsWith('ORDERLY_') || 
        key.startsWith('BACKEND_') || 
        key.startsWith('NODE_') ||
        key.startsWith('NEXT_')
      )
    ),
    // 顯示計算後的配置
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
      total_env_vars: Object.keys(process.env).length,
    }
  })
}
