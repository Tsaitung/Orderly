import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 設定 — 僅供 landing / public pages 的 E2E 測試使用。
 *
 * 重要：本設定「不」啟動或擁有 dev server，假設開發伺服器已在 baseURL 上執行。
 * baseURL 來自環境變數 PLAYWRIGHT_BASE_URL，未設定時 fallback 到 http://localhost:5566。
 * 路由與埠號不 hardcode 在測試內，一律透過此 baseURL 注入。
 */
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:5566'
const isCI = !!process.env['CI']

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
