import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
import { Button } from './button'
import { Badge, OrderStatusBadge } from './badge'
import { Package, TrendingUp, Clock, CheckCircle } from 'lucide-react'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '通用卡片組件，用於組織和展示相關內容。支援多種變體和內邊距選項。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'ghost']
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'default', 'lg']
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

// 基本卡片
export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>卡片標題</CardTitle>
          <CardDescription>這是卡片的描述文字</CardDescription>
        </CardHeader>
        <CardContent>
          <p>這裡是卡片的主要內容。可以包含任何你想要展示的信息。</p>
        </CardContent>
        <CardFooter>
          <Button>主要操作</Button>
          <Button variant="outline">次要操作</Button>
        </CardFooter>
      </>
    )
  }
}

// 變體示例
export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
      <Card variant="default">
        <CardHeader>
          <CardTitle>預設卡片</CardTitle>
          <CardDescription>標準邊框和陰影</CardDescription>
        </CardHeader>
        <CardContent>
          <p>這是預設樣式的卡片</p>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle>提升卡片</CardTitle>
          <CardDescription>更明顯的陰影效果</CardDescription>
        </CardHeader>
        <CardContent>
          <p>這是提升樣式的卡片</p>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader>
          <CardTitle>外框卡片</CardTitle>
          <CardDescription>加粗的邊框樣式</CardDescription>
        </CardHeader>
        <CardContent>
          <p>這是外框樣式的卡片</p>
        </CardContent>
      </Card>

      <Card variant="ghost">
        <CardHeader>
          <CardTitle>幽靈卡片</CardTitle>
          <CardDescription>無邊框和陰影</CardDescription>
        </CardHeader>
        <CardContent>
          <p>這是幽靈樣式的卡片</p>
        </CardContent>
      </Card>
    </div>
  )
}

// 內邊距示例
export const PaddingVariants: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
      <Card padding="sm">
        <CardTitle>小內邊距</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          適用於緊湊的佈局
        </p>
      </Card>

      <Card padding="default">
        <CardTitle>預設內邊距</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          標準的內邊距大小
        </p>
      </Card>

      <Card padding="lg">
        <CardTitle>大內邊距</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          適用於重要內容的展示
        </p>
      </Card>

      <Card padding="none" className="p-0">
        <div className="p-6">
          <CardTitle>無內邊距</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            完全自定義內邊距
          </p>
        </div>
      </Card>
    </div>
  )
}

// 業務場景 - 訂單卡片
export const OrderCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            訂單 #ORD20241201001
          </CardTitle>
          <OrderStatusBadge status="confirmed" />
        </div>
        <CardDescription>
          供應商：台灣優質食材有限公司
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">訂單日期：</span>
            <span>2024/12/01</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">預計交期：</span>
            <span>2024/12/03</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">訂單金額：</span>
            <span className="font-semibold">NT$ 45,200</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">商品項目：</span>
            <span>12 項</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="brand" size="sm">
          查看詳情
        </Button>
        <Button variant="outline" size="sm">
          編輯訂單
        </Button>
        <Button variant="destructive" size="sm">
          取消訂單
        </Button>
      </CardFooter>
    </Card>
  )
}

// 業務場景 - 對帳卡片
export const ReconciliationCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            對帳結果
          </CardTitle>
          <Badge variant="success">95% 匹配</Badge>
        </div>
        <CardDescription>
          訂單 #ORD20241201001 與發票的對帳結果
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">23</div>
              <div className="text-xs text-muted-foreground">完全匹配</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">2</div>
              <div className="text-xs text-muted-foreground">需確認</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-xs text-muted-foreground">有爭議</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">訂單金額：</span>
              <span>NT$ 45,200</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">發票金額：</span>
              <span>NT$ 45,150</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-muted-foreground">差異金額：</span>
              <span className="text-yellow-600">NT$ 50</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="success" size="sm">
          確認對帳
        </Button>
        <Button variant="outline" size="sm">
          查看詳情
        </Button>
      </CardFooter>
    </Card>
  )
}

// 業務場景 - 統計卡片
export const StatCard: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                本月訂單
              </p>
              <p className="text-2xl font-bold">1,248</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12.5%
              </p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                待對帳
              </p>
              <p className="text-2xl font-bold">23</p>
              <p className="text-xs text-yellow-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                需處理
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                訂單金額
              </p>
              <p className="text-2xl font-bold">NT$ 2.4M</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +8.2%
              </p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                對帳準確率
              </p>
              <p className="text-2xl font-bold">97.3%</p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +2.1%
              </p>
            </div>
            <div className="text-2xl">🎯</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 空狀態卡片
export const EmptyState: Story = {
  render: () => (
    <Card className="w-96 text-center">
      <CardContent className="py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <CardTitle className="mb-2">暫無訂單</CardTitle>
        <CardDescription className="mb-6">
          您還沒有任何訂單，點擊下方按鈕開始創建第一個訂單。
        </CardDescription>
        <Button variant="brand">
          創建訂單
        </Button>
      </CardContent>
    </Card>
  )
}

// 載入狀態卡片
export const LoadingState: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-6 w-16 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
      </CardFooter>
    </Card>
  )
}

// 響應式佈局
export const ResponsiveLayout: Story = {
  render: () => (
    <div className="w-full max-w-6xl">
      <h3 className="text-lg font-semibold mb-6">響應式卡片佈局</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>卡片 #{i + 1}</CardTitle>
              <CardDescription>
                這是第 {i + 1} 個響應式卡片
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                在不同螢幕尺寸下會自動調整佈局：
                手機端單列，平板端雙列，桌面端三列。
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                查看詳情
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}