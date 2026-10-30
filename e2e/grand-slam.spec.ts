import { expect, test } from '@playwright/test'
import { addWordListWithDifficulty, cleanupFamily, registerAndCreatePlayer, spoken, stubSpeech } from './helpers'

test.afterEach(async ({ page }) => { await cleanupFamily(page) })

test('two kids, a hard word on the first try is a home run', async ({ page }) => {
  await stubSpeech(page)
  const cooperId = await registerAndCreatePlayer(page)

  await page.goto('/players')
  await page.getByRole('link', { name: 'Add sibling' }).click()
  await page.getByLabel('Player name').fill('Mia')
  await page.getByRole('radio', { name: 'Right-handed' }).click()
  await page.getByRole('button', { name: 'Save player' }).click()
  await page.waitForURL(/\/play\/[^/]+$/)
  await page.goto('/players')
  await expect(page.getByRole('link', { name: 'Play as Cooper' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Play as Mia' })).toBeVisible()

  await addWordListWithDifficulty(page, cooperId, [['rhythm', 'Hard']])

  await page.goto(`/play/${cooperId}`)
  await page.getByRole('button', { name: "Play this week's game" }).click()
  await page.waitForURL(/\/game\/[^/]+$/)
  const input = page.getByLabel('Spell the word')
  await expect(input).toBeEnabled()
  await expect.poll(async () => (await spoken(page)).includes('rhythm')).toBe(true)
  await input.fill('rhythm')
  await input.press('Enter')
  // One word ends the game at once, so HOME RUN! and the scoreboard flash past; check the results instead.
  await page.waitForURL(/\/results$/)
  await expect(page.getByRole('term').filter({ hasText: /^Hits$/ }).locator('+ dd')).toHaveText('1')
  await expect(page.getByRole('term').filter({ hasText: /^Home runs$/ }).locator('+ dd')).toHaveText('1')
})
