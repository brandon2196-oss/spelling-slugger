import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the LOCAL store (no Supabase) with animations off, in the Chrome
 * already installed on this machine (no browser download). Two viewports: a laptop and an iPhone.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5199 --strictPort --mode e2e',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_STORE: 'local', VITE_NO_ANIMATION: '1', VITE_APP_URL: 'http://127.0.0.1:5199' },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } } },
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium', channel: 'chrome' } },
  ],
})
