import type { Config } from 'tailwindcss'
import { tokens } from './lib/theme/tokens'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 導入 Chakra UI v2 風格色彩系統（保留主色系）
        ...tokens.colors,
        
        // 對帳狀態色彩
        reconciliation: {
          pending: '#f59e0b',     // 待審查 - 琥珀色
          processing: '#3b82f6',  // 處理中 - 藍色
          approved: '#10b981',    // 已完成 - 綠色
          disputed: '#ef4444',    // 需注意 - 紅色
          draft: '#6b7280',       // 草稿 - 灰色
        },
        
        // ERP 整合狀態
        erp: {
          connected: '#10b981',   // 已連接
          syncing: '#f59e0b',     // 同步中
          error: '#ef4444',       // 錯誤
          offline: '#6b7280',     // 離線
        },
        
        // 語意色彩
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
        
        
        // 背景和邊框
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Cascadia Code', 'monospace'],
      },
      
      fontSize: {
        // Chakra UI v2 標準字體大小
        ...tokens.fontSizes,
        // 保留業務專用字體
        'financial': ['1rem', { fontWeight: '600', letterSpacing: '0.025em' }],
        'status': ['0.75rem', { fontWeight: '600', letterSpacing: '0.1em' }],
      },
      
      fontWeight: {
        // Chakra UI v2 標準字重
        ...tokens.fontWeights,
      },
      
      lineHeight: {
        // Chakra UI v2 標準行高
        ...tokens.lineHeights,
      },
      
      spacing: {
        // Chakra UI v2 標準間距系統
        ...tokens.spacing,
        // 保留特殊業務間距
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
        'card-sm': '0.75rem',   // 12px - 小卡片
        'card-md': '1rem',      // 16px - 中卡片  
        'card-lg': '1.25rem',   // 20px - 大卡片
        'card-xl': '1.5rem',    // 24px - 特大卡片
      },
      
      borderRadius: {
        // Chakra UI v2 標準圓角系統
        ...tokens.radii,
      },
      
      boxShadow: {
        // Chakra UI v2 標準陰影系統
        ...tokens.shadows,
        // 保留業務專用陰影
        'reconciliation': '0 4px 12px rgba(164, 120, 100, 0.15)',
        'erp-sync': '0 2px 8px rgba(59, 130, 246, 0.15)',
        'financial': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'neu-sm': '3px 3px 6px rgba(0, 0, 0, 0.08), -3px -3px 6px rgba(255, 255, 255, 0.9)',
        'neu-md': '6px 6px 12px rgba(0, 0, 0, 0.08), -6px -6px 12px rgba(255, 255, 255, 0.9)',
        'neu-lg': '8px 8px 16px rgba(0, 0, 0, 0.08), -8px -8px 16px rgba(255, 255, 255, 0.9)',
        'glass-sm': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'glass-md': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'glass-lg': '0 8px 32px rgba(0, 0, 0, 0.15)',
        'restaurant': '0 4px 12px rgba(255, 107, 53, 0.15)',
        'supplier': '0 4px 12px rgba(0, 168, 150, 0.15)',
        'platform': '0 4px 12px rgba(99, 102, 241, 0.15)',
      },
      
      zIndex: {
        // Chakra UI v2 標準 z-index 系統
        ...tokens.zIndices,
      },
      
      backgroundImage: {
        // 餐廳背景圖片
        'hero-restaurant-desktop': "url('/images/hero/restaurant-hero-desktop.webp')",
        'hero-restaurant-mobile': "url('/images/hero/restaurant-hero-mobile.webp')",
        'hero-restaurant-desktop-jpg': "url('/images/hero/restaurant-hero-desktop.jpg')",
        'hero-restaurant-mobile-jpg': "url('/images/hero/restaurant-hero-mobile.jpg')",
        
        // 漸層遮罩
        'hero-gradient': 'linear-gradient(135deg, rgba(164, 120, 100, 0.8) 0%, rgba(164, 120, 100, 0.4) 50%, rgba(0, 0, 0, 0.6) 100%)',
        'hero-gradient-dark': 'linear-gradient(180deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.5) 100%)',
        
        // 網格紋理
        'grid-pattern': "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cdefs%3E%3Cpattern id=\"grid\" width=\"60\" height=\"60\" patternUnits=\"userSpaceOnUse\"%3E%3Cpath d=\"M 60 0 L 0 0 0 60\" fill=\"none\" stroke=\"rgba(255,255,255,0.05)\" stroke-width=\"1\"%3E%3C/path%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\"100%\" height=\"100%\" fill=\"url(%23grid)\"%3E%3C/rect%3E%3C/svg%3E')",
      },
      
      animation: {
        'reconciliation-scan': 'reconciliation-scan 2s ease-in-out',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in-scale': 'fadeInScale 1.2s ease-out',
        'parallax': 'parallax 20s ease-in-out infinite',
        
        // 微交互動畫
        'hover-scale': 'hoverScale 0.2s ease-out',
        'active-scale': 'activeScale 0.1s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
      },
      
      keyframes: {
        'reconciliation-scan': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        'fadeInScale': {
          '0%': { opacity: '0', transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'parallax': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'skeleton': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slideUp': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        
        // 微交互動畫關鍵幀
        'hoverScale': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.02)' },
        },
        'activeScale': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.98)' },
        },
        'bounceSoft': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              fontWeight: '500',
            },
            '[class~="lead"]': {
              color: 'inherit',
            },
            strong: {
              color: 'inherit',
              fontWeight: '600',
            },
            'ol[type="A"]': {
              '--list-counter-style': 'upper-alpha',
            },
            'ol[type="a"]': {
              '--list-counter-style': 'lower-alpha',
            },
            'ol[type="A" s]': {
              '--list-counter-style': 'upper-alpha',
            },
            'ol[type="a" s]': {
              '--list-counter-style': 'lower-alpha',
            },
            'ol[type="I"]': {
              '--list-counter-style': 'upper-roman',
            },
            'ol[type="i"]': {
              '--list-counter-style': 'lower-roman',
            },
            'ol[type="I" s]': {
              '--list-counter-style': 'upper-roman',
            },
            'ol[type="i" s]': {
              '--list-counter-style': 'lower-roman',
            },
            'ol[type="1"]': {
              '--list-counter-style': 'decimal',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
} satisfies Config

export default config