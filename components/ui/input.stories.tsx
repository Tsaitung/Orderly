import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'
import { Mail, Search, Eye, EyeOff, User, Phone } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '通用輸入框組件，支援多種變體、大小、圖標和驗證狀態。'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl']
    },
    variant: {
      control: 'select',
      options: ['default', 'error', 'success']
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url']
    },
    disabled: {
      control: 'boolean'
    }
  }
}

export default meta
type Story = StoryObj<typeof meta>

// 基本輸入框
export const Default: Story = {
  args: {
    placeholder: '請輸入內容...'
  }
}

// 帶標籤
export const WithLabel: Story = {
  args: {
    label: '用戶名稱',
    placeholder: '請輸入用戶名稱'
  }
}

// 帶幫助文字
export const WithHelperText: Story = {
  args: {
    label: '電子郵件',
    placeholder: 'example@orderly.com',
    helperText: '我們不會將您的電子郵件分享給第三方'
  }
}

// 錯誤狀態
export const WithError: Story = {
  args: {
    label: '密碼',
    type: 'password',
    placeholder: '請輸入密碼',
    error: '密碼長度必須至少 8 個字符'
  }
}

// 成功狀態
export const Success: Story = {
  args: {
    label: '電子郵件',
    variant: 'success',
    placeholder: 'example@orderly.com',
    value: 'user@orderly.com'
  }
}

// 大小變體
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input size="sm" placeholder="小尺寸輸入框" />
      <Input size="default" placeholder="預設尺寸輸入框" />
      <Input size="lg" placeholder="大尺寸輸入框" />
      <Input size="xl" placeholder="特大尺寸輸入框" />
    </div>
  )
}

// 帶圖標
export const WithIcons: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input 
        label="用戶名稱"
        leftIcon={<User />}
        placeholder="輸入用戶名稱"
      />
      <Input 
        label="電子郵件"
        leftIcon={<Mail />}
        placeholder="example@orderly.com"
      />
      <Input 
        label="搜尋"
        leftIcon={<Search />}
        placeholder="搜尋訂單..."
      />
      <Input 
        label="電話號碼"
        leftIcon={<Phone />}
        rightIcon={<span className="text-xs text-muted-foreground">TW</span>}
        placeholder="0912345678"
      />
    </div>
  )
}

// 密碼輸入框
const PasswordInput = () => {
  const [showPassword, setShowPassword] = useState(false)
  
  return (
    <Input
      label="密碼"
      type={showPassword ? 'text' : 'password'}
      placeholder="請輸入密碼"
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="hover:text-foreground transition-colors"
        >
          {showPassword ? <EyeOff /> : <Eye />}
        </button>
      }
    />
  )
}

export const PasswordField: Story = {
  render: () => <PasswordInput />
}

// 不同類型
export const InputTypes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input 
        label="文字"
        type="text"
        placeholder="輸入文字..."
      />
      <Input 
        label="電子郵件"
        type="email"
        placeholder="example@orderly.com"
      />
      <Input 
        label="密碼"
        type="password"
        placeholder="請輸入密碼"
      />
      <Input 
        label="數字"
        type="number"
        placeholder="輸入數字..."
        min="0"
        max="100"
      />
      <Input 
        label="電話"
        type="tel"
        placeholder="0912345678"
      />
      <Input 
        label="網址"
        type="url"
        placeholder="https://example.com"
      />
    </div>
  )
}

// 禁用狀態
export const Disabled: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input 
        label="禁用輸入框"
        placeholder="這是禁用的輸入框"
        disabled
      />
      <Input 
        label="帶值的禁用輸入框"
        value="無法編輯的內容"
        disabled
      />
    </div>
  )
}

// 表單驗證示例
export const FormValidation: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <h3 className="text-lg font-semibold">表單驗證示例</h3>
      
      <Input 
        label="供應商代碼 *"
        placeholder="SUP001"
        helperText="請輸入 3-10 位英數字代碼"
      />
      
      <Input 
        label="訂單金額 *"
        type="number"
        placeholder="0"
        leftIcon={<span className="text-sm text-muted-foreground">NT$</span>}
        helperText="最小金額為 100 元"
      />
      
      <Input 
        label="聯絡電話"
        type="tel"
        placeholder="0912345678"
        error="電話號碼格式不正確"
      />
      
      <Input 
        label="電子郵件 *"
        type="email"
        placeholder="supplier@example.com"
        variant="success"
        value="supplier@orderly.com"
        helperText="電子郵件格式正確"
      />
    </div>
  )
}

// 業務場景示例
export const BusinessScenarios: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div>
        <h3 className="text-lg font-semibold mb-4">訂單搜尋</h3>
        <Input 
          leftIcon={<Search />}
          placeholder="搜尋訂單編號、供應商..."
          size="lg"
        />
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-4">供應商資訊</h3>
        <div className="space-y-3">
          <Input 
            label="供應商名稱"
            placeholder="台灣優質食材有限公司"
          />
          <Input 
            label="統一編號"
            placeholder="12345678"
            helperText="8 位數字"
          />
          <Input 
            label="聯絡人"
            leftIcon={<User />}
            placeholder="王小明"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">對帳設定</h3>
        <div className="space-y-3">
          <Input 
            label="容差範圍"
            type="number"
            placeholder="5"
            rightIcon={<span className="text-sm text-muted-foreground">%</span>}
            helperText="自動對帳的金額容差範圍"
          />
          <Input 
            label="對帳週期"
            type="number"
            placeholder="7"
            rightIcon={<span className="text-sm text-muted-foreground">天</span>}
          />
        </div>
      </div>
    </div>
  )
}

// 響應式示例
export const Responsive: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <h3 className="text-lg font-semibold mb-4">響應式輸入框</h3>
      <div className="space-y-4">
        <Input 
          label="全寬輸入框"
          placeholder="在手機上會佔滿寬度"
          className="w-full"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="姓氏"
            placeholder="王"
          />
          <Input 
            label="名字"
            placeholder="小明"
          />
        </div>
      </div>
    </div>
  )
}