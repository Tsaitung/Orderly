'use client'

/**
 * HowItWorks — 運作方式 5 步流程 stepper（下單 → 配送 → 驗收 → 對帳 → 結算）。
 *
 * 資料來源：components/landing/landingData.ts 的 STEPS（SSOT）。
 * 視覺對應已核准 mockup（.superpowers/brainstorm/65035-1780824512/content/full-mockup.html
 * 的「5 HOW」section）：白底置中、Mocha 數字圓圈 48px、頂部連接線、h4 標題 + 描述。
 *
 * 互動：捲動進入視窗時，各步驟依序點亮（stagger）；連接線隨之填滿。
 * 尊重 prefers-reduced-motion：開啟時直接顯示全部已點亮的最終狀態，不做動畫。
 */

import { motion, useReducedMotion } from 'framer-motion'
import {
  ShoppingCart,
  Truck,
  ClipboardCheck,
  ScanLine,
  Receipt,
  type LucideIcon,
} from 'lucide-react'

import { STEPS } from '@/components/landing/landingData'

// 步驟編號 → lucide icon（下單 / 配送 / 驗收 / 對帳 / 結算）。
// 以編號對應，與 landingData 的文案解耦，避免重複文案於元件硬編。
const STEP_ICONS: Record<number, LucideIcon> = {
  1: ShoppingCart, // 下單
  2: Truck, // 配送
  3: ClipboardCheck, // 驗收
  4: ScanLine, // 對帳
  5: Receipt, // 結算
}

export default function HowItWorks() {
  const reduceMotion = useReducedMotion()

  // reduced-motion：所有步驟直接呈現最終（已點亮）狀態。
  const containerVariants = {
    hidden: {},
    show: {
      transition: reduceMotion
        ? {}
        : { staggerChildren: 0.18, delayChildren: 0.1 },
    },
  }

  const stepVariants = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-20 bg-white dark:bg-gray-950"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container mx-auto px-4">
        {/* Section 標題：小寫 label → h2 */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 1, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-primary-600 dark:text-primary-400 font-bold tracking-wide text-xs uppercase">
            運作方式
          </p>
          <h2
            id="how-it-works-heading"
            className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100"
          >
            下單到結算，一條龍自動化
          </h2>
        </motion.div>

        {/* Stepper：桌機水平、手機垂直 */}
        <motion.ol
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="
            relative mt-12 md:mt-16
            flex flex-col gap-8
            md:flex-row md:gap-0
          "
        >
          {/* 桌機底層連接線（灰）：對應 mockup .step::after，置於圓圈垂直中心 */}
          <span
            aria-hidden="true"
            className="
              hidden md:block absolute top-6 left-[10%] right-[10%]
              h-0.5 bg-gray-200 dark:bg-gray-800
            "
          />
          {/* 桌機進度連接線（Mocha）：隨捲入填滿，reduced-motion 直接滿格 */}
          <motion.span
            aria-hidden="true"
            className="
              hidden md:block absolute top-6 left-[10%]
              h-0.5 origin-left bg-primary-500
            "
            style={{ right: '10%' }}
            initial={reduceMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: reduceMotion ? 0 : 0.18 * STEPS.length,
              ease: 'easeInOut',
              delay: reduceMotion ? 0 : 0.1,
            }}
          />

          {STEPS.map((step) => {
            const Icon = STEP_ICONS[step.n]
            return (
              <motion.li
                key={step.n}
                variants={stepVariants}
                className="
                  relative md:flex-1 md:px-2
                  flex items-start gap-4
                  md:flex-col md:items-center md:gap-0 md:text-center
                "
              >
                {/* 編號圓圈 48px：Mocha 底白字，含 lucide icon */}
                <div
                  className="
                    relative z-10 shrink-0
                    w-12 h-12 rounded-full
                    bg-primary-500 text-white
                    flex items-center justify-center
                    font-extrabold
                    shadow-md shadow-primary-500/20
                    md:mb-3
                  "
                >
                  {Icon ? (
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <span className="font-mono tabular-nums">{step.n}</span>
                  )}
                  {/* 序號徽章：右下角小圈，font-mono tabular-nums */}
                  <span
                    className="
                      absolute -bottom-1 -right-1
                      w-5 h-5 rounded-full
                      bg-white dark:bg-gray-950
                      ring-2 ring-primary-500
                      text-primary-600 dark:text-primary-400
                      text-[11px] font-bold font-mono tabular-nums
                      flex items-center justify-center
                    "
                    aria-hidden="true"
                  >
                    {step.n}
                  </span>
                </div>

                <div className="md:mt-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {step.desc}
                  </p>
                </div>
              </motion.li>
            )
          })}
        </motion.ol>
      </div>
    </section>
  )
}
