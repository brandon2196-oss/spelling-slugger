import { expect, test } from '@playwright/test'
import { addWordList, cleanupFamily, noHorizontalScroll, registerAndCreatePlayer, spoken, stubSpeech } from './helpers'

test.afterEach(async ({ page }) => {
  await cleanupFamily(page)
})

test('a family registers, adds words, and plays a game that survives a reload', async ({ page }) => {
  await stubSpeech(page)
  const playerId = await registerAndCreatePlayer(page)
  await addWordList(page, playerId, ['cat', 'dog', 'sun'])

  await page.goto(`/play/${playerId}`)
  // the booth: pick the laid-back announcer, then play
  await page.getByRole('button', { name: /Smooth Eddie/ }).click()
  await expect(page.getByRole('button', { name: /Smooth Eddie/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: "Play this week's game" }).click()
  await page.waitForURL(/\/game\/[^/]+$/)
  const input = page.getByLabel('Spell the word')
  await expect(input).toBeEnabled()
  await page.locator('[data-field-ready="1"]').waitFor() // the stadium is drawn; plays will animate
  expect(await noHorizontalScroll(page)).toBe(true)

  // phone held sideways: the batter and the keyboard must both be on screen without scrolling
  const original = page.viewportSize()!
  await page.setViewportSize({ width: 844, height: 390 })
  const box = (await input.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(390)
  await expect(page.locator('canvas')).toBeVisible()
  await page.setViewportSize(original)

  // (27) the first word was spoken aloud, never shown. The announcer talks too (lines with spaces);
  // the spelling word is the last single-token utterance.
  await expect.poll(async () => (await spoken(page)).filter((t) => !/\s/.test(t)).length).toBeGreaterThan(0)
  const first = (await spoken(page)).filter((t) => !/\s/.test(t)).at(-1)!
  await expect(page.locator('main')).not.toContainText(first)

  // a first-try double
  await input.fill(first)
  await input.press('Enter')
  await expect(page.getByTestId('hits')).toHaveText('1')
  await expect(page.getByTestId('progress')).toContainText('Word 2/3')

  // one wrong submission = one strike, however wrong it is
  await expect(input).toBeEnabled()
  await input.fill('zzzzzzzz')
  await input.press('Enter')
  await expect(page.getByTestId('strikes')).toHaveText('1')

  // (24) reload mid-word: same word, same strike count
  await page.reload()
  await expect(page.getByLabel('Spell the word')).toBeEnabled()
  await page.locator('[data-field-ready="1"]').waitFor()
  await expect(page.getByTestId('strikes')).toHaveText('1')
  await expect(page.getByTestId('progress')).toContainText('Word 2/3')

  // finish the game by typing whatever was spoken last; word 2 is a single that moves the runner
  // off second, word 3 a double that scores him — both vacate a base, which once froze the field
  for (let i = 0; i < 2; i++) {
    const words = (await spoken(page)).filter((t) => !/\s/.test(t))
    const word = words[words.length - 1]!
    const field = page.getByLabel('Spell the word')
    await field.fill(word)
    await field.press('Enter')
    if (i === 0) {
      await expect(page.getByTestId('progress')).toContainText('Word 3/3')
      await expect(page.getByLabel('Spell the word')).toBeEnabled({ timeout: 10_000 })
    }
  }
  await expect(page.getByTestId('runs')).toHaveText('1')
  await page.waitForURL(/\/results$/)
  await expect(page.getByText(/run/)).toBeVisible()
  await expect(page.getByText('Final score').or(page.getByText('New personal best!'))).toBeVisible()
  expect(await noHorizontalScroll(page)).toBe(true)
})

test('the parent zone needs the PIN and shows the finished game', async ({ page }) => {
  await stubSpeech(page)
  const playerId = await registerAndCreatePlayer(page)
  await addWordList(page, playerId, ['cat'])
  await page.goto(`/play/${playerId}`)
  // the booth: pick the laid-back announcer, then play
  await page.getByRole('button', { name: /Smooth Eddie/ }).click()
  await expect(page.getByRole('button', { name: /Smooth Eddie/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: "Play this week's game" }).click()
  const input = page.getByLabel('Spell the word')
  await expect(input).toBeEnabled()
  await input.fill('cat')
  await input.press('Enter')
  await page.waitForURL(/\/results$/)

  // a new tab has no unlock: the PIN pad comes back
  const fresh = await page.context().newPage()
  await fresh.goto(`/parent/players/${playerId}/history`)
  await expect(fresh.getByRole('heading', { name: 'Parent zone' })).toBeVisible()
  for (const d of '9999'.split('')) await fresh.getByRole('button', { name: d, exact: true }).click()
  await expect(fresh.getByText("That's not it. Ask a grown-up.")).toBeVisible()
  for (const d of '1234'.split('')) await fresh.getByRole('button', { name: d, exact: true }).click()
  await expect(fresh.getByRole('heading', { name: 'Game history' })).toBeVisible()
  await expect(fresh.getByRole('cell', { name: 'Weekly' })).toBeVisible()
})
