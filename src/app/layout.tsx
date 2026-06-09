import type { Metadata } from 'next'
import { Inter, Noto_Sans_TC, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  variable: '--font-noto-sans-tc',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | 井然 Orderly',
    default: '井然 Orderly - 餐飲供應鏈自動化對帳平台',
  },
  description:
    '井然 Orderly 是一個以自動化對帳為核心的餐飲供應鏈數位解決方案，專注解決行業最大痛點——繁瑣易錯的對帳流程。',
  keywords: ['餐飲', '供應鏈', '自動化對帳', 'ERP整合', '數位平台', '訂單管理', '驗收', '結算'],
  authors: [{ name: 'Orderly Team' }],
  creator: 'Orderly Team',
  publisher: 'Orderly Platform',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: '/',
    title: '井然 Orderly - 餐飲供應鏈自動化對帳平台',
    description:
      '透過 ERP 整合和 API 優先架構，實現下單到結算全流程自動化，讓餐廳和供應商徹底告別手工對帳的時代。',
    siteName: '井然 Orderly',
  },
  twitter: {
    card: 'summary_large_image',
    title: '井然 Orderly - 餐飲供應鏈自動化對帳平台',
    description: '透過 ERP 整合和 API 優先架構，實現下單到結算全流程自動化。',
    creator: '@orderly_platform',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-TW"
      className={cn(inter.variable, notoSansTC.variable, jetbrainsMono.variable, 'scroll-smooth')}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#a47864" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Critical CSS for initial page load */
              .critical-fallback {
                min-height: 100vh;
                background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
                font-family: -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
              }
              .critical-fallback h1 {
                color: #111827;
                font-size: 3rem;
                font-weight: bold;
                text-align: center;
                padding: 2rem;
              }
              .critical-fallback p {
                color: #6b7280;
                text-align: center;
                font-size: 1.125rem;
                max-width: 600px;
                margin: 0 auto;
                padding: 0 1rem;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('🎯 Orderly Platform v2.0 - 開發模式運行在端口 3000');
              console.log('📍 請訪問: http://localhost:3000');
              console.log('🔧 如果頁面顯示異常，請檢查瀏覽器開發者工具');
            `,
          }}
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          'selection:bg-primary-100 selection:text-primary-900'
        )}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
