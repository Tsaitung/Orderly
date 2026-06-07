'use client'

/**
 * FAQ.tsx — 井然 Orderly premium landing 的「常見問題」區塊。
 *
 * 資料來源：'@/components/landing/landingData' 的 FAQ（依 restaurant / supplier 分組）。
 * 提供餐廳 / 供應商兩組問題的切換，並以可鍵盤操作、具 aria 屬性的手風琴呈現。
 * 視覺對齊已核准 mockup：section label（.lab）→ h2（.h2），切換 pill 沿用 mockup 的 .tab 樣式，
 * 角色強調色取自 module accent（餐廳 #ff6b35 / 供應商 #00a896）。
 */

import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, UtensilsCrossed, Truck } from 'lucide-react'
import { FAQ } from '@/components/landing/landingData'

/** 角色切換的設定：key 對應 FAQ 資料的分組，並各自帶 module accent。 */
type RoleKey = 'restaurant' | 'supplier'

interface RoleTab {
  key: RoleKey
  label: string
  Icon: typeof UtensilsCrossed
  /** active 狀態的樣式（沿用 mockup .tab.r 的 accent 邊框 + 淡底）。 */
  activeClass: string
}

const ROLE_TABS: RoleTab[] = [
  {
    key: 'restaurant',
    label: '餐廳',
    Icon: UtensilsCrossed,
    activeClass:
      'border-[#ff6b35] text-[#ff6b35] bg-[#fff5f1] dark:bg-[#ff6b35]/10 dark:text-[#ff8a5c]',
  },
  {
    key: 'supplier',
    label: '供應商',
    Icon: Truck,
    activeClass:
      'border-[#00a896] text-[#00a896] bg-[#effaf7] dark:bg-[#00a896]/10 dark:text-[#2cc4ad]',
  },
]

export default function FAQSection() {
  const reduceMotion = useReducedMotion()
  const [role, setRole] = useState<RoleKey>('restaurant')
  // 以「角色 + 索引」為展開狀態的 key，切換角色時保留各自的展開記憶。
  const [openKey, setOpenKey] = useState<string | null>('restaurant-0')

  const items = useMemo(() => FAQ[role], [role])

  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 1, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
      }

  return (
    <section id="faq" className="py-16 md:py-20 bg-white dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
          <p className="text-primary-600 dark:text-primary-400 font-bold tracking-wide text-xs uppercase">
            常見問題
          </p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            還有疑問？這裡先解答
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            選擇您的身分，查看最常被問到的問題。需要更深入的說明，歡迎預約 Demo。
          </p>
        </motion.div>

        {/* 角色切換 pill（沿用 mockup .tabs / .tab） */}
        <motion.div
          {...reveal}
          role="tablist"
          aria-label="選擇 FAQ 角色"
          className="mt-8 flex justify-center gap-2.5"
        >
          {ROLE_TABS.map(({ key, label, Icon, activeClass }) => {
            const selected = role === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`faq-tab-${key}`}
                aria-selected={selected}
                aria-controls={`faq-panel-${key}`}
                onClick={() => {
                  setRole(key)
                  setOpenKey(`${key}-0`)
                }}
                className={[
                  'inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-bold',
                  'min-h-[44px] transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                  'dark:focus-visible:ring-offset-gray-950',
                  selected
                    ? activeClass
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            )
          })}
        </motion.div>

        {/* 手風琴 */}
        <motion.div
          {...reveal}
          id={`faq-panel-${role}`}
          role="tabpanel"
          aria-labelledby={`faq-tab-${role}`}
          className="mx-auto mt-8 max-w-3xl divide-y divide-gray-200 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
        >
          {items.map((item, i) => {
            const key = `${role}-${i}`
            const isOpen = openKey === key
            const headingId = `faq-q-${key}`
            const regionId = `faq-a-${key}`
            return (
              <div key={key}>
                <h3>
                  <button
                    type="button"
                    id={headingId}
                    aria-expanded={isOpen}
                    aria-controls={regionId}
                    onClick={() => setOpenKey(isOpen ? null : key)}
                    className={[
                      'flex w-full items-center justify-between gap-4 px-5 py-4 text-left',
                      'min-h-[44px] text-base font-bold text-gray-900 dark:text-gray-100',
                      'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
                    ].join(' ')}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={[
                        'h-5 w-5 shrink-0 text-primary-600 dark:text-primary-400',
                        reduceMotion ? '' : 'transition-transform duration-300',
                        isOpen ? 'rotate-180' : 'rotate-0',
                      ].join(' ')}
                    />
                  </button>
                </h3>
                <div
                  id={regionId}
                  role="region"
                  aria-labelledby={headingId}
                  hidden={!isOpen}
                  className="px-5 pb-5 -mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
                >
                  {item.a}
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
