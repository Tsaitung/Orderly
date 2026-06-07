import { mkdirSync } from 'fs'
import { join } from 'path'
import { expect, test } from '@playwright/test'

const SCREENSHOT_DIR = join(process.cwd(), 'playwright-report', 'no-js')

test('landing deep sections remain visible without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
  })
  const page = await context.newPage()

  try {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const pricing = page.locator('#pricing')
    const footer = page.locator('footer').first()

    await expect(pricing).toBeVisible()
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('Orderly')

    const pricingVisibility = await pricing.evaluate((element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()

      return {
        opacity: Number(style.opacity),
        height: rect.height,
        width: rect.width,
      }
    })

    const footerVisibility = await footer.evaluate((element) => {
      const style = window.getComputedStyle(element)
      const rect = element.getBoundingClientRect()

      return {
        opacity: Number(style.opacity),
        height: rect.height,
        width: rect.width,
      }
    })

    expect(pricingVisibility.opacity).toBeGreaterThan(0.5)
    expect(pricingVisibility.height).toBeGreaterThan(0)
    expect(pricingVisibility.width).toBeGreaterThan(0)
    expect(footerVisibility.opacity).toBeGreaterThan(0.5)
    expect(footerVisibility.height).toBeGreaterThan(0)
    expect(footerVisibility.width).toBeGreaterThan(0)

    mkdirSync(SCREENSHOT_DIR, { recursive: true })
    await page.screenshot({
      fullPage: true,
      path: join(SCREENSHOT_DIR, 'home.png'),
    })
  } finally {
    await context.close()
  }
})
