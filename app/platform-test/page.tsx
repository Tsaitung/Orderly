'use client'

export default function PlatformTestPage() {
  const timestamp = new Date().toISOString()

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="mb-4 text-2xl font-bold text-green-600">✅ 平台管理測試頁面</h1>
      <p className="mb-2">✅ 如果您能看到這個頁面，說明路由是正常工作的。</p>
      <p className="mb-4">🕒 部署時間: {timestamp}</p>
      <div className="rounded bg-gray-100 p-4">
        <p>環境信息:</p>
        <ul className="mt-2 list-inside list-disc">
          <li>URL: {typeof window !== 'undefined' ? window.location.href : 'SSR'}</li>
          <li>環境: {process.env.NODE_ENV}</li>
          <li>是否瀏覽器: {typeof window !== 'undefined' ? '是' : '否'}</li>
        </ul>
      </div>
    </div>
  )
}
