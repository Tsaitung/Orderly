import type { Meta, StoryObj } from '@storybook/react'

const Welcome = () => (
  <div className="max-w-4xl mx-auto p-8">
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-[#A47864] mb-4">
        歡迎使用 Orderly 組件庫
      </h1>
      <p className="text-lg text-gray-600">
        井然 Orderly - 餐飲產業全鏈路數位供應平台
      </p>
    </div>

    <div className="bg-[#F5F2ED] rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-4 text-[#A47864]">
        組件庫特色
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">🎨 品牌一致性</h3>
          <p className="text-sm text-gray-600">
            遵循 Orderly 品牌規範，主色調為 Mocha Mousse (#A47864)
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">♿ 無障礙設計</h3>
          <p className="text-sm text-gray-600">
            符合 WCAG 2.1 AA 標準，確保所有用戶都能使用
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">📱 響應式設計</h3>
          <p className="text-sm text-gray-600">
            適配各種螢幕尺寸，從手機到桌面都有最佳體驗
          </p>
        </div>
        <div>
          <h3 className="font-semibold mb-2">🧩 模組化架構</h3>
          <p className="text-sm text-gray-600">
            可重複使用的組件，提高開發效率和一致性
          </p>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        可用組件
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">🔘</div>
          <div className="font-medium">Button</div>
          <div className="text-xs text-gray-500">按鈕組件</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">📝</div>
          <div className="font-medium">Input</div>
          <div className="text-xs text-gray-500">輸入框組件</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">🃏</div>
          <div className="font-medium">Card</div>
          <div className="text-xs text-gray-500">卡片組件</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">🏷️</div>
          <div className="font-medium">Badge</div>
          <div className="text-xs text-gray-500">徽章組件</div>
        </div>
      </div>
    </div>

    <div className="text-center">
      <p className="text-gray-600 mb-4">
        使用左側導航探索各種組件和它們的用法範例
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#A47864] text-white rounded-lg">
        <span>開始探索</span>
        <span>→</span>
      </div>
    </div>
  </div>
)

const meta: Meta<typeof Welcome> = {
  title: '歡迎/介紹',
  component: Welcome,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Orderly 組件庫的歡迎頁面，介紹組件庫的特色和可用組件。'
      }
    }
  },
  tags: ['autodocs']
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}