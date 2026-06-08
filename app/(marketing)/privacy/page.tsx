'use client'

/**
 * /privacy — 隱私權政策（誠實佔位頁）。
 *
 * 目前為佔位內容：正式隱私權政策尚未定稿，本頁僅說明此事並引導使用者
 * 來信或前往「聯絡我們」頁詢問。嚴禁在此填入任何捏造的法律條文。
 *
 * 頁面組成（與 landing 一致的 chrome）：
 *   <LandingNav/>（固定頂部導覽，default export）
 *   主體：section heading 樣式 —「隱私權政策」+ 整理中說明 + 聯絡我們連結
 *   <LandingFooter/>（深色頁尾，default export）
 *
 * 站內路由與 anchor 一律用 next/link。section 進場採 reveal-on-scroll，
 * 尊重 prefers-reduced-motion（reduced 時直接呈現最終狀態）。
 */

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Mail, ArrowRight } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'

/** 聯絡信箱（mockup 既有對外信箱；非機密，作為佔位頁的詢問管道）。 */
const CONTACT_EMAIL = 'contact@orderly.tw'

export default function PrivacyPage() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <LandingNav />

      <main className="flex-1">
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <motion.div
              className="mx-auto max-w-2xl"
              initial={reduceMotion ? false : { opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: reduceMotion ? 0 : 0.5 }}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                Privacy
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                隱私權政策
              </h1>
              <p className="mt-5 text-base leading-relaxed text-gray-600 dark:text-gray-300">
                本政策內容整理中，正式版上線前如有疑問請來信{' '}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-primary-600 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400"
                >
                  {CONTACT_EMAIL}
                </a>{' '}
                或透過聯絡我們頁面詢問。
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
                >
                  聯絡我們
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  來信詢問
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
