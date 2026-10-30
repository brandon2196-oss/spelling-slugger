import { createLocalStore } from '../../data/local-store'
import type { NewPlayer, Store } from '../../data/types'
import { seededRng } from '../../engine/rng'
import { resumeOrNull, startMissedWordsGame, startPracticeGame, startWeeklyGame } from './startGame'

const cooper: NewPlayer = {
  name: 'Cooper', teamName: '', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}
const w = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => ({ text: `${prefix}${i}`, sentence: null }))

let store: Store
let playerId: string
beforeEach(async () => {
  localStorage.clear()
  store = createLocalStore()
  playerId = (await store.createPlayer(cooper)).id
})

describe('startWeeklyGame', () => {
  it('plays exactly the saved list, shuffled, with no extra review words', async () => {
    await store.createWordList(playerId, { title: 'Oct 12', weekStart: '2026-10-12', words: w('p', 15) })
    const words = [...w('c', 15), ...w('p', 5).map((x) => ({ ...x, source: 'review' as const, difficulty: 'easy' as const }))]
    const active = await store.createWordList(playerId, { title: 'Oct 19', weekStart: '2026-10-19', words })
    const g = await startWeeklyGame(store, playerId, active.id, seededRng(1))
    expect(g.words).toHaveLength(20)
    expect(g.words.filter((x) => x.source === 'review')).toHaveLength(5)
    expect(g.words.find((x) => x.text === 'p0')!.difficulty).toBe('easy')
    expect(g.warnings).toEqual([])
  })
  it('a 15-word list plays 15', async () => {
    const active = await store.createWordList(playerId, { title: 'Oct 19', weekStart: '2026-10-19', words: w('c', 15) })
    expect((await startWeeklyGame(store, playerId, active.id, seededRng(1))).words).toHaveLength(15)
  })
})

describe('startPracticeGame', () => {
  it('uses just that list, shuffled, as practice', async () => {
    const l = await store.createWordList(playerId, { title: 'L', weekStart: '2026-10-19', words: w('c', 6) })
    const g = await startPracticeGame(store, playerId, l.id, seededRng(3))
    expect(g.mode).toBe('practice')
    expect(g.listId).toBe(l.id)
    expect(g.words.map((x) => x.text).sort()).toEqual(w('c', 6).map((x) => x.text).sort())
  })
})

describe('startMissedWordsGame', () => {
  it('collects words with incorrect attempts from completed games', async () => {
    const l = await store.createWordList(playerId, { title: 'L', weekStart: '2026-10-19', words: w('c', 3) })
    const g = await startPracticeGame(store, playerId, l.id, seededRng(1))
    const [first, second, third] = g.words
    // first: strikeout; second: one strike then right; third: clean
    await store.recordAttempt(g.id, { position: first!.position, attemptNumber: 1, text: 'x', correct: false, outcome: null })
    await store.recordAttempt(g.id, { position: first!.position, attemptNumber: 2, text: 'x', correct: false, outcome: null })
    await store.recordAttempt(g.id, { position: first!.position, attemptNumber: 3, text: 'x', correct: false, outcome: 'strikeout' })
    await store.recordAttempt(g.id, { position: second!.position, attemptNumber: 1, text: 'x', correct: false, outcome: null })
    await store.recordAttempt(g.id, { position: second!.position, attemptNumber: 2, text: second!.text, correct: true, outcome: 'single' })
    await store.recordAttempt(g.id, { position: third!.position, attemptNumber: 1, text: third!.text, correct: true, outcome: 'double' })
    await store.completeGame(g.id, { runs: 0 } as never)

    const m = await startMissedWordsGame(store, playerId, seededRng(1))
    expect(m.mode).toBe('missed')
    expect(m.listId).toBeNull()
    expect(m.words.map((x) => x.text).sort()).toEqual([first!.text, second!.text].sort())
  })
  it('throws NO_MISSED_WORDS when there is nothing to practice', async () => {
    await expect(startMissedWordsGame(store, playerId, seededRng(1))).rejects.toThrow('NO_MISSED_WORDS')
  })
})

describe('resumeOrNull', () => {
  it('returns the unfinished game, or null', async () => {
    expect(await resumeOrNull(store, playerId)).toBeNull()
    const l = await store.createWordList(playerId, { title: 'L', weekStart: '2026-10-19', words: w('c', 3) })
    const g = await startPracticeGame(store, playerId, l.id, seededRng(1))
    expect((await resumeOrNull(store, playerId))?.id).toBe(g.id)
  })
})
