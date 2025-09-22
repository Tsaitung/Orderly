'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { HeroBackground } from './HeroBackground'

export function HeroSection() {
  const [currentStat, setCurrentStat] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  const stats = [
    { label: '對帳時間減少', value: '90%', from: '8小時 → 30分鐘' },
    { label: '錯誤率降低', value: '95%', from: '15% → 0.5%' },
    { label: '收款週期縮短', value: '50%', from: '45天 → 22天' },
    { label: 'API 可用性', value: '99.5%', from: '7x24 穩定運行' },
  ]

  useEffect(() => {
    setIsLoaded(true)
    const interval = setInterval(() => {
      setCurrentStat(prev => (prev + 1) % stats.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [stats.length])

  // Simplified version without fallback - always show enhanced hero
  // if (!isLoaded) {
  //   return fallback...
  // }

  return (
    <section className="relative min-h-screen overflow-hidden py-20">
      {/* 餐廳背景圖片層 */}
      <HeroBackground />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* 主標題 - 增強對比 */}
          <div className="mb-8">
            <h1 className="mb-4 text-5xl font-bold md:text-6xl">
              <span className="text-white drop-shadow-2xl">井然</span>{' '}
              <span className="text-white/90 drop-shadow-2xl">Orderly</span>
            </h1>
            <div className="mx-auto mb-6 h-1 w-24 bg-white/80 shadow-lg" />
            <p className="text-xl font-medium text-white drop-shadow-lg md:text-2xl">
              餐飲供應鏈自動化對帳平台
            </p>
          </div>

          {/* 副標題和描述 - 增強可讀性 */}
          <div className="mb-12 rounded-2xl bg-black/20 p-6 backdrop-blur-sm">
            <p className="mx-auto mb-6 max-w-3xl text-lg leading-relaxed text-white/95 md:text-xl">
              透過 <span className="font-semibold text-white">ERP 整合</span> 和
              <span className="font-semibold text-white"> API 優先架構</span>， 實現「下單 → 配送 →
              驗收 → 對帳 → 結算」全流程自動化
            </p>
            <p className="text-base text-white/80">讓餐廳和供應商徹底告別手工對帳的時代</p>
          </div>

          {/* 動態統計展示 - 玻璃擬態 */}
          <div className="mb-12 rounded-2xl border border-white/20 bg-white/10 p-8 shadow-glass-lg backdrop-blur-md">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={cn(
                    'text-center transition-all duration-500',
                    currentStat === index ? 'scale-105 transform' : ''
                  )}
                >
                  <div
                    className={cn(
                      'mb-2 font-mono text-3xl font-bold md:text-4xl',
                      currentStat === index ? 'text-white' : 'text-white/70'
                    )}
                  >
                    {stat.value}
                  </div>
                  <div
                    className={cn(
                      'mb-1 text-sm font-medium',
                      currentStat === index ? 'text-white/95' : 'text-white/60'
                    )}
                  >
                    {stat.label}
                  </div>
                  <div
                    className={cn(
                      'text-xs',
                      currentStat === index ? 'text-white/80' : 'text-white/50'
                    )}
                  >
                    {stat.from}
                  </div>
                </div>
              ))}
            </div>

            {/* 進度指示器 */}
            <div className="mt-6 flex justify-center space-x-2">
              {stats.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all duration-300',
                    currentStat === index ? 'w-6 bg-white' : 'bg-white/30'
                  )}
                />
              ))}
            </div>
          </div>

          {/* CTA 按鈕 - 增強對比 */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/restaurant"
              className="inline-flex transform items-center space-x-2 rounded-lg border-2 border-white/20 bg-gradient-to-r from-primary-600 to-primary-700 px-8 py-3 text-white shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-glass-lg"
            >
              <span>餐廳管理介面</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
            <Link
              href="/supplier"
              className="inline-flex items-center space-x-2 rounded-lg border-2 border-primary-600/20 bg-white/90 px-8 py-3 text-primary-700 shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-white"
            >
              <span>供應商管理介面</span>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>

          {/* 信任標誌 - 玻璃擬態 */}
          <div className="mt-16 border-t border-white/20 pt-8">
            <p className="mb-4 text-sm text-white/70">已獲得以下企業信任</p>
            <div className="flex items-center justify-center space-x-8">
              {/* 客戶 logo */}
              <div className="font-medium text-white/60 transition-colors hover:text-white">
                大樂司
              </div>
              <div className="font-medium text-white/60 transition-colors hover:text-white">
                樂多多
              </div>
              <div className="font-medium text-white/60 transition-colors hover:text-white">
                烤食組合
              </div>
              <div className="font-medium text-white/60 transition-colors hover:text-white">
                稻舍
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部波浪裝飾 */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="h-20 w-full text-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z" fill="currentColor" />
        </svg>
      </div>
    </section>
  )
}
