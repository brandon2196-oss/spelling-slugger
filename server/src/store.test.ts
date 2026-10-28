// @vitest-environment node
import type { GameWord } from '../../src/engine/types'
import type { NewPlayer, Store } from '../../src/data/types'
import { createTestDb, migrate, type Db } from './db'
import { createFamily, createServerStore } from './store'

const cooper: NewPlayer = {
  name: 'Cooper', teamName: 'Sluggers', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}
const gw = (position: number, text: string, source: GameWord['source'] = 'current'): GameWord => ({
  position, text, sentence: null, source, sourceWordId: null,
})

let db: Db
let a: Store
let b: Store
beforeAll(async () => {
  db = await createTestDb()
  await migrate(db)
  a = createServerStore(db, await createFamily(db))
  b = createServerStore(db, await createFamily(db))
})
afterAll(() => db.close())

describe('players', () => {
  it('creates, lists, updates and deletes within the family', async () => {
    const p = await a.createPlayer(cooper)
    expect(p.id).toMatch(/[0-9a-f-]{36}/)
    expect(p.createdAt).toBeTruthy()
    expect((await a.listPlayers()).map((x) => x.name)).toEqual(['Cooper'])
    const u = await a.updatePlayer(p.id, { name: 'Coop', jerseyNumber: 9 })
    expect(u).toMatchObject({ name: 'Coop', jerseyNumber: 9, hand: 'L', teamName: 'Sluggers' })
    await a.deletePlayer(p.id)
    expect(await a.listPlayers()).toEqual([])
  })
})

describe('word lists', () => {
  it('stores words in order, replaces them renumbered, keeps one active list, sorts newest week first', async () => {
    const p = await a.createPlayer(cooper)
    const l1 = await a.createWordList(p.id, {
      title: 'Week 9', weekStart: '2026-10-26', words: [{ text: 'cat', sentence: null }, { text: 'dog', sentence: 'A dog.' }],
    })
    expect(l1.words.map((w) => [w.position, w.text, w.sentence])).toEqual([[1, 'cat', null], [2, 'dog', 'A dog.']])
    expect(l1.weekStart).toBe('2026-10-26')
    expect(l1.isActive).toBe(false)

    const l2 = await a.createWordList(p.id, { title: 'Week 10', weekStart: '2026-11-02', words: [{ text: 'bird', sentence: null }] })
    expect((await a.listWordLists(p.id)).map((l) => l.title)).toEqual(['Week 10', 'Week 9'])

    const replaced = await a.updateWordList(l1.id, { title: 'Week nine', words: [{ text: 'fish', sentence: null }] })
    expect(replaced.title).toBe('Week nine')
    expect(replaced.words.map((w) => [w.position, w.text])).toEqual([[1, 'fish']])

    await a.setActiveList(p.id, l1.id)
    await a.setActiveList(p.id, l2.id)
    const lists = await a.listWordLists(p.id)
    expect(lists.filter((l) => l.isActive).map((l) => l.id)).toEqual([l2.id])

    await a.deleteWordList(l1.id)
    expect(await a.getWordList(l1.id)).toBeNull()
    expect((await a.getWordList(l2.id))?.words).toHaveLength(1)
  })
})

describe('games', () => {
  it('records attempts idempotently and computes the summary from the log, ignoring the client', async () => {
    const p = await a.createPlayer(cooper)
    const list = await a.createWordList(p.id, { title: 'W', weekStart: '2026-10-26', words: [{ text: 'cat', sentence: null }] })
    const g = await a.createGame({ playerId: p.id, listId: list.id, mode: 'weekly', words: [gw(0, 'cat'), gw(1, 'dog', 'review')], warnings: ['w'] })
    expect(g.status).toBe('in_progress')
    expect(g.words.map((w) => w.text)).toEqual(['cat', 'dog'])
    expect(g.warnings).toEqual(['w'])
    expect((await a.findInProgressGame(p.id))?.id).toBe(g.id)

    const first = { position: 0, attemptNumber: 1 as const, text: 'cat', correct: true, outcome: 'double' as const }
    await a.recordAttempt(g.id, first)
    await a.recordAttempt(g.id, first)
    await a.recordAttempt(g.id, { position: 1, attemptNumber: 1, text: 'dgo', correct: false, outcome: null })
    await a.recordAttempt(g.id, { position: 1, attemptNumber: 2, text: 'dgo', correct: false, outcome: null })
    await a.recordAttempt(g.id, { position: 1, attemptNumber: 3, text: 'dgo', correct: false, outcome: 'strikeout' })

    const mid = (await a.getGame(g.id))!
    expect(mid.attempts).toHaveLength(4)
    expect(mid.attempts[0]).toMatchObject({ position: 0, attemptNumber: 1, outcome: 'double' })
    expect(mid.attempts[3]).toMatchObject({ position: 1, attemptNumber: 3, outcome: 'strikeout' })
    expect(mid.attempts[1]?.outcome).toBeNull()

    const bogus = { ...mid.summary, firstTryAccuracy: 100 } as never
    await a.completeGame(g.id, bogus)
    const done = (await a.getGame(g.id))!
    expect(done.status).toBe('complete')
    expect(done.completedAt).toBeTruthy()
    expect(done.summary).toMatchObject({ doubles: 1, strikeouts: 1, firstTry: 1, missed: 1, firstTryAccuracy: 50, missedWords: ['dog'] })
    expect(done.summary?.review).toEqual({ total: 1, firstTry: 0, missed: 1 })
    expect(await a.findInProgressGame(p.id)).toBeNull()
    expect(await a.listGames(p.id, { mode: 'weekly' })).toHaveLength(1)
    expect(await a.listGames(p.id, { status: 'in_progress' })).toHaveLength(0)
    expect(await a.listGames(p.id, { listId: list.id })).toHaveLength(1)
  })
})

