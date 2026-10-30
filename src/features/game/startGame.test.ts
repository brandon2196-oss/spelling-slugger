import { createLocalStore } from '../../data/local-store'
import type { NewPlayer, Store } from '../../data/types'
import { seededRng } from '../../engine/rng'
import { resumeOrNull, startMissedWordsGame, startPracticeGame, startThisGameMissesGame, startWeeklyGame } from './startGame'

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

describe('startThisGameMissesGame', () => {
  it('plays only the words struck out in that game, deduped, as a missed-words game', async () => {
    // an older game miss that must NOT come along
    const old = await store.createWordList(playerId, { title: 'Old', weekStart: '2026-10-12', words: [{ text: 'zebra', sentence: null }] })
    const og = await startPracticeGame(store, playerId, old.id, seededRng(1))
    for (const n of [1, 2, 3] as const) await store.recordAttempt(og.id, { position: 0, attemptNumber: n, text: 'x', correct: false, outcome: n === 3 ? 'strikeout' : null })

    const l = await store.createWordList(playerId, { title: 'L', weekStart: '2026-10-19', words: ['cat', 'dog', 'emu'].map((text) => ({ text, sentence: null })) })
    const g = await startPracticeGame(store, playerId, l.id, seededRng(1))
    const [a, b] = g.words
    for (const n of [1, 2, 3] as const) await store.recordAttempt(g.id, { position: a!.position, attemptNumber: n, text: 'q', correct: false, outcome: n === 3 ? 'strikeout' : null })
    await store.recordAttempt(g.id, { position: b!.position, attemptNumber: 1, text: 'q', correct: false, outcome: null })
    await store.recordAttempt(g.id, { position: b!.position, attemptNumber: 2, text: b!.text, correct: true, outcome: 'single' })

    const fresh = (await store.getGame(g.id))!
    const p = await startThisGameMissesGame(store, fresh, seededRng(2))
    expect(p.mode).toBe('missed')
    expect(p.listId).toBeNull()
    expect(p.words.map((x) => x.text)).toEqual([a!.text])
  })
  it('throws when the game had no strikeouts', async () => {
    const l = await store.createWordList(playerId, { title: 'L', weekStart: '2026-10-19', words: [{ text: 'cat', sentence: null }] })
    const g = await startPracticeGame(store, playerId, l.id, seededRng(1))
    await expect(startThisGameMissesGame(store, g)).rejects.toThrow('NO_MISSED_WORDS')
  })
})
