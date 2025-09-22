import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '井然 Orderly - 身份驗證',
  description: '登入或註冊井然平台，開始您的數位供應鏈之旅',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left side - Brand & Visual */}
      <div className="relative hidden bg-gradient-to-br from-primary-500 to-primary-600 lg:flex lg:w-1/2">
        {/* Brand overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12">
          <div className="max-w-md">
            {/* Logo */}
            <div className="mb-8">
              <h1 className="mb-2 text-4xl font-bold text-white">井然 Orderly</h1>
              <p className="text-lg text-primary-100">餐飲產業全鏈路數位供應平台</p>
            </div>

            {/* Value propositions */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-white" />
                <div>
                  <h3 className="mb-1 font-semibold text-white">智慧訂單管理</h3>
                  <p className="text-sm text-primary-100">簡化採購流程，提升 70% 訂單效率</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-white" />
                <div>
                  <h3 className="mb-1 font-semibold text-white">透明化驗收</h3>
                  <p className="text-sm text-primary-100">實時驗收記錄，降低誤差至 2% 以下</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-white" />
                <div>
                  <h3 className="mb-1 font-semibold text-white">自動化結算</h3>
                  <p className="text-sm text-primary-100">縮短付款週期 30%，提升資金效率</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative pattern */}
        <div className="absolute bottom-0 right-0 h-64 w-64 opacity-10">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex flex-1 items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
