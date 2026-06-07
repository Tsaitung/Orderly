import { mkdirSync } from 'fs'
import { join } from 'path'
import { expect, test } from '@playwright/test'

type RouteCase = {
  path: string
  screenshotName: string
}

const ROUTES: RouteCase[] = [
  { path: '/', screenshotName: 'home' },
  { path: '/contact', screenshotName: 'contact' },
  { path: '/privacy', screenshotName: 'privacy' },
  { path: '/terms', screenshotName: 'terms' },
]

const SCREENSHOT_DIR = join(process.cwd(), 'playwright-report', 'dark')

test.describe('Public pages dark-mode visual evidence', () => {
  for (const route of ROUTES) {
    test(`${route.path} renders dark with readable hero/legal heading`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'dark')
        document.documentElement.classList.add('dark')
        window.addEventListener('DOMContentLoaded', () => {
          document.documentElement.classList.add('dark')
        })
      })

      await page.goto(route.path)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('html')).toHaveClass(/dark/)

      mkdirSync(SCREENSHOT_DIR, { recursive: true })
      await page.screenshot({
        fullPage: true,
        path: join(SCREENSHOT_DIR, `${route.screenshotName}.png`),
      })

      const contrast = await page.evaluate(() => {
        type Rgba = { r: number; g: number; b: number; a: number }

        const parseCssColor = (value: string): Rgba | null => {
          const normalized = value.trim()
          if (!normalized || normalized === 'transparent') {
            return null
          }

          const numbers = normalized.match(/[\d.]+/g)?.map(Number)
          if (!numbers || numbers.length < 3) {
            return null
          }
          const [r, g, b, a = 1] = numbers as [
            number,
            number,
            number,
            number?,
          ]

          return {
            r,
            g,
            b,
            a,
          }
        }

        const luminance = ({ r, g, b }: Rgba) => {
          const toLinear = (channel: number) => {
            const value = channel / 255
            return value <= 0.03928
              ? value / 12.92
              : Math.pow((value + 0.055) / 1.055, 2.4)
          }

          return (
            0.2126 * toLinear(r) +
            0.7152 * toLinear(g) +
            0.0722 * toLinear(b)
          )
        }

        const effectiveBackground = (element: Element | null): Rgba => {
          let current: Element | null = element

          while (current) {
            const color = parseCssColor(
              window.getComputedStyle(current).backgroundColor,
            )
            if (color && color.a > 0.05) {
              return color
            }
            current = current.parentElement
          }

          return { r: 255, g: 255, b: 255, a: 1 }
        }

        const h1 = document.querySelector('h1')
        if (!h1) {
          return {
            hasH1: false,
            bodyLuminance: 1,
            headingDelta: 0,
            headingText: '',
          }
        }

        const bodyBackground = effectiveBackground(document.body)
        const h1Style = window.getComputedStyle(h1)
        const h1Color = parseCssColor(h1Style.color)
        const h1Background = effectiveBackground(h1)

        return {
          hasH1: true,
          bodyLuminance: luminance(bodyBackground),
          headingDelta: h1Color
            ? Math.abs(luminance(h1Color) - luminance(h1Background))
            : 0,
          headingText: h1.textContent?.trim() ?? '',
        }
      })

      expect(contrast.hasH1, `${route.path} must render an h1`).toBe(true)
      expect(
        contrast.bodyLuminance,
        `${route.path} body background should be dark in dark mode`,
      ).toBeLessThan(0.3)
      expect(
        contrast.headingDelta,
        `${route.path} first h1 should contrast with its effective background`,
      ).toBeGreaterThan(0.35)
    })
  }
})
