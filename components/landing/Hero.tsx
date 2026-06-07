'use client'

/**
 * Hero.tsx — 井然 Orderly premium landing 的 Hero（版型 A：大型餐廳照片 + 置中疊圖）。
 *
 * 文案／數字全部 import 自 landingData（SSOT），元件不 hardcode 任何文案或數字。
 * 對應已核准視覺 mockup 的「2 HERO (A)」區塊：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html (lines 34-48, 143-163)
 *
 * 背景圖為本機在地化檔案 public/hero/restaurant-hero.jpg（NOT 遠端 URL），
 * 來源：Unsplash 免費授權
 *   https://images.unsplash.com/photo-1517248135467-4c7edcad34c4
 *   （Unsplash License — 可免費商用，無需署名）。
 */

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowRight, PlayCircle, Check, TriangleAlert } from 'lucide-react'
import { HERO, HERO_STATS, HERO_IMAGE_SRC } from '@/components/landing/landingData'

/**
 * 浮動的對帳卡片預覽（mockup `.reccard`）。
 * 內含示意資料，標籤逐字對應 mockup；行動裝置隱藏（lg 以下）。
 */
function ReconciliationCard() {
  const rows: Array<{ name: string; status: 'ok' | 'warn'; tag: string }> = [
    { name: '牛番茄 12kg', status: 'ok', tag: '相符' },
    { name: '去骨雞腿 8kg', status: 'ok', tag: '相符' },
    { name: '高麗菜 6箱', status: 'warn', tag: '價差 NT$54' },
  ]

  return (
    <div
      aria-hidden="true"
      className="hidden lg:block absolute right-[max(1.5rem,calc((100vw-1180px)/2))] bottom-20 z-20 w-[300px] rounded-[10px] bg-white p-3.5 text-left text-gray-900 shadow-2xl shadow-black/40 ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100 dark:ring-white/10"
    >
      <div className="flex items-center justify-between text-[13px] font-bold">
        <span>晨間配送核對</span>
        <span className="rounded-[10px] bg-amber-100 px-[7px] py-px text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
          3 待確認
        </span>
      </div>
      <p className="mb-2 mt-px text-[11px] text-gray-500 dark:text-gray-400">
        大廚餐飲 · 訂單 #2049
      </p>

      <ul>
        {rows.map((row) => (
          <li
            key={row.name}
            className={`flex items-center justify-between border-b border-gray-100 py-[5px] text-[12.5px] last:border-b-0 dark:border-gray-800 ${
              row.status === 'warn' ? '-mx-3.5 px-3.5 bg-orange-50/70 dark:bg-orange-500/10' : ''
            }`}
          >
            <span className="text-gray-700 dark:text-gray-200">{row.name}</span>
            {row.status === 'ok' ? (
              <span className="inline-flex items-center gap-1 rounded-[10px] bg-emerald-100 px-[7px] py-px text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <Check className="h-3 w-3" aria-hidden="true" />
                {row.tag}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-[10px] bg-orange-100 px-[7px] py-px text-[11px] font-bold text-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
                <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                {row.tag}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-2.5 text-[11px] text-gray-500 dark:text-gray-400">
        AI 信心 94%
        <div className="mt-1 h-1.5 overflow-hidden rounded-[3px] bg-gray-200 dark:bg-gray-700">
          <span className="block h-full w-[94%] bg-gradient-to-r from-primary-500 to-emerald-500" />
        </div>
      </div>

      <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">（示意）</p>
    </div>
  )
}

export default function Hero() {
  const reduceMotion = useReducedMotion()

  // 父容器負責 stagger；子元素淡入上移。減動模式直接顯示最終狀態。
  const container: Variants = {
    hidden: {},
    show: {
      transition: reduceMotion ? {} : { staggerChildren: 0.12, delayChildren: 0.05 },
    },
  }
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' },
    },
  }

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative flex min-h-[88vh] items-center overflow-hidden text-white"
    >
      {/* 背景照片（本機在地化檔案） */}
      <Image
        src={HERO_IMAGE_SRC}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover [filter:saturate(1.15)_brightness(0.92)]"
      />
      {/* 深色漸層遮罩 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[rgba(30,18,12,0.55)] to-[rgba(30,18,12,0.80)]"
      />
      {/* 細格線疊圖 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]"
      />

      {/* 置中內容 */}
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-3xl pb-28 pt-16 text-center md:pt-20"
        >
          <motion.h1
            id="hero-heading"
            variants={item}
            className="text-4xl font-black tracking-tight [text-shadow:0_3px_20px_rgba(0,0,0,0.5)] md:text-5xl lg:text-[52px] lg:leading-tight"
          >
            {HERO.titleLine1}
            <br />
            到 <span className="text-[#f0c9b6]">{HERO.titleAccent}</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mx-auto mt-5 max-w-xl text-base text-[#f0e8e2] [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] md:text-lg"
          >
            {HERO.subtitle}
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row"
          >
            <Link
              href={HERO.primaryCta.href}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded bg-white px-7 py-3 text-base font-bold text-gray-900 shadow-lg transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 sm:w-auto"
            >
              {HERO.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={HERO.secondaryCta.href}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded border-[1.5px] border-white/60 bg-transparent px-7 py-3 text-base font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 sm:w-auto"
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              {HERO.secondaryCta.label}
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* 底部統計列 */}
      <motion.dl
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay: 0.5 }}
        className="absolute inset-x-0 bottom-6 z-10 flex flex-wrap items-start justify-center gap-x-12 gap-y-4 px-4 sm:gap-x-16"
      >
        {HERO_STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <dd className="font-mono text-2xl font-extrabold tabular-nums">{stat.value}</dd>
            <dt className="mt-0.5 text-[11px] text-white/80">
              {stat.label}
              {stat.sample ? '（示意）' : ''}
            </dt>
          </div>
        ))}
      </motion.dl>

      {/* 浮動對帳卡片（行動裝置隱藏） */}
      <ReconciliationCard />
    </section>
  )
}
