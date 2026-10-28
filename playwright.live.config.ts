import { defineConfig, devices } from '@playwright/test'

/** Runs the e2e specs against a deployed copy: `LIVE_URL=https://… npx playwright test -c playwright.live.config.ts` */
const LIVE_URL = process.env.LIVE_URL
if (!LIVE_URL) throw new Error('LIVE_URL is required')

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: LIVE_URL, trace: 'retain-on-failure' },
  projects: [{ name: 'live', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } } }],
})
