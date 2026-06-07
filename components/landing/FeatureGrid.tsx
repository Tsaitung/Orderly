'use client'

/**
 * FeatureGrid — landing「完整功能」區塊（id="features"）。
 *
 * 資料來源：components/landing/landingData.ts 的 FEATURES（8 項），
 * 元件不 hardcode 任何文案。icon 欄位為 lucide-react 元件「名稱」字串，
 * 此處以白名單對照表轉成實際 icon 元件（避免 dynamic indexing 帶來的型別與
 * tree-shaking 風險）。
 *
 * 視覺逐字對應已核准 mockup 的 FEATURES 區塊：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html
 *   - 4 欄格線（平板 2 欄、手機 1 欄）
 *   - 卡片：border + radius + padding，淺色 / 深色雙主題
 *   - icon 容器：42x42、圓角、淺 mocha 底（#f3ece7）配 mocha 前景色
 */

import {
  BarChart3,
  Bell,
  Camera,
  ClipboardList,
  Plug,
  ScrollText,
  ShieldCheck,
  Tags,
  type LucideIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

import { FEATURES } from '@/components/landing/landingData'

/** FEATURES[].icon 字串 → lucide-react 元件白名單（僅含實際用到的 8 個）。 */
const ICONS: Record<string, LucideIcon> = {
  ClipboardList,
  Camera,
  Tags,
  ShieldCheck,
  Plug,
  Bell,
  BarChart3,
  ScrollText,
}

export default function FeatureGrid() {
  const reduceMotion = useReducedMotion()

  // reveal-on-scroll：尊重 prefers-reduced-motion，關閉時直接顯示最終狀態。
  const headerMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
      }

  return (
    <section id="features" className="py-16 md:py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        {/* 區塊標題 */}
        <motion.div className="text-center" {...headerMotion}>
          <span className="text-primary-600 font-bold tracking-wide text-xs uppercase">
            完整功能
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            一個平台，串起全流程
          </h2>
        </motion.div>

        {/* 功能卡片：4 欄 → 平板 2 欄 → 手機 1 欄，stagger reveal */}
        <div className="mt-10 md:mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => {
            const Icon = ICONS[feature.icon]
            const cardMotion = reduceMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 24 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true },
                  transition: { duration: 0.5, delay: index * 0.07 },
                }

            return (
              <motion.div
                key={feature.title}
                {...cardMotion}
                className="group h-full rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-primary-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-700"
              >
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                  {Icon ? (
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  ) : null}
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {feature.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
