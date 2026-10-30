import type { GameRecord, StoredAttempt } from '../../data/types'
import type { GameWord } from '../../engine/types'
import { frequentlyMissed, mastered, reviewRetention, totals, weeklyTrend, wordStats } from './stats'

const gw = (texts: string[], review: string[] = []): GameWord[] =>
  texts.map((text, position) => ({ position, text, sentence: null, source: review.includes(text) ? 'review' : 'current', sourceWordId: null, difficulty: 'medium' as const }))

/** answers: per word, number of wrong tries before right (3 = strikeout). */
function game(id: string, listId: string | null, words: string[], wrong: number[], opts: { review?: string[]; mode?: GameRecord['mode']; runs?: number; startedAt?: string } = {}): GameRecord {
  const attempts: StoredAttempt[] = []
  words.forEach((w, position) => {
    const n = wrong[position] ?? 0
    for (let i = 1; i <= Math.min(n, 3); i++) attempts.push({ position, attemptNumber: i as 1 | 2 | 3, text: 'x', correct: false, outcome: i === 3 ? 'strikeout' : null })
    if (n < 3) attempts.push({ position, attemptNumber: (n + 1) as 1 | 2 | 3, text: w, correct: true, outcome: n === 0 ? 'double' : n === 1 ? 'single' : 'walk' })
  })
  const firstTry = wrong.filter((n) => n === 0).length
  return {
    id, playerId: 'p', listId, mode: opts.mode ?? 'weekly', status: 'complete', words: gw(words, opts.review), attempts, warnings: [],
    summary: { runs: opts.runs ?? 0, hits: 0, homeRuns: 0, singles: 0, doubles: 0, walks: 0, strikeouts: 0, totalStrikes: 0, firstTry, secondTry: 0, thirdTry: 0, missed: 0,
      firstTryAccuracy: Math.round((firstTry / words.length) * 100), current: { total: 0, firstTry: 0, missed: 0 }, review: { total: 0, firstTry: 0, missed: 0 }, missedWords: [] },
    startedAt: opts.startedAt ?? '2026-10-20T00:00:00Z', completedAt: '2026-10-20T00:10:00Z',
  }
}

const games: GameRecord[] = [
  game('g1', 'L1', ['cat', 'dog', 'fish'], [0, 3, 1], { runs: 2, startedAt: '2026-10-13T00:00:00Z' }),
  game('g2', 'L1', ['cat', 'dog', 'fish'], [0, 3, 0], { runs: 3, startedAt: '2026-10-14T00:00:00Z' }),
  game('g3', 'L2', ['cat', 'bird', 'dog'], [0, 2, 0], { review: ['dog'], runs: 1, startedAt: '2026-10-20T00:00:00Z' }),
  game('g4', 'L2', ['cat'], [1], { mode: 'practice', startedAt: '2026-10-21T00:00:00Z' }),
]

describe('wordStats', () => {
  it('aggregates every completed game', () => {
    const s = wordStats(games)
    const dog = s.find((w) => w.text === 'dog')!
    expect(dog).toMatchObject({ seen: 3, missed: 2, firstTry: 1, strikes: 6 })
  })
})

describe('frequentlyMissed', () => {
  it('ranks the twice-missed word first', () => {
    expect(frequentlyMissed(wordStats(games)).map((w) => w.text)[0]).toBe('dog')
  })
  it('excludes words never struck out on', () => {
    expect(frequentlyMissed(wordStats(games)).map((w) => w.text)).not.toContain('cat')
  })
})

describe('mastered', () => {
  it('needs at least two first-try appearances with no misses', () => {
    const names = mastered(wordStats(games)).map((w) => w.text)
    expect(names).toContain('cat') // seen 4 times, never struck out, first try 3 of 4
    expect(names).not.toContain('bird') // seen once
  })
})

describe('weeklyTrend', () => {
  it('returns one point per list with the best weekly runs and first-try accuracy', () => {
    const t = weeklyTrend(games, [{ id: 'L1', weekStart: '2026-10-12' }, { id: 'L2', weekStart: '2026-10-19' }])
    expect(t).toEqual([
      { listId: 'L1', weekStart: '2026-10-12', bestRuns: 3, firstTryAccuracy: 50, games: 2 },
      { listId: 'L2', weekStart: '2026-10-19', bestRuns: 1, firstTryAccuracy: 67, games: 1 },
    ])
  })
})

describe('reviewRetention', () => {
  it('is the first-try rate over review words, null when there are none', () => {
    expect(reviewRetention(games)).toBe(100)
    expect(reviewRetention(games.slice(0, 2))).toBeNull()
  })
})

describe('totals', () => {
  it('counts games, practice sessions, high score and first-try rate', () => {
    expect(totals(games)).toEqual({ games: 3, practice: 1, highScore: 3, firstTryRate: 56 })
  })
})

describe('first-try by attempt number', () => {
  it('counts a first-attempt single (easy word) as first try', () => {
    const g = game('g9', 'L9', ['sun'], [0])
    g.attempts = [{ position: 0, attemptNumber: 1, text: 'sun', correct: true, outcome: 'single' }]
    expect(wordStats([g]).find((w) => w.text === 'sun')!.firstTry).toBe(1)
  })
})
