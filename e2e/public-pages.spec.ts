import { test, expect, type ConsoleMessage } from '@playwright/test'

/**
 * Landing / public pages E2E（Task 6）。
 *
 * 此 spec 為 RED：landing 元件（root app/page.tsx 與 components/landing/*）
 * 尚未建立，因此預期會 FAIL，待 Phase 2 元件完成後轉綠。
 *
 * 範圍僅限 landing 本頁與既有的 /login、/register；不驗 /contact /privacy /terms
 * 的 route-200（那些頁面於 Phase 3 建立，由後續 spec 覆蓋）。
 *
 * baseURL 與埠號由 playwright.config.ts 的 PLAYWRIGHT_BASE_URL 注入，spec 內不 hardcode。
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

  test('預約 Demo / 聯絡 CTA 的 href 等於 /contact（僅驗 href，不驗 200）', async ({
    page,
  }) => {
    await page.goto('/')
    const contactCta = page.locator('a[href="/contact"]').first()
    await expect(contactCta).toBeVisible()
    await expect(contactCta).toHaveAttribute('href', '/contact')
  })

  test('深色模式切換：點擊後 <html> 加上 class "dark"', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')

    // 切換鈕以 aria-label 或常見命名定位（元件需提供可存取的切換鈕）。
    const toggle = page
      .getByRole('button', { name: /(dark|深色|theme|主題|切換)/i })
      .first()
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
    page.on('pageerror', (err) => {
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
