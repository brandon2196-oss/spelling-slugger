import { expect, test } from '@playwright/test'
import { noHorizontalScroll } from './helpers'

test('welcome screen fits the viewport and is installable', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Grand Slam Spelling' })).toBeVisible()
  expect(await noHorizontalScroll(page)).toBe(true)
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1)
})

test('sign-in screen fits the viewport', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  expect(await noHorizontalScroll(page)).toBe(true)
})
