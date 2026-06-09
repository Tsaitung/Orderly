'use client'

/**
 * ReconciliationShowcase — 招牌功能區塊（id="reconciliation"）。
 *
 * 視覺對應已核准 mockup 的 `.showcase` 區段：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html (L196-209)
 *   - 深色 mocha 漸層底（#2a1c14 → #4a3526）
 *   - section label「招牌功能」(淺膚色 #f0c9b6) → h2「AI 對帳，差異看得見」(白) → lead (#e8ddd5)
 *   - 白色 `.scard` 卡片浮在深底之上（box-shadow:0 24px 60px rgba(0,0,0,.4)）
 *
 * 卡片內直接嵌入既有的 `ReconciliationDemo`（具名匯出、無 props），不重寫該元件。
 * 卡片頂部有一條 confidence-fill / scan 動態強調線（mocha → 綠漸層的掃描感），
 * 對應 mockup 的 .bar>i（linear-gradient(90deg,var(--mocha),var(--ok))）與品牌的
 * `reconciliation-scan` 動畫；尊重 prefers-reduced-motion，關閉時顯示靜態最終狀態。
 *
 * 區塊標題/lead 文案逐字取自核准 mockup（landingData 未針對本區塊提供文案 export）；
 * 卡片頁尾 CTA 重用 landingData 的真實路由（HERO.primaryCta → /contact）。
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'

import { ReconciliationDemo } from '@/components/ReconciliationDemo'
import { HERO } from '@/components/landing/landingData'

// 區塊文案 — 逐字對應已核准 mockup 的 .showcase 區段（非 landingData export）。
const SECTION_LABEL = '招牌功能'
const SECTION_TITLE = 'AI 對帳，差異看得見'
const SECTION_LEAD =
  '即時自動比對，每一筆標出信心分數與差異金額。高信心自動過，有差異的才需要你看。'

export function ReconciliationShowcase() {
  const reduceMotion = useReducedMotion()

  // 進場動畫：保持內容可見，只用位移營造進場；reduced-motion 直接顯示終態。
  const reveal = reduceMotion
    ? { initial: { opacity: 1, y: 0 }, whileInView: { opacity: 1, y: 0 } }
    : { initial: { opacity: 1, y: 24 }, whileInView: { opacity: 1, y: 0 } }

  return (
    <section
      id="reconciliation"
      className="bg-gradient-to-br from-[#2a1c14] to-[#4a3526] py-16 text-white md:py-20"
    >
      <div className="container mx-auto px-4">
        {/* 標題群 */}
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#f0c9b6]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {SECTION_LABEL}
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {SECTION_TITLE}
          </h2>
          <p className="mx-auto mt-3 text-base leading-relaxed text-[#e8ddd5]">{SECTION_LEAD}</p>
        </motion.div>

        {/* 白色卡片 — 浮在深色 mocha 底之上，內嵌既有 ReconciliationDemo */}
        <motion.div
          className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(0,0,0,0.4)] dark:bg-gray-900 dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
          initial={reveal.initial}
          whileInView={reveal.whileInView}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.1 }}
        >
          {/* 強調線：confidence-fill（常駐 mocha → 綠 漸層）+ 掃描高光（reduced-motion 時隱藏） */}
          <div className="relative h-1 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            {/* 常駐 confidence-fill：永遠顯示，作為靜態 / reduced-motion fallback */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-primary-500 via-primary-400 to-success"
              aria-hidden="true"
            />
            {/* 掃描高光：在漸層上來回掃，reduced-motion 時不渲染 */}
            {!reduceMotion && (
              <div
                className="absolute inset-y-0 left-0 w-1/3 animate-reconciliation-scan bg-gradient-to-r from-transparent via-white/70 to-transparent"
                aria-hidden="true"
              />
            )}
          </div>

          {/* 卡片主體：sample 標示 + 既有對帳演示元件 */}
          <div className="p-5 md:p-8">
            <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
              以下為互動式對帳演示（示意）
            </p>

            <ReconciliationDemo />

            {/* 卡片頁尾 CTA — 重用真實路由（/contact），避免死連結 */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 sm:flex-row">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                想看你家的單據怎麼跑？
              </span>
              <a
                href={HERO.primaryCta.href}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-primary-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                {HERO.primaryCta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ReconciliationShowcase
