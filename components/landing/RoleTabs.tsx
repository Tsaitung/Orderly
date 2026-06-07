'use client'

/**
 * RoleTabs — 三角色方案（餐廳 / 供應商 / 平台）分頁區塊。
 *
 * 資料來源：'@/components/landing/landingData' 的 ROLES（key/name/accent/href/valueProps/shotLabel）。
 * 本元件不 hardcode 任何角色文案或連結；唯一固定字串為區塊標籤「三角色方案」與標題，
 * 逐字對應已核准 mockup（.superpowers/brainstorm/65035-1780824512/content/full-mockup.html，#roles）。
 *
 * 以 @radix-ui/react-tabs 提供鍵盤可存取的分頁（方向鍵切換、Tab 聚焦），
 * 每個 tab/panel 套用該角色的強調色（accent，來自 landingData，非 Tailwind token，故走 inline style）。
 * 每個 panel：左側為 3 條 valueProps 勾選清單（勾選色＝accent）＋「了解更多」按鈕（連 role.href），
 * 右側為「{role} Dashboard 縮影」佔位框（後續換實際截圖）。
 */

import * as Tabs from '@radix-ui/react-tabs'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'

import { ROLES, type RoleItem } from '@/components/landing/landingData'

/**
 * 把 hex accent 轉成帶透明度的 rgba（用於佔位框柔和漸層底色），
 * 避免在 inline style 重複寫死，且讓三色一致地淡化。
 */
function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function RolePanel({ role }: { role: RoleItem }) {
  return (
    <div className="mt-6 grid grid-cols-1 items-center gap-8 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-[1.1fr_0.9fr] md:p-8">
      {/* 左側：角色標題 + 價值主張清單 + CTA */}
      <div className="text-left">
        <h3
          className="text-xl font-extrabold tracking-tight md:text-2xl"
          style={{ color: role.accent }}
        >
          {role.name}端
        </h3>
        <ul className="mt-4 space-y-3" role="list">
          {role.valueProps.map((prop) => (
            <li key={prop} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded"
                style={{ backgroundColor: withAlpha(role.accent, 0.14) }}
              >
                <Check
                  className="h-4 w-4"
                  strokeWidth={3}
                  style={{ color: role.accent }}
                />
              </span>
              <span className="text-gray-700 dark:text-gray-300">{prop}</span>
            </li>
          ))}
        </ul>
        <a
          href={role.href}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-md px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900"
          style={{ backgroundColor: role.accent }}
        >
          了解{role.name}方案
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {/* 右側：Dashboard 縮影佔位框 */}
      <div
        className="flex h-48 items-center justify-center rounded-xl border text-sm font-bold md:h-52"
        style={{
          color: role.accent,
          borderColor: withAlpha(role.accent, 0.3),
          background: `linear-gradient(135deg, ${withAlpha(
            role.accent,
            0.06
          )}, ${withAlpha(role.accent, 0.16)})`,
        }}
      >
        {role.shotLabel}
      </div>
    </div>
  )
}

export default function RoleTabs() {
  const reduceMotion = useReducedMotion()
  const defaultRole = ROLES[0]?.key ?? 'restaurant'

  return (
    <section id="roles" className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center"
          initial={reduceMotion ? false : { opacity: 1, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-bold uppercase tracking-wide text-primary-600">
            三角色方案
          </span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
            餐廳、供應商、平台，各有所得
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600 dark:text-gray-300">
            同一套對帳流程，依角色提供對應價值。
          </p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 1, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs.Root defaultValue={defaultRole} className="mt-8">
            <Tabs.List
              aria-label="選擇角色方案"
              className="flex flex-col gap-2.5 sm:flex-row sm:justify-center"
            >
              {ROLES.map((role) => (
                <Tabs.Trigger
                  key={role.key}
                  value={role.key}
                  className="group inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 data-[state=active]:border-current data-[state=active]:bg-[var(--role-soft)] data-[state=active]:text-[var(--role-accent)] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-900"
                  style={
                    {
                      '--role-accent': role.accent,
                      '--role-soft': withAlpha(role.accent, 0.1),
                    } as React.CSSProperties
                  }
                >
                  {role.name}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {ROLES.map((role) => (
              <Tabs.Content
                key={role.key}
                value={role.key}
                className="focus-visible:outline-none"
              >
                <RolePanel role={role} />
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </motion.div>
      </div>
    </section>
  )
}
