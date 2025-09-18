import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import { Mail, Plus, Download, Trash2 } from 'lucide-react'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '通用按鈕組件，支援多種變體、大小和狀態。設計符合 Orderly 品牌規範。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'brand', 'success', 'warning']
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon']
    },
    loading: {
      control: 'boolean'
    },
    disabled: {
      control: 'boolean'
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

// 基本變體
export const Default: Story = {
  args: {
    children: '預設按鈕'
  }
}

export const Brand: Story = {
  args: {
    variant: 'brand',
    children: '品牌按鈕'
  }
}

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: '刪除按鈕'
  }
}

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: '外框按鈕'
  }
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: '次要按鈕'
  }
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: '幽靈按鈕'
  }
}

export const Link: Story = {
  args: {
    variant: 'link',
    children: '鏈接按鈕'
  }
}

export const Success: Story = {
  args: {
    variant: 'success',
    children: '成功按鈕'
  }
}

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: '警告按鈕'
  }
}

// 大小變體
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">小按鈕</Button>
      <Button size="default">預設按鈕</Button>
      <Button size="lg">大按鈕</Button>
      <Button size="xl">特大按鈕</Button>
    </div>
  )
}

// 圖標按鈕
export const WithIcons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button leftIcon={<Mail />}>
        發送郵件
      </Button>
      <Button variant="brand" rightIcon={<Plus />}>
        新增項目
      </Button>
      <Button variant="outline" leftIcon={<Download />}>
        下載文件
      </Button>
      <Button size="icon" variant="destructive">
        <Trash2 />
      </Button>
    </div>
  )
}

// 載入狀態
export const Loading: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button loading>
        載入中...
      </Button>
      <Button variant="brand" loading>
        處理中...
      </Button>
      <Button variant="outline" loading>
        同步中...
      </Button>
    </div>
  )
}

// 禁用狀態
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button disabled>
        禁用按鈕
      </Button>
      <Button variant="brand" disabled>
        禁用品牌按鈕
      </Button>
      <Button variant="outline" disabled>
        禁用外框按鈕
      </Button>
    </div>
  )
}

// 業務場景示例
export const BusinessScenarios: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">訂單操作</h3>
        <div className="flex items-center gap-3">
          <Button variant="brand">
            確認訂單
          </Button>
          <Button variant="outline">
            編輯訂單
          </Button>
          <Button variant="destructive">
            取消訂單
          </Button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">對帳操作</h3>
        <div className="flex items-center gap-3">
          <Button variant="success">
            審核通過
          </Button>
          <Button variant="warning">
            需要確認
          </Button>
          <Button variant="ghost">
            跳過此項
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">批量操作</h3>
        <div className="flex items-center gap-3">
          <Button variant="brand" leftIcon={<Plus />}>
            批量匯入
          </Button>
          <Button variant="outline" leftIcon={<Download />}>
            批量匯出
          </Button>
          <Button variant="secondary">
            全選
          </Button>
        </div>
      </div>
    </div>
  )
}

// 響應式示例
export const Responsive: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">響應式按鈕</h3>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button className="w-full sm:w-auto">
          手機端全寬
        </Button>
        <Button variant="brand" className="w-full sm:w-auto">
          桌面端自適應
        </Button>
      </div>
    </div>
  )
}

// 無障礙示例
export const Accessibility: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">無障礙設計</h3>
      <div className="flex items-center gap-4">
        <Button 
          aria-label="關閉對話框"
          size="icon"
        >
          ×
        </Button>
        <Button 
          aria-describedby="save-help"
          variant="brand"
        >
          儲存變更
        </Button>
        <div id="save-help" className="text-sm text-muted-foreground">
          Ctrl+S 快捷鍵也可以儲存
        </div>
      </div>
    </div>
  )
}