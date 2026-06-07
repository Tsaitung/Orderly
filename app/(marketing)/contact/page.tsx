'use client'

/**
 * /contact — 井然 Orderly premium landing 的聯絡 / 預約 Demo 頁。
 *
 * 視覺與互動延續已核准 mockup（.superpowers/brainstorm/.../full-mockup.html）的
 * Mocha 色系、4px 圓角、section 排版與 dark mode 規範，並重用 landing 的
 * <LandingNav/> + <LandingFooter/> 形成完整頁面外殼。
 *
 * 表單：身分別（餐廳 / 供應商 / 平台）radio 分流 + 公司名稱 / 聯絡人 / Email /
 * 需求（textarea）。送出後 POST /api/contact，成功顯示 success state。
 *
 * 隱私：表單內容只在送出當下傳給 /api/contact，後端僅 log requestId/role/timestamp，
 * 不記錄任何 PII（見 app/api/contact/route.ts）。
 *
 * 文案皆繁體中文；身分別選項對應 landingData 的 ROLES（key/name/accent），
 * 不另行 hardcode 角色清單。
 */

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Building2, CheckCircle2, Clock, Loader2, Mail, Send, User } from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import LandingFooter from '@/components/landing/LandingFooter'
import { ROLES, type RoleItem } from '@/components/landing/landingData'

type RoleKey = RoleItem['key']
type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

interface FormFields {
  role: RoleKey
  company: string
  name: string
  email: string
  needs: string
}

const INITIAL_FIELDS: FormFields = {
  role: 'restaurant',
  company: '',
  name: '',
  email: '',
  needs: '',
}

