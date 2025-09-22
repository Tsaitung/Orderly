'use client'

import { useState, useEffect } from 'react'

export function HeroBackground() {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [backgroundAttachment, setBackgroundAttachment] = useState<'fixed' | 'scroll'>('scroll')

  useEffect(() => {
    // 直接使用備用圖片 URL，確保快速載入
    const fallbackUrl = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&q=85'
    
    // 檢查是否為客戶端環境並設置 backgroundAttachment
    if (typeof window !== 'undefined') {
      setBackgroundAttachment(window.innerWidth >= 768 ? 'fixed' : 'scroll')
    }
    
    // 立即設置載入狀態，避免長時間顯示漸層
    setImageSrc(fallbackUrl)
    setImageLoaded(true)
  }, [])

  return (
    <>
      {/* 載入中的漸層背景 */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-primary-100 via-primary-50 to-white transition-opacity duration-1000 ${
          imageLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      
      {/* 圖片背景 */}
      {imageSrc && (
        <div 
          className={`absolute inset-0 transition-opacity duration-1000 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-fade-in-scale"
            style={{
              backgroundImage: `url(${imageSrc})`,
              backgroundAttachment: backgroundAttachment,
              filter: 'contrast(1.3) brightness(0.9) saturate(1.2)'
            }}
          />
        </div>
      )}
      
      {/* 多層漸層遮罩 */}
      <div className="absolute inset-0 bg-hero-gradient" />
      
      {/* 網格紋理疊加 */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      {/* 底部漸層過渡 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
    </>
  )
}