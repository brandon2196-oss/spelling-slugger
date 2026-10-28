import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { NewPlayer, Store } from '../../data/types'
import { seededRng } from '../../engine/rng'
import { GamePage } from './GamePage'
import { startPracticeGame } from './startGame'

vi.mock('../../audio/speech', () => ({
  speechAvailable: () => true,
  speak: vi.fn(() => Promise.resolve()),
  speakWord: vi.fn(() => Promise.resolve()),
  speakSlowly: vi.fn(() => Promise.resolve()),
  speakSentence: vi.fn(() => Promise.resolve()),
  umpire: vi.fn(() => Promise.resolve()),
  primeSpeech: vi.fn(),
  setSpeechVolume: vi.fn(),
  availableVoices: () => [],
}))
vi.mock('../../field/Field', () => ({ Field: () => <div data-testid="field" /> }))

const cooper: NewPlayer = {
  name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}

async function setup(wordTexts: string[]): Promise<{ store: Store; words: string[] }> {
  vi.stubEnv('VITE_NO_ANIMATION', '1')
  localStorage.clear()
  const store = createLocalStore()
  const p = await store.createPlayer(cooper)
  const l = await store.createWordList(p.id, { title: 'L', weekStart: '2026-10-19', words: wordTexts.map((text) => ({ text, sentence: null })) })
  const g = await startPracticeGame(store, p.id, l.id, seededRng(1))
  const router = createMemoryRouter(
    [
      { path: '/game/:gameId', element: <GamePage /> },
      { path: '/game/:gameId/results', element: <div>results page</div> },
    ],
    { initialEntries: [`/game/${g.id}`] },
  )
  render(
    <StoreContext.Provider value={store}>
      <RouterProvider router={router} />
    </StoreContext.Provider>,
  )
  return { store, words: g.words.map((w) => w.text) }
}

describe('GamePage', () => {
  it('never shows the current word while the at-bat is active', async () => {
    const { words } = await setup(['pterodactyl', 'xylophone'])
    await screen.findByRole('textbox')
    expect(screen.queryByText(new RegExp(words[0]!, 'i'))).toBeNull()
  })

  it('reveals the word after three strikes and counts the out', async () => {
    const user = userEvent.setup()
    const { words } = await setup(['pterodactyl', 'xylophone'])
    const input = await screen.findByRole('textbox')
    for (let i = 0; i < 2; i++) {
      await user.type(input, 'wrong{Enter}')
      await waitFor(() => expect(input).not.toBeDisabled())
    }
    await user.type(input, 'wrong{Enter}')
    const reveal = await screen.findByTestId('reveal')
    expect(within(reveal).getByText(words[0]!)).toBeInTheDocument()
    expect(screen.getByTestId('outs')).toHaveTextContent('1')
  })

  it('shows a double on the scoreboard after a first-try hit and moves to the results page at the end', async () => {
    const user = userEvent.setup()
    const { words } = await setup(['cat'])
    const input = await screen.findByRole('textbox')
    await user.type(input, `${words[0]}{Enter}`)
    await screen.findByText('results page')
  })
})
