import { NextResponse } from 'next/server'
import getConfig from 'next/config'

export async function GET() {
  // ✅ 使用 Next.js runtime config 讀取環境變數（支援 standalone 模式）
  const { publicRuntimeConfig } = getConfig()
  const BACKEND_URL = publicRuntimeConfig?.BACKEND_URL || 
                     process.env.ORDERLY_BACKEND_URL || 
                     process.env.BACKEND_URL || 
                     'http://localhost:8000'
  
  const nodeEnv = publicRuntimeConfig?.NODE_ENV || process.env.NODE_ENV || 'development'
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
    // 顯示 Next.js runtime config
    runtime_config: {
      BACKEND_URL: publicRuntimeConfig?.BACKEND_URL,
      NODE_ENV: publicRuntimeConfig?.NODE_ENV,
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
      runtime_config_available: !!publicRuntimeConfig,
      backend_url_resolved: BACKEND_URL !== 'http://localhost:8000',
      environment_detected: environment,
    }
  })
}
