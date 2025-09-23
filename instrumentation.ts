/**
 * Next.js Instrumentation for Runtime Environment Variables
 * 
 * This file runs once when the Next.js server starts.
 * It captures runtime environment variables from Docker/Cloud Run
 * and makes them available to API Routes through a global configuration.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

interface OrderlyConfig {
  backendUrl: string
  nodeEnv: string
  environment: 'development' | 'staging' | 'production'
  debug: boolean
}

declare global {
  var __orderly_config: OrderlyConfig | undefined
}

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Initializing Orderly runtime configuration...')
    
    // Capture runtime environment variables from Docker/Cloud Run
    const backendUrl = process.env.ORDERLY_BACKEND_URL || 
                      process.env.BACKEND_URL || 
                      'http://localhost:8000'
    
    const nodeEnv = process.env.NODE_ENV || 'development'
    
    // Determine environment based on NODE_ENV and URL patterns
    let environment: 'development' | 'staging' | 'production' = 'development'
    
    if (nodeEnv === 'production') {
      environment = 'production'
    } else if (nodeEnv === 'staging' || backendUrl.includes('staging')) {
      environment = 'staging'
    }
    
    const config: OrderlyConfig = {
      backendUrl,
      nodeEnv,
      environment,
      debug: environment !== 'production'
    }
    
    // Store in global object for API Routes to access
    globalThis.__orderly_config = config
    
    console.log('[Instrumentation] Configuration loaded:', {
      backendUrl: config.backendUrl,
      nodeEnv: config.nodeEnv,
      environment: config.environment,
      debug: config.debug
    })
    
    // Additional debugging in non-production environments
    if (config.debug) {
      console.log('[Instrumentation] All environment variables:', {
        NODE_ENV: process.env.NODE_ENV,
        ORDERLY_BACKEND_URL: process.env.ORDERLY_BACKEND_URL,
        BACKEND_URL: process.env.BACKEND_URL,
        PORT: process.env.PORT
      })
    }
  }
}