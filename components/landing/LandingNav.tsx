'use client'

/**
 * LandingNav — 井然 Orderly premium landing 的固定頂部導覽列。
 *
 * 視覺對應已核准 mockup 的 `nav.top`：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html（第 21-33、136-141 行）
 *   - sticky + backdrop-blur、底部分隔線、高度 62px（捲動後縮小並加陰影）
 *   - logo「井 Orderly」：Mocha 圓角方塊內含「井」字 + 文字
 *   - NAV_LINKS anchor 連結（桌機顯示，行動裝置收進漢堡選單）
 *   - 深色切換鈕（next-themes）、登入（ghost → /login）、預約 Demo（primary → /contact）
 *
 * 所有文案 / 連結一律來自 landingData（SSOT），元件不 hardcode。
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion, useReducedMotion } from 'framer-motion'
import { Menu, Moon, Sun, X } from 'lucide-react'
import { NAV_LINKS } from '@/components/landing/landingData'

export default function LandingNav() {
  const reduceMotion = useReducedMotion()
  const { resolvedTheme, setTheme } = useTheme()

  // next-themes：避免 SSR / client 主題不一致造成 hydration mismatch，
  // 切換鈕的 icon 等掛載後（mounted=true）再呈現實際主題狀態。
  const [mounted, setMounted] = useState(false)

  // 捲動偵測：超過 8px 後縮小高度並加陰影。
  const [scrolled, setScrolled] = useState(false)

  // 行動裝置漢堡選單開合。
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll() // 初次掛載時同步一次（處理重新整理時已捲動的情況）
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark')
  const closeMenu = () => setMenuOpen(false)

  return (
    <nav
      className={[
        'sticky top-0 z-50 w-full border-b transition-all duration-300',
        'border-gray-200 bg-white/90 backdrop-blur-md',
        'dark:border-gray-800 dark:bg-gray-900/90',
        scrolled ? 'shadow-md' : 'shadow-none',
      ].join(' ')}
    >
      <div className="container mx-auto px-4">
        <div
          className={[
            'flex items-center justify-between transition-all duration-300',
            scrolled ? 'h-14' : 'h-[62px]',
          ].join(' ')}
        >
          {/* Logo：井 Orderly */}
          <Link
            href="/"
            onClick={closeMenu}
            aria-label="井然 Orderly 首頁"
            className="flex items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span
              aria-hidden="true"
              className="grid h-[30px] w-[30px] place-items-center rounded-[7px] bg-primary-500 text-base font-black text-white"
            >
              井
            </span>
            <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              Orderly
            </span>
          </Link>

          {/* 桌機導覽連結 */}
          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded text-[14.5px] font-medium text-gray-600 transition-colors hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-300 dark:hover:text-primary-400"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 右側操作區 */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 深色 / 淺色切換 */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="切換深色模式"
              title="切換深色模式"
              className="grid h-[44px] w-[44px] place-items-center rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {/* 掛載前以中性 icon 佔位，避免 hydration mismatch */}
              {mounted ? (
                isDark ? (
                  <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
                )
              ) : (
                <Moon className="h-[18px] w-[18px] opacity-0" aria-hidden="true" />
              )}
            </button>

            {/* 登入（ghost）— 桌機顯示 */}
            <Link
              href="/login"
              className="hidden h-[44px] items-center rounded-md border border-gray-200 bg-transparent px-4 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800 sm:inline-flex"
            >
              登入
            </Link>

            {/* 預約 Demo（primary Mocha）— 桌機顯示 */}
            <Link
              href="/contact"
              className="hidden h-[44px] items-center rounded-md bg-primary-500 px-4 text-sm font-bold text-white transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 sm:inline-flex"
            >
              預約 Demo
            </Link>

            {/* 漢堡選單按鈕 — 行動裝置顯示 */}
            <button
              type="button"
              onClick={() => setMenuOpen(open => !open)}
              aria-label={menuOpen ? '關閉選單' : '開啟選單'}
              aria-expanded={menuOpen}
              aria-controls="landing-mobile-menu"
              className="grid h-[44px] w-[44px] place-items-center rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 md:hidden"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 行動裝置展開選單 */}
      {menuOpen && (
        <motion.div
          id="landing-mobile-menu"
          initial={reduceMotion ? false : { opacity: 1, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:hidden"
        >
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="flex min-h-[44px] items-center rounded-md px-3 text-base font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-primary-400"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-2 flex flex-col gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex min-h-[44px] items-center justify-center rounded-md border border-gray-200 bg-transparent px-4 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                登入
              </Link>
              <Link
                href="/contact"
                onClick={closeMenu}
                className="flex min-h-[44px] items-center justify-center rounded-md bg-primary-500 px-4 text-sm font-bold text-white transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              >
                預約 Demo
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  )
}
