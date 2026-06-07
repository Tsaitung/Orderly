'use client'

/**
 * ReconciliationCard — Hero 內的產品對帳卡。
 *
 * 自包含元件，不依賴 landingData：卡片內容為清楚標示的「示意」資料，
 * 用來在 Hero 視覺呈現 AI 三方對帳的逐筆勾稽體驗。
 *
 * 視覺規格：
 *   - 白卡、圓角 8px、深陰影、寬 430px 以內、靠左
 *   - 標題 bold + 「3 待確認」warn pill
 *   - 副標使用通用示意資料，不放任何捏造的客戶名稱
 *   - 3 列（牛番茄✓相符 / 去骨雞腿✓相符 / 高麗菜▲價差 NT$54），價差列底色 #fff8f3
 *   - ok pill 綠底綠字 / warn pill 琥珀底琥珀字
 *   - AI 信心 94% + 進度條（mocha→green 漸層）
 *   - 列上方有掃描動畫（framer-motion），尊重 prefers-reduced-motion
 *
 * 數字以 font-mono tabular-nums 呈現；示意資料於副標旁標「（示意）」。
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Check, TriangleAlert } from 'lucide-react'

/** 對帳列的示意資料型別。 */
interface ReconRow {
  /** 品項名稱。 */
  item: string
  /** 數量描述（如 12kg、6 箱）。 */
  qty: string
  /** 對帳狀態：相符 or 價差。 */
  status: 'ok' | 'warn'
  /** pill 文字（如「相符」「價差 NT$54」）。 */
  statusLabel: string
}

/** 示意對帳資料（非真實紀錄，僅供 Hero 視覺示意）。 */
const SAMPLE_ROWS: ReconRow[] = [
  { item: '牛番茄', qty: '12kg', status: 'ok', statusLabel: '相符' },
  { item: '去骨雞腿', qty: '8kg', status: 'ok', statusLabel: '相符' },
  { item: '高麗菜', qty: '6 箱', status: 'warn', statusLabel: '價差 NT$54' },
]

/** AI 信心分數（示意），同時驅動進度條寬度。 */
const CONFIDENCE = 94

export default function ReconciliationCard() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      // 卡片入場：由下淡入，尊重 reduced-motion。
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      role="figure"
      aria-label="AI 對帳示意卡：晨間配送核對，3 項待確認，AI 信心 94%"
      className="relative w-full max-w-[430px] overflow-hidden rounded-lg bg-white p-3 text-left text-gray-900 shadow-[0_24px_70px_rgba(31,20,15,0.22)] ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100 dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)] dark:ring-white/10 sm:p-5"
    >
      {/* 掃描動畫：一條由上往下掃過列區的高光，reduced-motion 時不渲染。 */}
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10 h-20 bg-gradient-to-b from-transparent via-primary-500/25 to-transparent sm:h-24"
          initial={{ top: '28%' }}
          animate={{ top: ['28%', '78%', '28%'] }}
          transition={{
            duration: 3.2,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 0.6,
          }}
        />
      )}

      {/* 標題列：晨間配送核對 + 待確認 pill */}
      <div className="flex items-center justify-between gap-3 text-[13px] font-bold sm:text-[15px]">
        <span>晨間配送核對</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-warning/25 dark:text-amber-300 sm:px-2 sm:py-1 sm:text-[11px]">
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />3 待確認
        </span>
      </div>

      {/* 副標：訂單編號（示意） */}
      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 sm:text-[12px]">
        晨間配送 · 訂單 <span className="font-mono tabular-nums">#2049</span>
        <span className="ml-1 text-gray-400 dark:text-gray-500">（示意）</span>
      </p>

      <div className="mt-4 hidden grid-cols-3 gap-2 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 sm:grid">
        {['訂單', '送貨單', '發票'].map(source => (
          <span
            key={source}
            className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-950/80"
          >
            {source}
          </span>
        ))}
      </div>

      {/* 對帳列 */}
      <ul className="relative z-0 mt-2 sm:mt-3">
        {SAMPLE_ROWS.map(row => {
          const isWarn = row.status === 'warn'
          return (
            <li
              key={row.item}
              className={[
                'flex items-center justify-between gap-3 border-b border-gray-100 py-1.5 text-[12.5px] last:border-b-0 dark:border-gray-800 sm:py-2.5 sm:text-[13.5px]',
                isWarn ? '-mx-2 rounded-md bg-orange-50/90 px-2 dark:bg-orange-950/35' : '',
              ].join(' ')}
            >
              <span className="min-w-0 text-gray-800 dark:text-gray-200">
                {row.item}{' '}
                <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
                  {row.qty}
                </span>
              </span>
              {isWarn ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-warning/25 dark:text-amber-300 sm:px-2 sm:py-1 sm:text-[11px]">
                  <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                  {row.statusLabel}
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-success/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-success/25 dark:text-emerald-300 sm:px-2 sm:py-1 sm:text-[11px]">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {row.statusLabel}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {/* AI 信心分數 + 進度條 */}
      <div className="mt-3 text-[12px] text-gray-500 dark:text-gray-400 sm:mt-4">
        <span>
          AI 信心{' '}
          <span className="font-mono text-sm font-extrabold tabular-nums text-gray-800 dark:text-gray-100">
            {CONFIDENCE}%
          </span>
        </span>
        <div
          className="mt-2 h-2 overflow-hidden rounded bg-gray-200 dark:bg-gray-700 sm:h-2.5"
          role="progressbar"
          aria-label="AI 信心分數"
          aria-valuenow={CONFIDENCE}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded bg-gradient-to-r from-primary-500 to-success"
            initial={reduceMotion ? false : { width: 0 }}
            whileInView={{ width: `${CONFIDENCE}%` }}
            viewport={{ once: true }}
            transition={{ duration: reduceMotion ? 0 : 0.9, delay: 0.3, ease: 'easeOut' }}
            style={reduceMotion ? { width: `${CONFIDENCE}%` } : undefined}
          />
        </div>
      </div>
    </motion.div>
  )
}
