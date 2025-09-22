'use client'

export default function SimpleTestPage() {
  return (
    <div className="p-8 min-h-screen bg-blue-50">
      <h1 className="text-3xl font-bold mb-4 text-blue-600">🟢 簡單測試頁面</h1>
      <p className="text-xl mb-4">這是一個完全沒有認證檢查的測試頁面</p>
      <p>時間戳: {new Date().toISOString()}</p>
      <div className="mt-6 p-4 bg-white rounded shadow">
        <h2 className="text-lg font-semibold mb-2">測試結果:</h2>
        <p>✅ 如果您看到這個頁面，說明 Next.js 路由是正常工作的</p>
        <p>✅ 沒有任何 middleware 或 AuthGuard 阻擋</p>
      </div>
    </div>
  )
}