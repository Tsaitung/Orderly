/**
 * /terms — 服務條款（誠實佔位頁）。
 *
 * 與 /privacy 對稱：目前條款內容整理中，僅呈現標題、整理中說明與聯絡入口，
 * 不放任何捏造的法律條文。導覽列重用既有的 LandingNav；頁尾沿用 mockup 的
 * 深色頁尾樣式，連結一律取自 landingData 的 FOOTER（SSOT，無 hardcode、無死連結）。
 *
 * 視覺對應已核准 mockup 的 footer 區塊：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html（第 268-276 行）
 *
 * 純靜態內容，無互動 / 動畫，因此維持 Server Component（LandingNav 為 client，
 * 作為子元件嵌入不受影響）。
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Mail } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import { FOOTER } from '@/components/landing/landingData'

export const metadata: Metadata = {
  title: '服務條款 - 井然 Orderly',
  description: '井然 Orderly 服務條款。完整條款內容整理中，如有疑問請與我們聯絡。',
}

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-950">
      <LandingNav />

      {/* 主內容：標題 + 整理中說明 + 聯絡入口 */}
      <main className="flex-1">
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                Legal
              </span>

              <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 md:text-4xl">
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400"
                >
                  <FileText className="h-6 w-6" />
                </span>
                服務條款
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
                本條款內容整理中，完整版本將於正式上線前公布。
              </p>
              <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                在此之前，若您對使用井然 Orderly
                的權利義務、服務範圍或合約事項有任何疑問，歡迎直接與我們聯絡，我們會儘速協助說明。
              </p>

              {/* 聯絡入口 CTA */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary-500 px-5 text-sm font-bold text-white transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
                >
                  <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
                  聯絡我們
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-gray-200 bg-white px-5 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  隱私權政策
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 頁尾：沿用 mockup 深色頁尾，連結取自 FOOTER（SSOT） */}
      <footer className="bg-[#1f2430] text-[#cfc8c0]">
        <div className="container mx-auto px-4 pb-7 pt-14">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* 品牌欄 */}
            <div>
              <Link
                href="/"
                aria-label="井然 Orderly 首頁"
                className="inline-flex items-center gap-2.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <span
                  aria-hidden="true"
                  className="grid h-[30px] w-[30px] place-items-center rounded-[7px] bg-primary-500 text-base font-black text-white"
                >
                  井
                </span>
                <span className="text-lg font-extrabold tracking-tight text-white">Orderly</span>
              </Link>
              <p className="mt-3 text-[13px] text-[#8b94a3]">餐飲供應鏈全鏈路數位對帳平台</p>
            </div>

            {/* 連結欄（產品 / 方案 / 公司）— 全取自 FOOTER SSOT */}
            {FOOTER.map(column => (
              <div key={column.title}>
                <h2 className="mb-3.5 text-sm font-bold text-white">{column.title}</h2>
                <ul className="space-y-1">
                  {column.links.map(link => (
                    <li key={`${column.title}-${link.href}`}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-[36px] items-center py-1 text-[13.5px] text-[#cfc8c0] transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 底部版權列 */}
          <div className="mt-8 flex flex-col gap-2 border-t border-[#36404e] pt-5 text-[12.5px] text-[#8b94a3] sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 井然 Orderly</span>
            <span>繁體中文 · 台灣</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