export default function ContactPage() {
  const reduceMotion = useReducedMotion()

  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS)
  const [status, setStatus] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const update = <K extends keyof FormFields>(key: K, value: FormFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  // reveal 動畫（尊重 reduced motion：直接顯示最終狀態）。
  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 1, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.5 },
      }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'submitting') {
      return
    }

    setStatus('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        setErrorMsg(
          data?.error === 'VALIDATION_FAILED'
            ? '請確認所有欄位皆已正確填寫。'
            : '送出失敗，請稍後再試或直接來信聯絡。',
        )
        setStatus('error')
        return
      }

      setStatus('success')
    } catch {
      setErrorMsg('連線異常，請稍後再試。')
      setStatus('error')
    }
  }

  const resetForm = () => {
    setFields(INITIAL_FIELDS)
    setStatus('idle')
    setErrorMsg(null)
  }

  const inputClass = [
    'w-full rounded-[4px] border px-3.5 py-2.5 text-sm transition-colors',
    'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500',
    'dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500',
  ].join(' ')

  const labelClass =
    'mb-1.5 block text-sm font-semibold text-gray-800 dark:text-gray-200'

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f7] dark:bg-gray-950">
      <LandingNav />

      <main id="contact" className="flex-1">
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            {/* 區段標題 */}
            <motion.div className="mx-auto max-w-2xl text-center" {...reveal}>
              <span className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                聯絡我們
              </span>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl dark:text-gray-100">
                預約 Demo，看井然怎麼幫你對帳
              </h1>
              <p className="mt-3 text-gray-600 dark:text-gray-300">
                告訴我們你的身分與需求，我們將於
                <span className="font-semibold text-gray-800 dark:text-gray-100">
                  {' '}
                  1 個工作天內回覆
                </span>
                。
              </p>
              <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="h-4 w-4" aria-hidden="true" />
                平均回覆時間：1 個工作天內
              </p>
            </motion.div>

            {/* 表單卡片 */}
            <motion.div
              className="mx-auto mt-10 max-w-2xl"
              {...(reduceMotion
                ? {}
                : {
                    initial: { opacity: 1, y: 24 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true },
                    transition: { duration: 0.5, delay: 0.1 },
                  })}
            >
              <div className="rounded-[4px] border border-gray-200 bg-white p-6 shadow-sm md:p-8 dark:border-gray-800 dark:bg-gray-900">
                {status === 'success' ? (
                  // 成功狀態
                  <div className="py-6 text-center" role="status" aria-live="polite">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-xl font-extrabold text-gray-900 dark:text-gray-100">
                      已收到你的需求，謝謝！
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-gray-600 dark:text-gray-300">
                      井然 Orderly 團隊將於 1 個工作天內與你聯繫。你也可以先看看產品功能與定價。
                    </p>
                    <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <Link
                        href="/#features"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] bg-primary-500 px-5 text-sm font-bold text-white transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                      >
                        看產品功能
                      </Link>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-[4px] border border-gray-300 bg-transparent px-5 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                      >
                        再填一筆
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表單狀態
                  <form onSubmit={handleSubmit} noValidate>
                    {/* 身分別 radio 分流 */}
                    <fieldset className="mb-6">
                      <legend className={labelClass}>你的身分</legend>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {ROLES.map((roleItem) => {
                          const checked = fields.role === roleItem.key
                          return (
                            <label
                              key={roleItem.key}
                              className={[
                                'flex min-h-[44px] cursor-pointer items-center justify-center rounded-[4px] border px-3 py-2.5 text-sm font-bold transition-colors',
                                'focus-within:ring-2 focus-within:ring-primary-500',
                                checked
                                  ? 'border-transparent text-white'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800',
                              ].join(' ')}
                              style={
                                checked
                                  ? { backgroundColor: roleItem.accent }
                                  : undefined
                              }
                            >
                              <input
                                type="radio"
                                name="role"
                                value={roleItem.key}
                                checked={checked}
                                onChange={() => update('role', roleItem.key)}
                                className="sr-only"
                              />
                              {roleItem.name}
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>

                    {/* 公司名稱 */}
                    <div className="mb-5">
                      <label htmlFor="company" className={labelClass}>
                        公司名稱
                      </label>
                      <div className="relative">
                        <Building2
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                          aria-hidden="true"
                        />
                        <input
                          id="company"
                          name="company"
                          type="text"
                          required
                          autoComplete="organization"
                          value={fields.company}
                          onChange={(e) => update('company', e.target.value)}
                          placeholder="例：大廚餐飲"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    {/* 聯絡人 */}
                    <div className="mb-5">
                      <label htmlFor="name" className={labelClass}>
                        聯絡人
                      </label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                          aria-hidden="true"
                        />
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          autoComplete="name"
                          value={fields.name}
                          onChange={(e) => update('name', e.target.value)}
                          placeholder="您的姓名"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="mb-5">
                      <label htmlFor="email" className={labelClass}>
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                          aria-hidden="true"
                        />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          value={fields.email}
                          onChange={(e) => update('email', e.target.value)}
                          placeholder="you@company.com"
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    {/* 需求 */}
                    <div className="mb-6">
                      <label htmlFor="needs" className={labelClass}>
                        需求說明
                      </label>
                      <textarea
                        id="needs"
                        name="needs"
                        required
                        rows={4}
                        value={fields.needs}
                        onChange={(e) => update('needs', e.target.value)}
                        placeholder="簡單描述你目前的對帳流程、門市 / 供應商數量，或想了解的功能。"
                        className={`${inputClass} resize-y`}
                      />
                    </div>

                    {/* 錯誤訊息 */}
                    {status === 'error' && errorMsg && (
                      <p
                        className="mb-4 rounded-[4px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                        role="alert"
                      >
                        {errorMsg}
                      </p>
                    )}

                    {/* 送出 */}
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[4px] bg-primary-500 px-5 text-sm font-bold text-white transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:ring-offset-gray-900"
                    >
                      {status === 'submitting' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          送出中…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" aria-hidden="true" />
                          送出需求
                        </>
                      )}
                    </button>

                    {/* 法律實體 + 回覆承諾 */}
                    <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                      由「井然 Orderly」團隊處理，我們將於 1 個工作天內回覆。
                    </p>
                  </form>
                )}
              </div>

              {/* 替代聯絡指引（皆為站內真實路由） */}
              <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
                想先了解更多？看{' '}
                <Link
                  href="/#pricing"
                  className="rounded font-semibold text-primary-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400"
                >
                  定價方案
                </Link>{' '}
                或直接{' '}
                <Link
                  href="/register"
                  className="rounded font-semibold text-primary-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-primary-400"
                >
                  免費註冊
                </Link>
                。
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
