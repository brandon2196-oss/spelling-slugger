import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { NewPlayer } from '../../data/types'
import { seededRng } from '../../engine/rng'
import { ResultsPage } from './ResultsPage'
import { startPracticeGame } from './startGame'

const cooper: NewPlayer = {
  name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}

describe('ResultsPage', () => {
  it('shows the score from the attempt log even if the saved summary has not landed yet', async () => {
    localStorage.clear()
    const store = createLocalStore()
    const p = await store.createPlayer(cooper)
    const l = await store.createWordList(p.id, { title: 'L', weekStart: '2026-10-19', words: ['cat', 'dog'].map((text) => ({ text, sentence: null })) })
    const g = await startPracticeGame(store, p.id, l.id, seededRng(1))
    // every word a first-try double: runner from second scores on the second double → 1 run
    for (const w of g.words) await store.recordAttempt(g.id, { position: w.position, attemptNumber: 1, text: w.text, correct: true, outcome: 'double' })
    // NOTE: completeGame deliberately not called

    const router = createMemoryRouter([{ path: '/game/:gameId/results', element: <ResultsPage /> }], { initialEntries: [`/game/${g.id}/results`] })
    render(
      <StoreContext.Provider value={store}>
        <RouterProvider router={router} />
      </StoreContext.Provider>,
    )
    expect(await screen.findByText(/New personal best!|Final score/)).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.queryByText('No results for that game yet.')).toBeNull()
  })
})
