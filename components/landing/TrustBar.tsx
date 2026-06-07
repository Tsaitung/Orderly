'use client'

/**
 * TrustBar — landing 的信任條（橫向統計帶）。
 *
 * 對應已核准 mockup 的 `.trust` 區塊：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html（167–172 行）
 * bg 白底、上下 border、置中 4 個示意統計；數字 mono tabular，滑入視窗時 count-up。
 *
 * 文案與數字一律取自 landingData 的 TRUST_STATS（全 sample:true，皆標「（示意）」）。
 * reduced-motion 時直接顯示最終數值，不做 count-up。
 */

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { TRUST_STATS } from '@/components/landing/landingData'

/**
 * 解析像「NT$24億」「1,200+」「380+」「99.4%」這類字串，
 * 取出可動畫的數值核心與前後綴，並記錄小數位數與是否帶千分位。
 */
function parseStatValue(raw: string): {
  prefix: string
  numeric: number
  suffix: string
  decimals: number
  grouped: boolean
} {
  // 第一個數字（含可選小數）出現的位置作為切分點。
  const match = raw.match(/[\d,]+(?:\.\d+)?/)
  if (!match || match.index === undefined) {
    return { prefix: raw, numeric: 0, suffix: '', decimals: 0, grouped: false }
  }
  const token = match[0]
  const prefix = raw.slice(0, match.index)
  const suffix = raw.slice(match.index + token.length)
  const grouped = token.includes(',')
  const cleaned = token.replace(/,/g, '')
  const dotIndex = cleaned.indexOf('.')
  const decimals = dotIndex === -1 ? 0 : cleaned.length - dotIndex - 1
  const numeric = Number(cleaned)
  return {
    prefix,
    numeric: Number.isFinite(numeric) ? numeric : 0,
    suffix,
    decimals,
    grouped,
  }
}

/** 依原始格式重組目前 count-up 的數值（保留前後綴、小數位、千分位）。 */
function formatStatValue(
  current: number,
  meta: ReturnType<typeof parseStatValue>,
): string {
  const fixed = current.toFixed(meta.decimals)
  const display = meta.grouped
    ? Number(fixed).toLocaleString('en-US', {
        minimumFractionDigits: meta.decimals,
        maximumFractionDigits: meta.decimals,
      })
    : fixed
  return `${meta.prefix}${display}${meta.suffix}`
}

const COUNT_UP_DURATION_MS = 1400

function CountUpStat({ value }: { value: string }) {
  const meta = parseStatValue(value)
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  // viewport 觸發只跑一次，與 section reveal 的 once:true 行為一致。
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const [display, setDisplay] = useState<string>(() =>
    // 初始即顯示最終值（reduced-motion 或尚未滑入時的安全預設）。
    formatStatValue(meta.numeric, meta),
  )

  useEffect(() => {
    if (reduceMotion || !inView) {
      // reduced-motion 或不在視窗：直接鎖定最終值。
      setDisplay(formatStatValue(meta.numeric, meta))
      return
    }

    let raf = 0
    let start: number | null = null
    const animate = (now: number) => {
      if (start === null) start = now
      const elapsed = now - start
      const t = Math.min(elapsed / COUNT_UP_DURATION_MS, 1)
      // easeOutCubic，收尾平滑。
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(formatStatValue(meta.numeric * eased, meta))
      if (t < 1) {
        raf = requestAnimationFrame(animate)
      } else {
        setDisplay(formatStatValue(meta.numeric, meta))
      }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
    // meta 由 value 推導，value 不變時 meta 穩定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduceMotion, value])

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {display}
    </span>
  )
}

export default function TrustBar() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      aria-label="平台信任數據"
      className="border-y border-gray-200 bg-white py-10 dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="container mx-auto px-4">
        <motion.ul
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 gap-y-8 gap-x-6 md:grid-cols-4 md:gap-x-8"
        >
          {TRUST_STATS.map((stat) => (
            <li key={stat.label} className="text-center">
              <div className="text-3xl font-extrabold leading-none text-primary-800 dark:text-primary-400">
                <CountUpStat value={stat.value} />
              </div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {stat.label}
                {stat.sample ? '（示意）' : ''}
              </div>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
