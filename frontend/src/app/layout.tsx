import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '井然 Orderly - 餐飲產業全鏈路數位供應平台',
  description: '透過單一介面串接餐廳與供應商，讓「下單 → 配送 → 驗收 → 對帳 → 結算」全流程井然有序',
  keywords: ['餐飲', '供應鏈', '數位平台', '井然', 'Orderly'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
          {children}
        </div>
      </body>
    </html>
  );
}