describe('parent PIN', () => {
  it('is absent, then set, then verified', async () => {
    expect(await a.hasParentPin()).toBe(false)
    await a.setParentPin('1234')
    expect(await a.hasParentPin()).toBe(true)
    expect(await a.verifyParentPin('1234')).toBe(true)
    expect(await a.verifyParentPin('0000')).toBe(false)
    expect(await b.hasParentPin()).toBe(false)
  })
})

describe('family isolation (spec test 22)', () => {
  it('family B can neither see nor touch family A rows', async () => {
    const p = await a.createPlayer(cooper)
    const list = await a.createWordList(p.id, { title: 'W', weekStart: '2026-10-26', words: [{ text: 'cat', sentence: null }] })
    const game = await a.createGame({ playerId: p.id, listId: list.id, mode: 'weekly', words: [gw(0, 'cat')], warnings: [] })

    expect((await b.listPlayers()).find((x) => x.id === p.id)).toBeUndefined()
    expect(await b.listWordLists(p.id)).toEqual([])
    expect(await b.getWordList(list.id)).toBeNull()
    expect(await b.getGame(game.id)).toBeNull()
    expect(await b.findInProgressGame(p.id)).toBeNull()
    expect(await b.listGames(p.id)).toEqual([])

    await expect(b.updatePlayer(p.id, { name: 'hacked' })).rejects.toThrow('NOT_FOUND')
    await expect(b.deletePlayer(p.id)).rejects.toThrow('NOT_FOUND')
    await expect(b.createWordList(p.id, { title: 'x', weekStart: '2026-10-26', words: [] })).rejects.toThrow('NOT_FOUND')
    await expect(b.updateWordList(list.id, { title: 'hacked' })).rejects.toThrow('NOT_FOUND')
    await expect(b.setActiveList(p.id, list.id)).rejects.toThrow('NOT_FOUND')
    await expect(b.deleteWordList(list.id)).rejects.toThrow('NOT_FOUND')
    await expect(b.createGame({ playerId: p.id, listId: null, mode: 'practice', words: [gw(0, 'x')], warnings: [] })).rejects.toThrow('NOT_FOUND')
    await expect(b.recordAttempt(game.id, { position: 0, attemptNumber: 1, text: 'cat', correct: true, outcome: 'double' })).rejects.toThrow('NOT_FOUND')
    await expect(b.completeGame(game.id, {} as never)).rejects.toThrow('NOT_FOUND')

    expect((await a.getWordList(list.id))?.title).toBe('W')
    expect((await a.getGame(game.id))?.attempts).toEqual([])
    expect((await a.listPlayers()).some((x) => x.name === 'hacked')).toBe(false)
  })
})

describe('deleteAccount', () => {
  it('removes the family and everything under it', async () => {
    const fid = await createFamily(db)
    const s = createServerStore(db, fid)
    const p = await s.createPlayer(cooper)
    await s.createWordList(p.id, { title: 'W', weekStart: '2026-10-26', words: [{ text: 'cat', sentence: null }] })
    await s.deleteAccount()
    expect((await db.query('select 1 from families where id = $1', [fid])).rows).toHaveLength(0)
    expect((await db.query('select 1 from players where id = $1', [p.id])).rows).toHaveLength(0)
  })
})
