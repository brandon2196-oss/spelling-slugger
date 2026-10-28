import { expect, test } from '@playwright/test'
import { cleanupFamily, openNewList, registerAndCreatePlayer, stubSpeech } from './helpers'

test.afterEach(async ({ page }) => {
  await cleanupFamily(page)
})

const fixture = (name: string) => new URL(`./fixtures/${name}.pdf`, import.meta.url).pathname

test.describe('PDF import', () => {
  test.beforeEach(async ({ page }) => {
    await stubSpeech(page)
  })

  test('a two-column numbered teacher sheet becomes the week\'s list', async ({ page }) => {
    const playerId = await registerAndCreatePlayer(page)
    await openNewList(page, playerId)

    await page.getByLabel('Choose a PDF').setInputFiles(fixture('two-column'))
    await expect(page.getByRole('heading', { name: 'Found 18 words in two-column.pdf' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'bright', exact: true, pressed: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'midnight', pressed: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Lee' })).toHaveCount(0)

    await page.getByRole('button', { name: 'nightmare', pressed: true }).click()
    await page.getByRole('button', { name: 'Add 17 words' }).click()

    await expect(page.getByLabel('Word 1', { exact: true })).toHaveValue('bright')
    await expect(page.getByLabel('Word 17', { exact: true })).toHaveValue('brightness')
    await expect(page.getByText('17 / 15')).toBeVisible()

    await page.getByRole('button', { name: 'Save list' }).click()
    await page.waitForURL(new RegExp(`/parent/players/${playerId}/lists$`))
    await expect(page.getByText('Active', { exact: true })).toBeVisible()
  })

  test('a scanned sheet explains itself and hands over to paste', async ({ page }) => {
    const playerId = await registerAndCreatePlayer(page)
    await openNewList(page, playerId)

    await page.getByLabel('Choose a PDF').setInputFiles(fixture('scanned'))
    await expect(page.getByText(/picture of the words/)).toBeVisible()
    await page.getByRole('button', { name: 'Paste instead' }).click()
    await expect(page.getByLabel(/Paste words/)).toBeVisible()
  })
})
