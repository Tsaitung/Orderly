'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [status, setStatus] = useState<{
    frontend: boolean;
    backend: boolean;
    api: any;
  }>({
    frontend: true,
    backend: false,
    api: null,
  });

  useEffect(() => {
    // 檢查後端 API 狀態
    const checkBackendStatus = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setStatus(prev => ({
          ...prev,
          backend: response.ok,
          api: data,
        }));
      } catch (error) {
        console.log('Backend not ready yet:', error);
        setStatus(prev => ({
          ...prev,
          backend: false,
          api: { error: 'Backend not available' },
        }));
      }
    };

    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-8">
        {/* 品牌標題 */}
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-primary-600">
            井然 Orderly
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            餐飲產業全鏈路數位供應平台
          </p>
          <p className="text-lg text-gray-500">
            下單 → 配送 → 驗收 → 對帳 → 結算，全流程井然有序
          </p>
        </div>

        {/* Hello World 訊息 */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-primary-500">
              Hello World! 🌟
            </h2>
            <p className="text-gray-600">
              歡迎來到 Orderly 平台，我們正在建立更美好的餐飲供應鏈生態系統
            </p>
          </div>
        </div>

        {/* 系統狀態 */}
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">系統狀態</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">前端服務</span>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  status.frontend ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm ${
                  status.frontend ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.frontend ? '運行中' : '離線'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">後端服務</span>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  status.backend ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className={`text-sm ${
                  status.backend ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {status.backend ? '運行中' : '準備中'}
                </span>
              </div>
            </div>
          </div>
          
          {status.api && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
              <pre>{JSON.stringify(status.api, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* 環境資訊 */}
        <div className="text-sm text-gray-400 space-y-1">
          <p>環境: {process.env.NODE_ENV || 'development'}</p>
          <p>版本: v1.0.0</p>
          <p>Build Time: {new Date().toLocaleString('zh-TW')}</p>
        </div>
      </div>
    </main>
  );
}