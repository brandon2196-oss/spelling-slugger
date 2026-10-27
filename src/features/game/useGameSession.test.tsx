import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createLocalStore } from '../../data/local-store'
import { StoreContext } from '../../data/store'
import type { NewPlayer, Store } from '../../data/types'
import { seededRng } from '../../engine/rng'
import { startPracticeGame } from './startGame'
import { useGameSession } from './useGameSession'

const cooper: NewPlayer = {
  name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}

let store: Store
let gameId: string
let words: string[]
beforeEach(async () => {
  localStorage.clear()
  store = createLocalStore()
  const p = await store.createPlayer(cooper)
  const l = await store.createWordList(p.id, { title: 'L', weekStart: '2026-10-19', words: ['cat', 'dog'].map((text) => ({ text, sentence: null })) })
  const g = await startPracticeGame(store, p.id, l.id, seededRng(1))
  gameId = g.id
  words = g.words.map((w) => w.text)
})

const wrapper = ({ children }: { children: ReactNode }) => <StoreContext.Provider value={store}>{children}</StoreContext.Provider>

describe('useGameSession', () => {
  it('loads the game, records a submission, and resumes at the next word after a reload', async () => {
    const h1 = renderHook(() => useGameSession(gameId), { wrapper })
    await waitFor(() => expect(h1.result.current.loading).toBe(false))
    await act(async () => {
      await h1.result.current.submit(words[0]!)
    })
    expect(h1.result.current.state!.index).toBe(1)
    expect(h1.result.current.busy).toBe(true)

    const h2 = renderHook(() => useGameSession(gameId), { wrapper })
    await waitFor(() => expect(h2.result.current.loading).toBe(false))
    expect(h2.result.current.state!.index).toBe(1)
    expect(h2.result.current.state!.tallies.doubles).toBe(1)
  })

  it('(26) ignores submissions while busy and never writes them', async () => {
    const h = renderHook(() => useGameSession(gameId), { wrapper })
    await waitFor(() => expect(h.result.current.loading).toBe(false))
    await act(async () => {
      await h.result.current.submit('zzz')
    })
    let ev
    await act(async () => {
      ev = await h.result.current.submit('zzz')
    })
    expect(ev).toEqual({ kind: 'ignored', reason: 'busy' })
    expect((await store.getGame(gameId))!.attempts).toHaveLength(1)
    act(() => h.result.current.setBusy(false))
    expect(h.result.current.busy).toBe(false)
  })

  it('(25) completes the game and saves a summary matching the engine', async () => {
    const h = renderHook(() => useGameSession(gameId), { wrapper })
    await waitFor(() => expect(h.result.current.loading).toBe(false))
    await act(async () => {
      await h.result.current.submit(words[0]!)
    })
    act(() => h.result.current.setBusy(false))
    await act(async () => {
      await h.result.current.submit(words[1]!)
    })
    const rec = (await store.getGame(gameId))!
    expect(rec.status).toBe('complete')
    expect(rec.summary!.runs).toBe(h.result.current.state!.tallies.runs)
    expect(rec.summary!.doubles).toBe(2)
    expect(rec.summary!.runs).toBe(1)
  })
})
