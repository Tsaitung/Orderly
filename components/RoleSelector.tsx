'use client'

import Link from 'next/link'
import { 
  ChefHat, 
  Truck, 
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Clock,
  BarChart3,
  Package,
  FileText,
  DollarSign,
  Users,
  ShieldCheck
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function RoleSelector() {
  const restaurantFeatures = [
    {
      icon: <Clock className="h-5 w-5" />,
      title: '智能對帳系統',
      description: '8小時縮短至30分鐘，準確率95%',
      highlight: true
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: '自動化訂單管理',
      description: '一鍵下單，即時追蹤配送狀態'
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: '成本分析報表',
      description: '即時掌握採購成本與趨勢'
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: '驗收拍照存證',
      description: '完整記錄，避免爭議'
    }
  ]

  const supplierFeatures = [
    {
      icon: <Package className="h-5 w-5" />,
      title: '訂單管理中心',
      description: '統一管理所有餐廳訂單',
      highlight: true
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: '自動開票結算',
      description: '發票自動生成，加速收款'
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: '客戶關係管理',
      description: '完整客戶資料與交易歷史'
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: '營收分析報表',
      description: '即時掌握業績表現'
    }
  ]

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            選擇您的角色
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            根據您的業務需求，選擇適合的管理介面。無論您是餐廳經營者還是供應商，
            我們都提供專屬的解決方案。
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Restaurant Card */}
          <Card className="relative overflow-hidden hover:shadow-xl transition-shadow duration-300 border-2 border-transparent hover:border-primary-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-transparent rounded-bl-full opacity-50" />
            
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <ChefHat className="h-8 w-8 text-primary-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-1">餐廳管理系統</CardTitle>
                    <Badge variant="outline" className="bg-primary-50">
                      適合餐飲業者
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Key Metric */}
              <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-primary-600 font-medium">對帳效率提升</p>
                    <p className="text-3xl font-bold text-primary-700">90%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary-500" />
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                {restaurantFeatures.map((feature, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                      feature.highlight ? "bg-primary-50/50" : "hover:bg-gray-50"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 mt-0.5",
                      feature.highlight ? "text-primary-600" : "text-gray-400"
                    )}>
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-0.5">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Link href="/restaurant" className="block">
                <Button className="w-full bg-primary-600 hover:bg-primary-700 text-white group">
                  <span>進入餐廳管理介面</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              {/* Demo Account Info */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="text-gray-600 mb-1">體驗帳號</p>
                <div className="font-mono text-xs space-y-1">
                  <p>帳號: restaurant@demo.orderly.tw</p>
                  <p>密碼: demo1234</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Card */}
          <Card className="relative overflow-hidden hover:shadow-xl transition-shadow duration-300 border-2 border-transparent hover:border-blue-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-bl-full opacity-50" />
            
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Truck className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-1">供應商管理系統</CardTitle>
                    <Badge variant="outline" className="bg-blue-50">
                      適合食材供應商
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Key Metric */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">收款週期縮短</p>
                    <p className="text-3xl font-bold text-blue-700">50%</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-3">
                {supplierFeatures.map((feature, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-start space-x-3 p-3 rounded-lg transition-colors",
                      feature.highlight ? "bg-blue-50/50" : "hover:bg-gray-50"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 mt-0.5",
                      feature.highlight ? "text-blue-600" : "text-gray-400"
                    )}>
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-0.5">
                        {feature.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Link href="/supplier" className="block">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white group">
                  <span>進入供應商管理介面</span>
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              {/* Demo Account Info */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="text-gray-600 mb-1">體驗帳號</p>
                <div className="font-mono text-xs space-y-1">
                  <p>帳號: supplier@demo.orderly.tw</p>
                  <p>密碼: demo1234</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Section */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            不確定哪個適合您？
          </p>
          <Button variant="outline" size="lg" className="group">
            <span>查看功能比較表</span>
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  )
}