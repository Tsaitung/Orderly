'use client'

/**
 * Pricing.tsx — landing 第 9 段「定價」。
 *
 * 三張方案卡：免費版 / 專業版（popular，加「最受歡迎」緞帶 + 抬升強調）/ 企業版。
 * 每張卡：方案名、價格（mono 大字）+ 計費週期、模組清單（✓）、CTA 按鈕。
 * CTA 連結一律來自 landingData 的真實 href（/register 或 /contact）。
 *
 * 文案／價格／模組清單／註腳全數來自 landingData 的 PRICING / PRICING_NOTE，
 * 元件不 hardcode 任何文字或數字。定價為真實級距，故不標「（示意）」。
 * 對照 mockup 第 9 段（.pgrid / .pcard / .pcard.hot / .ribbon / .price / .pnote）。
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'

import { PRICING, PRICING_NOTE, type PricingTier } from '@/components/landing/landingData'

interface PricingCardProps {
  tier: PricingTier
}

function PricingCard({ tier }: PricingCardProps) {
  const isHot = tier.popular

  return (
    <div
      className={[
        'relative flex h-full flex-col rounded-2xl p-7 md:p-8',
        isHot
          ? // 強調卡：mocha 邊框 + 陰影 + 在桌面抬升，對應 mockup .pcard.hot
            'border-2 border-primary-500 bg-white shadow-xl shadow-primary-500/20 dark:bg-gray-900 md:-translate-y-2'
          : 'border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
      ].join(' ')}
    >
      {/* 「最受歡迎」緞帶，對應 mockup .ribbon */}
      {isHot && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-500 px-3.5 py-1 text-xs font-bold text-white shadow-sm">
          最受歡迎
        </span>
      )}

      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">{tier.name}</h3>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-4xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-gray-100">
          {tier.price}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{tier.period}</span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {tier.modules.map(module => (
          <li
            key={module}
            className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
          >
            <Check
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-success"
              strokeWidth={3}
              aria-hidden="true"
            />
            <span>{module}</span>
          </li>
        ))}
      </ul>

      {/* CTA 推到卡片底部（mt-auto），三卡按鈕對齊 */}
      <a
        href={tier.cta.href}
        className={[
          'mt-auto inline-flex min-h-[44px] w-full items-center justify-center rounded-md px-5 py-2.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
          // 強調卡用實心 mocha；其餘用 ghost 邊框
          isHot
            ? 'bg-primary-500 text-white hover:bg-primary-600'
            : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800',
        ].join(' ')}
      >
        {tier.cta.label}
      </a>
    </div>
  )
}

export default function Pricing() {
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
    <section id="pricing" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div {...reveal} className="text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">
            定價
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 md:text-4xl">
            從免費開始，隨規模成長
          </h2>
        </motion.div>

        {/* hot 卡有 -translate-y-2，items-stretch 讓三卡等高、頂部對齊以容納抬升與緞帶 */}
        <motion.div
          {...reveal}
          className="mx-auto mt-10 grid max-w-5xl grid-cols-1 items-stretch gap-6 pt-3 md:mt-12 md:grid-cols-3"
        >
          {PRICING.map(tier => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </motion.div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">{PRICING_NOTE}</p>
      </div>
    </section>
  )
}
