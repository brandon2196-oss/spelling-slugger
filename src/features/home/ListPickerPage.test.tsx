import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { NewPlayer, Store } from '../../data/types'
import { createGame, submitAnswer } from '../../engine/game'
import { summarize } from '../../engine/results'
import { seededRng } from '../../engine/rng'
import { startWeeklyGame } from '../game/startGame'
import { ChildHomePage } from './ChildHomePage'
import { ListPickerPage } from './ListPickerPage'

const cooper: NewPlayer = {
  name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}

async function seed(): Promise<{ store: Store; playerId: string }> {
  localStorage.clear()
  const store = createLocalStore()
  const p = await store.createPlayer(cooper)
  const l = await store.createWordList(p.id, { title: 'Week A', weekStart: '2026-10-19', words: ['cat', 'dog'].map((text) => ({ text, sentence: null })) })
  await store.setActiveList(p.id, l.id)
  // one completed weekly game with 1 run (double, double)
  const g = await startWeeklyGame(store, p.id, l.id, seededRng(1))
  let state = createGame(g.words)
  for (const w of g.words) {
    const { state: next, event } = submitAnswer(state, w.text)
    if (event.kind === 'at-bat-complete') {
      const a = event.attempts[0]!
      await store.recordAttempt(g.id, { position: w.position, attemptNumber: 1, text: a.text, correct: true, outcome: event.outcome })
    }
    state = next
  }
  await store.completeGame(g.id, summarize(state))
  return { store, playerId: p.id }
}

function mount(store: Store, path: string) {
  const router = createMemoryRouter(
    [
      { path: '/play/:playerId', element: <ChildHomePage /> },
      { path: '/play/:playerId/pick/:mode', element: <ListPickerPage /> },
      { path: '/game/:gameId', element: <div>game screen</div> },
    ],
    { initialEntries: [path] },
  )
  render(
    <StoreContext.Provider value={store}>
      <RouterProvider router={router} />
    </StoreContext.Provider>,
  )
}

describe('ListPickerPage', () => {
  it('shows each list with its best score in that mode', async () => {
    const { store, playerId } = await seed()
    mount(store, `/play/${playerId}/pick/previous`)
    expect(await screen.findByText('Week A')).toBeInTheDocument()
    expect(screen.getByText(/Best: 1 run/)).toBeInTheDocument()
  })
  it('starts a game when a list is picked', async () => {
    const user = userEvent.setup()
    const { store, playerId } = await seed()
    mount(store, `/play/${playerId}/pick/practice`)
    await user.click(await screen.findByRole('button', { name: /Week A/ }))
    expect(await screen.findByText('game screen')).toBeInTheDocument()
  })
})

describe('ChildHomePage missed words', () => {
  it('explains when there is nothing to practice', async () => {
    const user = userEvent.setup()
    const { store, playerId } = await seed()
    mount(store, `/play/${playerId}`)
    await user.click(await screen.findByRole('button', { name: /missed words/i }))
    expect(await screen.findByText('No missed words yet. Nice!')).toBeInTheDocument()
  })
})
