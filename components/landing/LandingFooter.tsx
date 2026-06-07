'use client'

/**
 * LandingFooter — 井然 Orderly premium landing 的深色頁尾。
 *
 * 視覺對應已核准 mockup 的 `footer`：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html（第 122-128、267-276 行）
 *   - 深色底（#1f2430 ≈ bg-gray-900），淺灰文字（#cfc8c0 ≈ text-gray-300/400）
 *   - 4 欄 grid：品牌簡介（1.4fr）＋ 產品 / 方案 / 公司 三欄（各 1fr）
 *   - 連結 hover 轉白；底部分隔線上方一條 fbar（左：版權，右：語系・地區）
 *   - 行動裝置（≤860px）四欄塌成單欄
 *
 * 連結欄資料一律來自 landingData 的 FOOTER（SSOT），元件不 hardcode 任何連結；
 * 公司欄僅含 /contact /privacy /terms（無 /about）。品牌簡介與底部版權字串屬
 * 頁尾固定 chrome（mockup 文案），非 landingData 內容。
 *
 * 站內路由（/restaurant、/contact…）用 next/link；in-page anchor（#features…）
 * 亦用 Link，與 LandingNav 慣例一致。整個頁尾以 reveal-on-scroll 進場（尊重
 * prefers-reduced-motion）。
 */

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { FOOTER } from '@/components/landing/landingData'

/** 品牌簡介（mockup footer 第 270 行；非 landingData 內容，屬頁尾固定 chrome）。 */
const BRAND_BLURB = '餐飲供應鏈全鏈路數位對帳平台'

export default function LandingFooter() {
  const reduceMotion = useReducedMotion()

  return (
    <footer className="bg-gray-900 text-gray-400">
      <motion.div
        className="container mx-auto px-4 py-14"
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: reduceMotion ? 0 : 0.5 }}
      >
        {/* 4 欄：品牌簡介（較寬）＋ 產品 / 方案 / 公司 */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-8">
          {/* 品牌簡介欄 */}
          <div>
            <Link
              href="/"
              aria-label="井然 Orderly 首頁"
              className="inline-flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              <span
                aria-hidden="true"
                className="grid h-[30px] w-[30px] place-items-center rounded-[7px] bg-primary-500 text-base font-black text-white"
              >
                井
              </span>
              <span className="text-lg font-extrabold tracking-tight text-white">
                Orderly
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-500">
              {BRAND_BLURB}
            </p>
          </div>

          {/* 連結欄：產品 / 方案 / 公司（資料來自 FOOTER SSOT） */}
          {FOOTER.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="mb-3 text-sm font-bold text-white">
                {column.title}
              </h2>
              <ul className="space-y-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-[44px] items-center rounded text-sm text-gray-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 md:min-h-0 md:py-1"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* 底部資訊列：版權 ・ 語系 ・ 地區 */}
        <div className="mt-9 flex flex-col gap-2 border-t border-gray-800 pt-5 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 井然 Orderly · 繁體中文 · 台灣</p>
        </div>
      </motion.div>
    </footer>
  )
}
