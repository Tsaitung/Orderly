'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Info, 
  X, 
  ChefHat, 
  Truck, 
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DemoModeBannerProps {
  currentRole?: 'restaurant' | 'supplier'
}

export function DemoModeBanner({ currentRole }: DemoModeBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className={cn(
      "relative bg-gradient-to-r py-3 px-4 text-white",
      currentRole === 'restaurant' 
        ? "from-primary-600 to-primary-700" 
        : currentRole === 'supplier'
        ? "from-blue-600 to-blue-700"
        : "from-gray-700 to-gray-800"
    )}>
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-yellow-300" />
            <span className="font-medium">體驗模式</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-2 text-sm">
            {currentRole === 'restaurant' ? (
              <>
                <ChefHat className="h-4 w-4" />
                <span>您正在體驗餐廳管理介面</span>
                <span className="text-primary-200">|</span>
                <Link 
                  href="/supplier" 
                  className="underline hover:text-primary-100 flex items-center space-x-1"
                >
                  <span>切換至供應商介面</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            ) : currentRole === 'supplier' ? (
              <>
                <Truck className="h-4 w-4" />
                <span>您正在體驗供應商管理介面</span>
                <span className="text-blue-200">|</span>
                <Link 
                  href="/restaurant" 
                  className="underline hover:text-blue-100 flex items-center space-x-1"
                >
                  <span>切換至餐廳介面</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </>
            ) : (
              <>
                <Info className="h-4 w-4" />
                <span>歡迎體驗 Orderly 平台</span>
                <span className="text-gray-400">|</span>
                <div className="flex items-center space-x-3">
                  <Link 
                    href="/restaurant" 
                    className="underline hover:text-gray-100 flex items-center space-x-1"
                  >
                    <ChefHat className="h-3 w-3" />
                    <span>餐廳介面</span>
                  </Link>
                  <span className="text-gray-400">或</span>
                  <Link 
                    href="/supplier" 
                    className="underline hover:text-gray-100 flex items-center space-x-1"
                  >
                    <Truck className="h-3 w-3" />
                    <span>供應商介面</span>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile Version */}
          <div className="md:hidden text-sm">
            {currentRole === 'restaurant' ? (
              <span className="flex items-center space-x-1">
                <ChefHat className="h-4 w-4" />
                <span>餐廳模式</span>
              </span>
            ) : currentRole === 'supplier' ? (
              <span className="flex items-center space-x-1">
                <Truck className="h-4 w-4" />
                <span>供應商模式</span>
              </span>
            ) : (
              <span>選擇體驗模式</span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Quick Switch Buttons for Mobile */}
          <div className="md:hidden flex items-center space-x-2">
            {currentRole !== 'restaurant' && (
              <Link href="/restaurant">
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-7 px-2">
                  <ChefHat className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {currentRole !== 'supplier' && (
              <Link href="/supplier">
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-7 px-2">
                  <Truck className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 h-7 w-7 p-0"
            onClick={() => setIsVisible(false)}
            aria-label="關閉體驗模式提示"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}