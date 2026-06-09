'use client'

export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-blue-50 p-8">
      <h1 className="mb-4 text-3xl font-bold text-blue-600">🟢 簡單測試頁面</h1>
      <p className="mb-4 text-xl">這是一個完全沒有認證檢查的測試頁面</p>
      <p>時間戳: {new Date().toISOString()}</p>
      <div className="mt-6 rounded bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">測試結果:</h2>
        <p>✅ 如果您看到這個頁面，說明 Next.js 路由是正常工作的</p>
        <p>✅ 沒有任何 middleware 或 AuthGuard 阻擋</p>
      </div>
    </div>
  )
}
