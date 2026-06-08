import { test, expect, type ConsoleMessage } from '@playwright/test'

/**
 * Landing / public pages E2E。
 *
 * 覆蓋公開首頁、既有 auth 路由，以及 Phase 3 新增的 /contact、/privacy、
 * /terms。baseURL 與埠號由 playwright.config.ts 的 PLAYWRIGHT_BASE_URL
 * 注入，spec 內不 hardcode。
 *
 * 注意：/contact 的 API route 是 PII-safe stub；此測試只驗使用者可見成功狀態，
 * 不驗外部寄信或 CRM 串接。
 */

/** landing 上必須存在且可見的區段 anchor id。 */
const SECTION_IDS = ['features', 'pricing', 'reconciliation', 'roles', 'faq'] as const

test.describe('Landing (public home)', () => {
  test('/ 載入，Hero 同時出現「8 小時」與「30 分鐘」', async ({ page }) => {
    await page.goto('/')
    const body = page.locator('body')
    await expect(body).toContainText('8 小時')
    await expect(body).toContainText('30 分鐘')
  })

  test('五個 anchor 區段都存在且可見', async ({ page }) => {
    await page.goto('/')
    for (const id of SECTION_IDS) {
      const section = page.locator(`#${id}`)
      await expect(section, `區段 #${id} 應存在且可見`).toBeVisible()
    }
  })

  test('站內 nav / CTA anchor 可點擊並捲動到對應區段', async ({ page }) => {
    await page.goto('/')

    // 找出第一個指向 #features 的站內 anchor（nav 連結）。
    const featuresAnchor = page.locator('a[href="#features"]').first()
    await expect(featuresAnchor).toBeVisible()
    await featuresAnchor.click()

    const featuresSection = page.locator('#features')
    await expect(featuresSection).toBeInViewport()

    // 同樣驗證 #pricing 的站內捲動。
    const pricingAnchor = page.locator('a[href="#pricing"]').first()
    await expect(pricingAnchor).toBeVisible()
    await pricingAnchor.click()
    await expect(page.locator('#pricing')).toBeInViewport()
  })

  test('預約 Demo / 聯絡 CTA 的 href 等於 /contact（僅驗 href，不驗 200）', async ({ page }) => {
    await page.goto('/')
    const contactCta = page.locator('a[href="/contact"]').first()
    await expect(contactCta).toBeVisible()
    await expect(contactCta).toHaveAttribute('href', '/contact')
  })

  test('深色模式切換：點擊後 <html> 加上 class "dark"', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')

    // 切換鈕以 aria-label 或常見命名定位（元件需提供可存取的切換鈕）。
    const toggle = page.getByRole('button', { name: /(dark|深色|theme|主題|切換)/i }).first()
    await expect(toggle).toBeVisible()
    await toggle.click()
    await expect(html).toHaveClass(/dark/)
  })

  test('載入時 console 無錯誤', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    page.on('pageerror', err => {
      errors.push(err.message)
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(errors, `console 不應有錯誤，但收到：\n${errors.join('\n')}`).toEqual([])
  })
})

test.describe('Existing auth pages (already built)', () => {
  test('/login 回應 200', async ({ page }) => {
    const response = await page.goto('/login')
    expect(response, '/login 應有回應').not.toBeNull()
    expect(response?.status()).toBe(200)
  })

  test('/register 回應 200', async ({ page }) => {
    const response = await page.goto('/register')
    expect(response, '/register 應有回應').not.toBeNull()
    expect(response?.status()).toBe(200)
  })
})

test.describe('Marketing pages', () => {
  test('/contact 表單送出後顯示成功狀態', async ({ page }) => {
    const response = await page.goto('/contact')
    expect(response, '/contact 應有回應').not.toBeNull()
    expect(response?.status()).toBe(200)

    await expect(page.locator('nav').first()).toBeVisible()
    await expect(page.locator('footer').first()).toBeVisible()

    await page.getByLabel('公司名稱').fill('測試餐飲股份有限公司')
    await page.getByLabel('聯絡人').fill('測試使用者')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('需求說明').fill('想了解井然 Orderly 的對帳流程與導入時程。')

    await page.getByRole('button', { name: '送出需求' }).click()

    await expect(page.getByRole('status')).toContainText('已收到你的需求，謝謝！')
  })

  test('/privacy 回應 200 並顯示誠實整理中說明', async ({ page }) => {
    const response = await page.goto('/privacy')
    expect(response, '/privacy 應有回應').not.toBeNull()
    expect(response?.status()).toBe(200)

    await expect(page.locator('nav').first()).toBeVisible()
    await expect(page.locator('footer').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '隱私權政策' })).toBeVisible()
    await expect(page.locator('body')).toContainText('整理中')
  })

  test('/terms 回應 200 並顯示誠實整理中說明', async ({ page }) => {
    const response = await page.goto('/terms')
    expect(response, '/terms 應有回應').not.toBeNull()
    expect(response?.status()).toBe(200)

    await expect(page.locator('nav').first()).toBeVisible()
    await expect(page.locator('footer').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: '服務條款' })).toBeVisible()
    await expect(page.locator('body')).toContainText('整理中')
  })
})
