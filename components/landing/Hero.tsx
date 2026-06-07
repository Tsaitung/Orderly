'use client'

/**
 * Hero.tsx — 井然 Orderly premium landing 的 Hero。
 *
 * 文案／數字全部 import 自 landingData（SSOT），元件不 hardcode 任何文案或數字。
 * 視覺重點：讓對帳產品卡成為首屏主角，餐廳照片退為右側輔助情境。
 *
 * 背景圖為本機在地化檔案 public/hero/restaurant-hero.jpg（NOT 遠端 URL），
 * 來源：Unsplash 免費授權
 *   https://images.unsplash.com/photo-1517248135467-4c7edcad34c4
 *   （Unsplash License — 可免費商用，無需署名）。
 */

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { HERO, HERO_STATS, HERO_IMAGE_SRC } from '@/components/landing/landingData'
import ReconciliationCard from '@/components/landing/ReconciliationCard'

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
      className="relative isolate overflow-hidden bg-[#fbfaf7] text-gray-950 dark:bg-gray-950 dark:text-gray-50"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(164,120,100,0.08)_1px,transparent_1px),linear-gradient(rgba(164,120,100,0.08)_1px,transparent_1px)] bg-[size:44px_44px] opacity-45 dark:bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)]"
      />

      <div className="container relative z-10 mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(440px,1.12fr)] lg:gap-10"
        >
          <div className="max-w-2xl text-center lg:text-left">
            <motion.h1
              id="hero-heading"
              variants={item}
              className="text-4xl font-black leading-[1.08] text-gray-950 dark:text-white md:text-5xl lg:text-[56px]"
            >
              {HERO.titleLine1}
              <br />
              <span className="inline-block bg-primary-100 px-2 text-primary-900 shadow-[inset_0_-0.22em_0_rgba(164,120,100,0.22)] dark:bg-primary-500/15 dark:text-[#ffd8c7] dark:shadow-[inset_0_-0.22em_0_rgba(255,216,199,0.16)]">
                {HERO.titleAccent}
              </span>
            </motion.h1>

            <motion.p
              variants={item}
              className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-700 dark:text-gray-300 md:mt-5 md:text-lg md:leading-8 lg:mx-0"
            >
              {HERO.subtitle}
            </motion.p>

            <motion.div
              variants={item}
              className="mx-auto mt-6 grid w-full max-w-[360px] grid-cols-2 gap-3 sm:flex sm:max-w-none sm:flex-row lg:mx-0 lg:justify-start"
            >
              <Link
                href={HERO.primaryCta.href}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-900/15 transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf7] dark:bg-primary-500 dark:hover:bg-primary-400 dark:focus-visible:ring-offset-gray-950 sm:w-auto sm:gap-2 sm:px-7 sm:text-base"
              >
                {HERO.primaryCta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={HERO.secondaryCta.href}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-gray-300 bg-white/75 px-4 py-3 text-sm font-bold text-gray-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf7] dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-offset-gray-950 sm:w-auto sm:gap-2 sm:px-7 sm:text-base"
              >
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                {HERO.secondaryCta.label}
              </Link>
            </motion.div>
          </div>

          <motion.div variants={item} className="relative min-w-0">
            <div className="relative mx-auto min-h-[250px] w-full max-w-[590px] sm:min-h-[360px] lg:min-h-[520px]">
              <div
                aria-hidden="true"
                className="shadow-primary-950/10 absolute inset-x-2 top-2 h-[175px] overflow-hidden rounded-lg border border-white/70 bg-gray-200 shadow-2xl dark:border-white/10 dark:bg-gray-900 dark:shadow-black/40 sm:h-[270px] lg:inset-0 lg:h-auto"
              >
                <Image
                  src={HERO_IMAGE_SRC}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 48vw, 92vw"
                  className="object-cover object-center [filter:saturate(0.9)_brightness(1.06)] dark:[filter:saturate(0.78)_brightness(0.64)]"
                />
                <div className="lg:to-[#fbfaf7]/72 lg:dark:via-gray-950/42 lg:dark:to-gray-950/78 absolute inset-0 bg-gradient-to-b from-[#fbfaf7]/5 via-[#fbfaf7]/45 to-[#fbfaf7] dark:from-gray-950/5 dark:via-gray-950/45 dark:to-gray-950 lg:bg-gradient-to-r lg:from-[#fbfaf7]/10 lg:via-[#fbfaf7]/35 lg:dark:from-gray-950/5" />
              </div>

              <div className="relative z-10 flex min-h-[250px] items-center justify-center px-2 py-5 sm:min-h-[360px] sm:px-4 sm:py-7 lg:min-h-[520px] lg:justify-start lg:px-0 lg:pl-8">
                <ReconciliationCard />
              </div>
            </div>
          </motion.div>

          <motion.dl
            variants={item}
            className="grid grid-cols-3 gap-3 border-t border-primary-900/10 pt-4 text-center dark:border-white/10 sm:gap-5 sm:pt-5 lg:col-span-2 lg:mt-0 lg:max-w-3xl lg:text-left"
          >
            {HERO_STATS.map(stat => (
              <div key={stat.label} className="min-w-0">
                <dd className="font-mono text-[22px] font-extrabold tabular-nums leading-none text-primary-900 dark:text-[#ffd8c7] md:text-3xl">
                  {stat.value}
                </dd>
                <dt className="mt-2 text-[11px] leading-snug text-gray-600 dark:text-gray-400 md:text-xs">
                  {stat.label}
                  {stat.sample ? '（示意）' : ''}
                </dt>
              </div>
            ))}
          </motion.dl>
        </motion.div>
      </div>
    </section>
  )
}
