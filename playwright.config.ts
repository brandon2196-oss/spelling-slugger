import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run in the Chrome already installed on this machine (no browser download), with
 * animations off. `desktop` and `iphone` use the LOCAL store (no server). `api` runs the same specs
 * against the real server: a production build served by server/dist on an embedded Postgres (PGlite).
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
  webServer: [
    {
      command: 'npx vite --host 127.0.0.1 --port 5199 --strictPort --mode e2e',
      url: 'http://127.0.0.1:5199',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { VITE_STORE: 'local', VITE_NO_ANIMATION: '1', VITE_APP_URL: 'http://127.0.0.1:5199' },
    },
    {
      command:
        'npm run -s build:server && npx vite build --outDir dist-e2e --mode e2e && ' +
        'DATABASE_URL=pglite:// PORT=5198 SECURE_COOKIES=0 STATIC_DIR=dist-e2e node server/dist/index.mjs',
      url: 'http://127.0.0.1:5198/api/auth/me',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { VITE_STORE: 'api', VITE_NO_ANIMATION: '1', VITE_APP_URL: 'http://127.0.0.1:5198' },
    },
  ],
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } } },
    { name: 'iphone', use: { ...devices['iPhone 14'], browserName: 'chromium', channel: 'chrome' } },
    {
      name: 'api',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 }, baseURL: 'http://127.0.0.1:5198' },
    },
  ],
})
