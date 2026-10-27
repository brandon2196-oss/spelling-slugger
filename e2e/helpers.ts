import type { Page } from '@playwright/test'

/** Replace the browser's speech with a recorder so tests can read what the game said. */
export async function stubSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    class U {
      text: string
      rate = 1
      pitch = 1
      volume = 1
      lang = ''
      voice: unknown = null
      onend: null | (() => void) = null
      onerror: null | (() => void) = null
      constructor(text: string) {
        this.text = text
      }
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak(u: U) {
          if (u.text.trim()) spoken.push(u.text)
          setTimeout(() => u.onend?.(), 0)
        },
        cancel() {},
        getVoices() {
          return []
        },
        speaking: false,
      },
    })
  })
}

export const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken)

export async function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
}

/** Register a fresh family and create a left-handed player named Cooper. Returns the player id. */
export async function registerAndCreatePlayer(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`
  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel(/^Password/).fill('e2e-password-123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL(/\/players\/new$/)
  await page.getByLabel('Player name').fill('Cooper')
  await page.getByRole('radio', { name: 'Left-handed' }).click()
  await page.getByRole('button', { name: 'Save player' }).click()
  await page.waitForURL(/\/play\/[^/]+$/)
  return page.url().split('/play/')[1]!
}

/** Open the parent zone (setting the PIN 1234 the first time) and save a word list. */
export async function addWordList(page: Page, playerId: string, words: string[]): Promise<void> {
  await page.goto('/parent')
  await page.getByText('Set a parent PIN').waitFor()
  for (const d of '1234'.split('')) await page.getByRole('button', { name: d, exact: true }).click()
  await page.getByText('Enter the same 4 digits again.').waitFor()
  for (const d of '1234'.split('')) await page.getByRole('button', { name: d, exact: true }).click()
  await page.waitForURL(new RegExp(`/parent/players/${playerId}/lists$`))
  await page.getByRole('link', { name: 'New week' }).click()
  const input = page.getByLabel('Type a word and press Enter')
  for (const w of words) {
    await input.fill(w)
    await input.press('Enter')
  }
  await page.getByRole('button', { name: 'Save list' }).click()
  await page.waitForURL(new RegExp(`/parent/players/${playerId}/lists$`))
  await page.getByText('Active', { exact: true }).waitFor()
}
