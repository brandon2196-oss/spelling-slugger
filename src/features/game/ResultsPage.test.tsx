import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { NewPlayer } from '../../data/types'
import { seededRng } from '../../engine/rng'
import { rebuild } from '../../engine/replay'
import { summarize } from '../../engine/results'
import { ResultsPage } from './ResultsPage'
import { startPracticeGame, startWeeklyGame } from './startGame'

vi.mock('../../field/Field', () => ({ Field: () => <div data-testid="field" /> }))

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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^1run$/)
    expect(screen.queryByText('No results for that game yet.')).toBeNull()
  })
  it('shows a Home runs row', async () => {
    localStorage.clear()
    const store = createLocalStore()
    const p = await store.createPlayer(cooper)
    const l = await store.createWordList(p.id, { title: 'L', weekStart: '2026-10-19', words: ['cat', 'dog'].map((text) => ({ text, sentence: null })) })
    const g = await startPracticeGame(store, p.id, l.id, seededRng(1))
    for (const w of g.words) await store.recordAttempt(g.id, { position: w.position, attemptNumber: 1, text: w.text, correct: true, outcome: 'double' })
    const saved = await store.getGame(g.id)
    await store.completeGame(g.id, { ...summarize(rebuild(saved!.words, saved!.attempts)), homeRuns: 2 })
    const router = createMemoryRouter([{ path: '/game/:gameId/results', element: <ResultsPage /> }], { initialEntries: [`/game/${g.id}/results`] })
    render(
      <StoreContext.Provider value={store}>
        <RouterProvider router={router} />
      </StoreContext.Provider>,
    )
    const label = await screen.findByText('Home runs')
    expect(label.nextElementSibling?.textContent).toBe('2')
  })

  it('offers a one-tap practice of only this game\'s missed words', async () => {
    localStorage.clear()
    const store = createLocalStore()
    const p = await store.createPlayer(cooper)
    const l = await store.createWordList(p.id, { title: 'L', weekStart: '2026-10-19', words: ['cat', 'dog'].map((text) => ({ text, sentence: null })) })
    const g = await startPracticeGame(store, p.id, l.id, seededRng(1))
    const [a, b] = g.words
    for (const n of [1, 2, 3] as const) await store.recordAttempt(g.id, { position: a!.position, attemptNumber: n, text: 'q', correct: false, outcome: n === 3 ? 'strikeout' : null })
    await store.recordAttempt(g.id, { position: b!.position, attemptNumber: 1, text: b!.text, correct: true, outcome: 'double' })

    const router = createMemoryRouter(
      [{ path: '/game/:gameId/results', element: <ResultsPage /> }, { path: '/game/:gameId', element: <p>game page</p> }],
      { initialEntries: [`/game/${g.id}/results`] },
    )
    render(<StoreContext.Provider value={store}><RouterProvider router={router} /></StoreContext.Provider>)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Practice these words' }))
    await screen.findByText('game page')
    const id = router.state.location.pathname.split('/').pop()!
    const next = (await store.getGame(id))!
    expect(next.mode).toBe('missed')
    expect(next.words.map((w) => w.text)).toEqual([a!.text])
    expect(screen.queryByText('Practice missed words')).toBeNull()
  })

  it('a weekly game: WIN or LOSS, both teams on the line score, the record, and the play of the game', async () => {
    localStorage.clear()
    const store = createLocalStore()
    const p = await store.createPlayer(cooper)
    const l = await store.createWordList(p.id, { title: 'L', weekStart: '2026-10-19', words: ['cat', 'dog', 'sun'].map((text) => ({ text, sentence: null })) })
    await store.setActiveList(p.id, l.id)
    const g = await startWeeklyGame(store, p.id, l.id)
    for (const w of g.words) await store.recordAttempt(g.id, { position: w.position, attemptNumber: 1, text: w.text, correct: true, outcome: 'double' })
    await store.completeGame(g.id, summarize(rebuild(g.words, [])))
    const saved = (await store.getGame(g.id))!
    expect(saved.result).toMatch(/^(win|loss)$/)

    const router = createMemoryRouter([{ path: '/game/:gameId/results', element: <ResultsPage /> }], { initialEntries: [`/game/${g.id}/results`] })
    render(<StoreContext.Provider value={store}><RouterProvider router={router} /></StoreContext.Provider>)
    expect(await screen.findByTestId('result')).toHaveTextContent(saved.result === 'win' ? 'Win' : 'Loss')
    expect(screen.getByTestId('line-score')).toHaveTextContent('Visitors')
    expect(screen.getByTestId('visitors')).toHaveTextContent(String(saved.visitorRuns))
    expect(await screen.findByTestId('season-record')).toHaveTextContent(saved.result === 'win' ? 'Record: 1 and 0' : 'Record: 0 and 1')
    expect(await screen.findByTestId('highlight-caption')).toHaveTextContent(/Double on "/)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.queryByTestId('highlight')).toBeNull()
    expect(screen.getByRole('button', { name: 'Play again' })).toBeEnabled()
  })
})
