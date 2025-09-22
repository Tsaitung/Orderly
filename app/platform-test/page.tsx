'use client'

export default function PlatformTestPage() {
  const timestamp = new Date().toISOString()
  
  return (
    <div className="p-8 min-h-screen bg-white">
      <h1 className="text-2xl font-bold mb-4 text-green-600">✅ 平台管理測試頁面</h1>
      <p className="mb-2">✅ 如果您能看到這個頁面，說明路由是正常工作的。</p>
      <p className="mb-4">🕒 部署時間: {timestamp}</p>
      <div className="bg-gray-100 p-4 rounded">
        <p>環境信息:</p>
        <ul className="list-disc list-inside mt-2">
          <li>URL: {typeof window !== 'undefined' ? window.location.href : 'SSR'}</li>
          <li>環境: {process.env.NODE_ENV}</li>
          <li>是否瀏覽器: {typeof window !== 'undefined' ? '是' : '否'}</li>
        </ul>
      </div>
    </div>
  )
}