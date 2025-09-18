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
    { label: 'API 可用性', value: '99.5%', from: '7x24 穩定運行' }
  ]
  
  useEffect(() => {
    setIsLoaded(true)
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [stats.length])
  
  // No-JavaScript fallback content
  if (!isLoaded) {
    return (
      <section className="critical-fallback flex items-center justify-center">
        <div className="text-center">
          <h1>井然 Orderly</h1>
          <p>餐飲供應鏈自動化對帳平台</p>
          <p style={{ marginTop: '2rem' }}>
            透過 ERP 整合和 API 優先架構，實現「下單 → 配送 → 驗收 → 對帳 → 結算」全流程自動化
          </p>
          <div style={{ marginTop: '3rem' }}>
            <a href="/restaurant" style={{ 
              background: '#a47864', 
              color: 'white', 
              padding: '1rem 2rem', 
              borderRadius: '0.5rem',
              textDecoration: 'none',
              marginRight: '1rem',
              display: 'inline-block'
            }}>
              餐廳管理介面
            </a>
            <a href="/supplier" style={{ 
              background: '#f3f4f6', 
              color: '#374151', 
              padding: '1rem 2rem', 
              borderRadius: '0.5rem',
              textDecoration: 'none',
              border: '1px solid #d1d5db',
              display: 'inline-block'
            }}>
              供應商管理介面
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden min-h-screen py-20">
      {/* 餐廳背景圖片層 */}
      <HeroBackground />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* 主標題 - 增強對比 */}
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="text-white drop-shadow-2xl">井然</span>{' '}
              <span className="text-white/90 drop-shadow-2xl">Orderly</span>
            </h1>
            <div className="h-1 w-24 bg-white/80 mx-auto mb-6 shadow-lg" />
            <p className="text-xl md:text-2xl text-white font-medium drop-shadow-lg">
              餐飲供應鏈自動化對帳平台
            </p>
          </div>
          
          {/* 副標題和描述 - 增強可讀性 */}
          <div className="mb-12 bg-black/20 backdrop-blur-sm rounded-2xl p-6">
            <p className="text-lg md:text-xl text-white/95 mb-6 max-w-3xl mx-auto leading-relaxed">
              透過 <span className="font-semibold text-white">ERP 整合</span> 和 
              <span className="font-semibold text-white"> API 優先架構</span>，
              實現「下單 → 配送 → 驗收 → 對帳 → 結算」全流程自動化
            </p>
            <p className="text-base text-white/80">
              讓餐廳和供應商徹底告別手工對帳的時代
            </p>
          </div>
          
          {/* 動態統計展示 - 玻璃擬態 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-glass-lg border border-white/20 mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className={cn(
                    'text-center transition-all duration-500',
                    currentStat === index 
                      ? 'transform scale-105' 
                      : ''
                  )}
                >
                  <div className={cn(
                    "text-3xl md:text-4xl font-bold font-mono mb-2",
                    currentStat === index ? 'text-white' : 'text-white/70'
                  )}>
                    {stat.value}
                  </div>
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    currentStat === index ? 'text-white/95' : 'text-white/60'
                  )}>
                    {stat.label}
                  </div>
                  <div className={cn(
                    "text-xs",
                    currentStat === index ? 'text-white/80' : 'text-white/50'
                  )}>
                    {stat.from}
                  </div>
                </div>
              ))}
            </div>
            
            {/* 進度指示器 */}
            <div className="flex justify-center mt-6 space-x-2">
              {stats.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    currentStat === index 
                      ? 'bg-white w-6' 
                      : 'bg-white/30'
                  )}
                />
              ))}
            </div>
          </div>
          
          {/* CTA 按鈕 - 增強對比 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/restaurant" 
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-3 rounded-lg shadow-2xl hover:shadow-glass-lg transition-all duration-300 transform hover:scale-105 inline-flex items-center space-x-2 border-2 border-white/20 backdrop-blur-sm"
            >
              <span>餐廳管理介面</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link 
              href="/supplier" 
              className="bg-white/90 text-primary-700 px-8 py-3 rounded-lg shadow-lg hover:bg-white transition-all duration-300 inline-flex items-center space-x-2 border-2 border-primary-600/20 backdrop-blur-sm"
            >
              <span>供應商管理介面</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
          
          {/* 信任標誌 - 玻璃擬態 */}
          <div className="mt-16 pt-8 border-t border-white/20">
            <p className="text-sm text-white/70 mb-4">
              已獲得以下企業信任
            </p>
            <div className="flex justify-center items-center space-x-8">
              {/* 客戶 logo */}
              <div className="text-white/60 font-medium hover:text-white transition-colors">大樂司</div>
              <div className="text-white/60 font-medium hover:text-white transition-colors">樂多多</div>
              <div className="text-white/60 font-medium hover:text-white transition-colors">烤食組合</div>
              <div className="text-white/60 font-medium hover:text-white transition-colors">稻舍</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部波浪裝飾 */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg 
          className="w-full h-20 text-white" 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
        >
          <path 
            d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z" 
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  )
}