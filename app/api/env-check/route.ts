import { NextResponse } from 'next/server'

export async function GET() {
  // 獲取全局配置（由 instrumentation.ts 設置）
  const config = globalThis.__orderly_config || {
    backendUrl: 'http://localhost:8000',
    nodeEnv: 'development',
    environment: 'development' as const,
    debug: true
  }

  return NextResponse.json({
    // 顯示舊方式（build-time 環境變數）
    build_time_env: {
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      ORDERLY_BACKEND_URL: process.env.ORDERLY_BACKEND_URL,
      BACKEND_URL: process.env.BACKEND_URL,
    },
    // 顯示新方式（runtime 配置）
    runtime_config: {
      backendUrl: config.backendUrl,
      nodeEnv: config.nodeEnv,
      environment: config.environment,
      debug: config.debug
    },
    // 相容性檢查
    compatibility: {
      env_vars_available: !!process.env.ORDERLY_BACKEND_URL,
      global_config_available: !!globalThis.__orderly_config,
      config_matches_env: config.backendUrl === (process.env.ORDERLY_BACKEND_URL || process.env.BACKEND_URL)
    }
  })
}
