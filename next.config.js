/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Enable React 18 features
  reactStrictMode: true,
  
  // Optimize for production
  swcMinify: true,
  
  // Enable experimental features
  experimental: {
    // Server Components
    serverComponentsExternalPackages: ['@prisma/client', 'prisma', 'ioredis', 'redis'],
    
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
    ];
  },
  
  // API routes configuration
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
      // Proxy backend API calls to API Gateway
      {
        source: '/api/backend/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
  },
  
  // Output configuration for standalone builds
  output: 'standalone',
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors. We handle this in CI/CD
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // PWA support can be added later with next-pwa plugin
  // Ensure TS path aliases like '@/lib/*' resolve in Docker/CI builds
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      'lib': path.resolve(__dirname, 'lib'),
      '@/lib': path.resolve(__dirname, 'lib'),
    };
    return config;
  },
};

module.exports = nextConfig;
