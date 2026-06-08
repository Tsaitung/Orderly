'use client'

/**
 * PainSolution.tsx — landing 第 4 段「為什麼需要井然」。
 *
 * 兩欄 before/after 對照：
 *   左：紅調 pane（✕）= PAIN（人工逐筆對單的痛點）
 *   右：綠調 pane（✓）= SOLUTION（導入 Orderly 後的自動對帳）
 *
 * 文案／清單全數來自 landingData 的 PAIN / SOLUTION，元件不 hardcode 任何文字。
 * 對照 mockup 第 4 段（.pane.bad / .pane.good）的版面、紅綠底色與勾叉樣式。
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'

import { PAIN, SOLUTION, type ComparePane } from '@/components/landing/landingData'

interface PaneProps {
  pane: ComparePane
  /** bad = 痛點（紅調 ✕）；good = 解法（綠調 ✓）。 */
  variant: 'bad' | 'good'
}

function Pane({ pane, variant }: PaneProps) {
  const isBad = variant === 'bad'

  return (
    <div
      className={[
        'rounded-xl border p-6 md:p-7',
        isBad
          ? 'border-error/30 bg-red-50 dark:border-error/40 dark:bg-red-950/30'
          : 'border-success/30 bg-emerald-50 dark:border-success/40 dark:bg-emerald-950/30',
      ].join(' ')}
    >
      <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
        {pane.title}
      </h3>
      <ul className="space-y-1">
        {pane.items.map(item => (
          <li
            key={item}
            className="flex items-start gap-3 py-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300 md:text-[15px]"
          >
            <span
              className={[
                'mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
                isBad
                  ? 'bg-red-100 text-error dark:bg-red-900/50'
                  : 'bg-emerald-100 text-success dark:bg-emerald-900/50',
              ].join(' ')}
              aria-hidden="true"
            >
              {isBad ? (
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              ) : (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              )}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function PainSolution() {
  const prefersReducedMotion = useReducedMotion()

  const reveal = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 1, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
      }

  return (
    <section id="why" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div {...reveal}>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
            為什麼需要井然
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 md:text-4xl">
            人工對帳，正在吃掉你的利潤
          </h2>
        </motion.div>

        <motion.div {...reveal} className="mt-8 grid grid-cols-1 gap-6 md:mt-10 md:grid-cols-2">
          <Pane pane={PAIN} variant="bad" />
          <Pane pane={SOLUTION} variant="good" />
        </motion.div>
      </div>
    </section>
  )
}
