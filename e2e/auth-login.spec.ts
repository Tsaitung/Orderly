import { expect, test } from '@playwright/test'

test.describe('Social auth login', () => {
  test('login page has no password field', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
  })

  test('Line CTA calls oauth initiate', async ({ page }) => {
    let initiated = false
    await page.route('**/api/auth/oauth/line/initiate', async route => {
      initiated = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authorization_url: 'https://access.line.me/oauth2/v2.1/authorize?state=test',
          state: 'test',
          code_verifier: 'verifier',
        }),
      })
    })

    await page.goto('/login')
    await page.getByRole('button', { name: /Line/i }).click()
    await expect.poll(() => initiated).toBe(true)
  })

  test('Google CTA present', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /Google/i })).toBeVisible()
  })

  test('auth callback alias renders instead of 404', async ({ page }) => {
    await page.goto('/auth/callback/line')
    await expect(page.getByRole('heading', { name: '社群登入狀態無效' })).toBeVisible()
  })

  test('MFA page renders with stored challenge', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => sessionStorage.setItem('orderly_mfa_challenge', 'header.payload.signature'))
    await page.goto('/mfa')
    await expect(page.getByRole('heading', { name: 'MFA 驗證' })).toBeVisible()
  })
})
