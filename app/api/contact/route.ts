/**
 * /api/contact — 聯絡表單 POST 接口（井然 Orderly premium landing）。
 *
 * 行為契約：
 *   - 僅接受 POST；驗證必填欄位（role / company / name / email / needs）。
 *   - 隱私：只 log { requestId, role, timestamp }，絕不記錄任何 PII
 *     （email / 聯絡人 / 公司 / 需求內容皆不進 log）。
 *   - 驗證成功回傳 { ok: true, requestId }；缺欄位回 400；非 JSON 回 400。
 *
 * 注意：此處不做任何外部寄送 / 持久化（屬後續任務）；本接口僅負責驗證 +
 * 產生 requestId + 不含 PII 的稽核 log，供前端表單顯示成功狀態。
 */

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/** 允許的身分別，與前端 radio 選項一致。 */
const ALLOWED_ROLES = ['restaurant', 'supplier', 'platform'] as const
type ContactRole = (typeof ALLOWED_ROLES)[number]

interface ContactPayload {
  role?: unknown
  company?: unknown
  name?: unknown
  email?: unknown
  needs?: unknown
}

/** 簡易非空字串檢查（trim 後仍有內容）。 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** 基本 email 格式檢查（不做過度嚴格驗證，僅擋明顯無效輸入）。 */
function isLikelyEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export async function POST(request: Request) {
  const requestId = randomUUID()
  const timestamp = new Date().toISOString()

  let body: ContactPayload
  try {
    body = (await request.json()) as ContactPayload
  } catch {
    // 無法解析 JSON：僅記錄不含 PII 的失敗事件。
    console.warn('[contact] invalid JSON body', { requestId, timestamp })
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 })
  }

  const role = body.role
  const missing: string[] = []

  if (!isNonEmptyString(role) || !ALLOWED_ROLES.includes(role as ContactRole)) {
    missing.push('role')
  }
  if (!isNonEmptyString(body.company)) missing.push('company')
  if (!isNonEmptyString(body.name)) missing.push('name')
  if (!isLikelyEmail(body.email)) missing.push('email')
  if (!isNonEmptyString(body.needs)) missing.push('needs')

  if (missing.length > 0) {
    // 失敗 log 同樣不含 PII，只記錄欄位「名稱」與 requestId。
    console.warn('[contact] validation failed', { requestId, timestamp, missing })
    return NextResponse.json({ ok: false, error: 'VALIDATION_FAILED', missing }, { status: 400 })
  }

  // 唯一允許落地的稽核資訊：requestId / role / timestamp（無任何 PII）。
  console.info('[contact] received', {
    requestId,
    role: role as ContactRole,
    timestamp,
  })

  return NextResponse.json({ ok: true, requestId })
}
