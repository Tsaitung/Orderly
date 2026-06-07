'use client'

/**
 * ReconciliationCard — Hero 內的浮動對帳卡（對應 mockup 的 .reccard）。
 *
 * 自包含元件，不依賴 landingData：卡片內容為清楚標示的「示意」資料，
 * 用來在 Hero 視覺呈現 AI 三方對帳的逐筆勾稽體驗。
 * 逐字對應已核准 mockup：
 *   .superpowers/brainstorm/65035-1780824512/content/full-mockup.html（.reccard 區塊）
 *
 * 視覺規格（取自 mockup CSS）：
 *   - 白卡、圓角 10px、陰影 0 18px 50px rgba(0,0,0,.4)、padding 14px、寬 300px、靠左
 *   - 標題 bold 13px + 「3 待確認」warn pill
 *   - 副標 11px ink2「大廚餐飲 · 訂單 #2049」
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
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      role="figure"
      aria-label="AI 對帳示意卡：晨間配送核對，3 項待確認，AI 信心 94%"
      className="relative w-[300px] max-w-full overflow-hidden rounded-[10px] bg-white p-3.5 text-left text-gray-900 shadow-[0_18px_50px_rgba(0,0,0,0.4)] dark:bg-gray-900 dark:text-gray-100 dark:shadow-[0_18px_50px_rgba(0,0,0,0.6)]"
    >
      {/* 掃描動畫：一條由上往下掃過列區的高光，reduced-motion 時不渲染。 */}
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10 h-16 bg-gradient-to-b from-transparent via-primary-500/15 to-transparent"
          initial={{ top: '38%' }}
          animate={{ top: ['38%', '88%', '38%'] }}
          transition={{
            duration: 3.2,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 0.6,
          }}
        />
      )}

      {/* 標題列：晨間配送核對 + 待確認 pill */}
      <div className="flex items-center justify-between text-[13px] font-bold">
        <span>晨間配送核對</span>
        <span className="inline-flex items-center gap-1 rounded-[10px] bg-warning/20 px-[7px] py-px text-[11px] font-bold text-amber-700 dark:bg-warning/25 dark:text-amber-300">
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />3 待確認
        </span>
      </div>

      {/* 副標：餐廳 · 訂單編號（示意） */}
      <p className="mb-2.5 mt-px text-[11px] text-gray-500 dark:text-gray-400">
        大廚餐飲 · 訂單{' '}
        <span className="font-mono tabular-nums">#2049</span>
        <span className="ml-1 text-gray-400 dark:text-gray-500">（示意）</span>
      </p>

      {/* 對帳列 */}
      <ul className="relative z-0">
        {SAMPLE_ROWS.map((row) => {
          const isWarn = row.status === 'warn'
          return (
            <li
              key={row.item}
              className={[
                'flex items-center justify-between border-b border-gray-100 py-[5px] text-[12.5px] last:border-b-0 dark:border-gray-800',
                isWarn ? 'bg-orange-50/80 dark:bg-orange-950/30' : '',
              ].join(' ')}
            >
              <span className="text-gray-800 dark:text-gray-200">
                {row.item}{' '}
                <span className="font-mono tabular-nums text-gray-500 dark:text-gray-400">
                  {row.qty}
                </span>
              </span>
              {isWarn ? (
                <span className="inline-flex items-center gap-1 rounded-[10px] bg-warning/20 px-[7px] py-px text-[11px] font-bold text-amber-700 dark:bg-warning/25 dark:text-amber-300">
                  <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                  {row.statusLabel}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-[10px] bg-success/20 px-[7px] py-px text-[11px] font-bold text-emerald-700 dark:bg-success/25 dark:text-emerald-300">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  {row.statusLabel}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {/* AI 信心分數 + 進度條 */}
      <div className="mt-2.5 text-[11px] text-gray-500 dark:text-gray-400">
        <span>
          AI 信心{' '}
          <span className="font-mono font-semibold tabular-nums text-gray-700 dark:text-gray-200">
            {CONFIDENCE}%
          </span>
        </span>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-[3px] bg-gray-200 dark:bg-gray-700"
          role="progressbar"
          aria-label="AI 信心分數"
          aria-valuenow={CONFIDENCE}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full rounded-[3px] bg-gradient-to-r from-primary-500 to-success"
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
