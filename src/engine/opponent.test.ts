import { describe, expect, it } from 'vitest'
import { createGame, submitAnswer } from './game'
import { gameResult, visitorRuns, visitorScore } from './opponent'
import { rebuild } from './replay'
import { seededRng } from './rng'
import type { Difficulty, GameState, GameWord } from './types'

const words = (mix: Difficulty[]): GameWord[] =>
  mix.map((difficulty, i) => ({ position: i, text: `word${i}`, sentence: null, source: 'current', difficulty, sourceWordId: null }))

/** The typical kid from the brief: 70% first try, 20% second, 5% third, 5% miss. */
function playTypical(state: GameState, rng: () => number): { state: GameState; log: { position: number; attemptNumber: number; text: string }[] } {
  const log: { position: number; attemptNumber: number; text: string }[] = []
  while (state.status === 'active') {
    const r = rng()
    const misses = r < 0.7 ? 0 : r < 0.9 ? 1 : r < 0.95 ? 2 : 3
    const w = state.words[state.index]!
    for (let a = 1; a <= Math.min(misses + 1, 3); a++) {
      const text = a <= misses ? 'nope' : w.text
      log.push({ position: w.position, attemptNumber: a, text })
      state = submitAnswer(state, text).state
    }
  }
  return { state, log }
}

const MIXES: Record<string, Difficulty[]> = {
  easyHeavy: [...Array(8).fill('easy'), ...Array(4).fill('medium'), ...Array(2).fill('hard')],
  balanced: [...Array(5).fill('easy'), ...Array(5).fill('medium'), ...Array(4).fill('hard')],
  hardHeavy: [...Array(2).fill('easy'), ...Array(4).fill('medium'), ...Array(8).fill('hard')],
}

describe('visitorRuns', () => {
  it('is deterministic for the same id, inning and mix (10,000 runs)', () => {
    const mix = MIXES.balanced!
    const first = visitorRuns('game-abc', 2, mix)
    for (let i = 0; i < 10_000; i++) expect(visitorRuns('game-abc', 2, mix)).toBe(first)
  })

  it('replay and resume agree on the visitor line', () => {
    const { state, log } = playTypical(createGame(words(MIXES.balanced!), 'g-1'), seededRng(7))
    const again = rebuild(words(MIXES.balanced!), log, 'g-1')
    expect(again.visitors).toEqual(state.visitors)
    expect(visitorScore(again, 'g-1')).toEqual(state.visitors)
    // Mid-game resume shows the same partial line.
    const half = rebuild(words(MIXES.balanced!), log.slice(0, Math.floor(log.length / 2)), 'g-1')
    expect(half.visitors).toEqual(state.visitors.slice(0, half.visitors.length))
    expect(visitorScore(half, 'g-1')).toEqual(half.visitors)
  })

  it('never scores mid-inning: only inning-ending or game-ending plays reveal runs', () => {
    let state = createGame(words(MIXES.balanced!), 'g-2')
    const rng = seededRng(3)
    while (state.status === 'active') {
      const w = state.words[state.index]!
      const { state: next, event } = submitAnswer(state, rng() < 0.4 ? 'nope' : w.text)
      if (event.kind === 'at-bat-complete') {
        if (event.inningEnded || event.gameOver) expect(event.visitorRunsThisInning).not.toBeNull()
        else {
          expect(event.visitorRunsThisInning).toBeNull()
          expect(next.visitors).toEqual(state.visitors)
        }
      } else expect(next.visitors).toEqual(state.visitors)
      state = next
    }
    expect(state.visitors.length).toBe(state.inning)
  })

  it('a perfect game still gets one Visitors inning', () => {
    let state = createGame(words(MIXES.balanced!), 'g-3')
    while (state.status === 'active') state = submitAnswer(state, state.words[state.index]!.text).state
    expect(state.visitors).toHaveLength(1)
    expect(gameResult(state, 'g-3')).toBe('win')
  })

  it.each(Object.keys(MIXES))('tuning (%s): kid wins 60 to 72 percent, median margin at most 2', (name) => {
    const mix = MIXES[name]!
    const rng = seededRng(hashName(name))
    let wins = 0
    const margins: number[] = []
    for (let g = 0; g < 1000; g++) {
      const { state } = playTypical(createGame(words(mix), `sim-${name}-${g}`), rng)
      const v = state.visitors.reduce((a, b) => a + b, 0)
      if (state.tallies.runs >= v) wins++
      margins.push(Math.abs(state.tallies.runs - v))
    }
    margins.sort((a, b) => a - b)
    const rate = wins / 1000
    expect(rate).toBeGreaterThanOrEqual(0.6)
    expect(rate).toBeLessThanOrEqual(0.72)
    expect(margins[500]!).toBeLessThanOrEqual(2)
  })
})

function hashName(s: string): number {
  return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17)
}
