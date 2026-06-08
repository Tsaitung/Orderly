'use client'

/**
 * FinalCTA.tsx — landing 收尾的全幅行動呼籲帶（最終 CTA）。
 *
 * 視覺對應已核准 mockup 的 `.final` 區段：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html (L120-121, L260-264)
 *   - 全幅 mocha 漸層底：linear-gradient(135deg, var(--mocha-dd) #6f4f3f → var(--mocha) #a47864)
 *   - 白字置中：h2「把對帳的時間，還給你的團隊」+ 淺膚色說明文（#f3e9e3）
 *   - 兩顆 CTA 置中：
 *       「預約 Demo」→ /contact（淺底鈕：白底 mocha 字）
 *       「開始使用」→ /register（外框鈕：透明底 + 半透明白框 + 白字）
 *
 * 文案規範：
 *   - h2 標題與說明文逐字取自已核准 mockup（landingData 未針對本區塊提供文案 export，
 *     與 ReconciliationShowcase / PainSolution 的區塊標題相同處理：本地常數 + 出處註解）。
 *   - 兩顆 CTA 的 label / href 一律重用 landingData 真實路由，元件不 hardcode 連結：
 *       預約 Demo → HERO.primaryCta（label「預約 Demo」, href /contact）
 *       開始使用 → PRICING[1].cta（專業版 cta：label「開始使用」, href /register）
 *     兩者與 mockup 的 label / href 完全一致，確保零死連結。
 *
 * 進場：reveal-on-scroll（framer-motion）；尊重 prefers-reduced-motion，
 * 關閉動畫時直接顯示最終狀態。
 */

import { motion, useReducedMotion } from 'framer-motion'
import { CalendarCheck, ArrowRight } from 'lucide-react'

import { HERO, PRICING } from '@/components/landing/landingData'

// 區塊文案 — 逐字對應已核准 mockup 的 .final 區段（非 landingData export）。
const SECTION_TITLE = '把對帳的時間，還給你的團隊'
const SECTION_SUBTEXT = '30 分鐘看完一場 Demo，看井然怎麼把 8 小時變 30 分鐘。'

// 真實路由（避免死連結），全部重用 landingData，不 hardcode label / href：
//   demoCta「預約 Demo」→ /contact（HERO.primaryCta）。
const demoCta = HERO.primaryCta
//   startCta「開始使用」→ /register：取主推方案（popular）的 cta；
//   找不到時退回任一含 /register 的方案 cta，再退回首個方案，確保連結永遠真實存在。
const startCta = (
  PRICING.find(tier => tier.popular) ??
  PRICING.find(tier => tier.cta.href === '/register') ??
  PRICING[0]
)?.cta

export default function FinalCTA() {
  const prefersReducedMotion = useReducedMotion()

  // 進場動畫：reduced-motion 時歸零（直接顯示最終狀態）。
  const reveal = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 1, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
      }

  return (
    <section
      id="final-cta"
      // 全幅 mocha 漸層帶：對應 mockup --mocha-dd → --mocha；深色模式維持品牌色（不轉灰）。
      className="bg-gradient-to-br from-[#6f4f3f] to-[#a47864] py-16 text-white md:py-20"
    >
      <div className="container mx-auto px-4">
        <motion.div {...reveal} className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {SECTION_TITLE}
          </h2>
          <p className="mx-auto mt-3 text-base leading-relaxed text-[#f3e9e3] md:text-lg">
            {SECTION_SUBTEXT}
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            {/* 淺底鈕：白底 mocha 字（對應 .btn-light）→ /contact */}
            <a
              href={demoCta.href}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-white px-7 py-3 text-base font-bold text-[#8f6b56] shadow-sm transition-colors hover:bg-[#f3e9e3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#6f4f3f] sm:w-auto"
            >
              <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              {demoCta.label}
            </a>

            {/* 外框鈕：透明底 + 半透明白框 + 白字（對應 .btn-out）→ /register。
                只有在真實 CTA 解析存在時才渲染，杜絕死連結。 */}
            {startCta && (
              <a
                href={startCta.href}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-white/60 bg-transparent px-7 py-3 text-base font-bold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#6f4f3f] sm:w-auto"
              >
                {startCta.label}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
