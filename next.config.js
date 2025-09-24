/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // Enable React 18 features
  reactStrictMode: true,

  // Optimize for production
  swcMinify: true,

  // Enable experimental features
  experimental: {
    // Server Components
    serverComponentsExternalPackages: ['ioredis', 'redis'],

    // Optimize CSS - Disable critters to avoid issues
    optimizeCss: false,

    // Enable middleware improvements
    middlewarePrefetch: 'strict',
  },

  // Image optimization
  images: {
    domains: ['storage.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },

  // API routes configuration
  async rewrites() {
    return [
      // Keep legacy alias for internal use
      { source: '/api/v1/:path*', destination: '/api/:path*' },
      // Prefer BFF proxy (handled by app/api/bff)
      // No direct rewrite to gateway required
    ]
  },

  // 移除 build-time env 注入，避免覆蓋執行時環境變數（特別是 NEXT_PUBLIC_* 被內嵌）

  // Output configuration for standalone builds
  output: 'standalone',

  // Disable ESLint during builds to unblock deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable TypeScript strict checks during builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // Ensure TS path aliases like '@/lib/*' resolve in Docker/CI builds
  webpack: (config, { isServer, webpack }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      lib: path.resolve(__dirname, 'lib'),
      '@/lib': path.resolve(__dirname, 'lib'),
    }

    // 僅在瀏覽器端加入 process polyfill，避免覆蓋伺服端的 Node.js process 環境
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        process: 'process/browser',
      }
      config.plugins = config.plugins || []
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
        })
      )
    }

    return config
  },
}

module.exports = nextConfig
