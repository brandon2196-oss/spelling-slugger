import { createLocalStore } from './local-store'
import type { NewPlayer, Store } from './types'
import type { GameWord } from '../engine/types'
import { summarize } from '../engine/results'
import { createGame } from '../engine/game'

const cooper: NewPlayer = {
  name: 'Cooper',
  teamName: 'Red Sox',
  jerseyNumber: 7,
  hand: 'L',
  appearance: {
    primaryColor: '#c00', secondaryColor: '#fff', jerseyColor: '#c00', pantsColor: '#eee',
    hatColor: '#003', skinTone: '#f1c27d', hairColor: '#4a2c0a', hairstyle: 'short',
  },
}
const sibling: NewPlayer = { ...cooper, name: 'Nora', hand: 'R' }

const gw = (texts: string[]): GameWord[] =>
  texts.map((text, position) => ({ position, text, sentence: null, source: 'current', sourceWordId: null }))

let store: Store
beforeEach(() => {
  localStorage.clear()
  store = createLocalStore()
})

describe('players', () => {
  it('creates and lists players', async () => {
    const p = await store.createPlayer(cooper)
    expect(p.id).toBeTruthy()
    expect((await store.listPlayers()).map((x) => x.name)).toEqual(['Cooper'])
  })
  it('updates a player', async () => {
    const p = await store.createPlayer(cooper)
    const u = await store.updatePlayer(p.id, { hand: 'R', jerseyNumber: 42 })
    expect(u).toMatchObject({ hand: 'R', jerseyNumber: 42, name: 'Cooper' })
  })
  it('deletes a player and everything under them', async () => {
    const p = await store.createPlayer(cooper)
    await store.createWordList(p.id, { title: 'W1', weekStart: '2026-10-19', words: [{ text: 'a', sentence: null }] })
    await store.deletePlayer(p.id)
    expect(await store.listPlayers()).toEqual([])
    expect(await store.listWordLists(p.id)).toEqual([])
  })
})

describe('word lists', () => {
  it('(23) siblings have independent lists and games', async () => {
    const a = await store.createPlayer(cooper)
    const b = await store.createPlayer(sibling)
    await store.createWordList(a.id, { title: 'A1', weekStart: '2026-10-19', words: [{ text: 'cat', sentence: null }] })
    await store.createWordList(b.id, { title: 'B1', weekStart: '2026-10-19', words: [{ text: 'dog', sentence: null }] })
    await store.createGame({ playerId: a.id, listId: null, mode: 'practice', words: gw(['cat']), warnings: [] })
    expect((await store.listWordLists(a.id)).map((l) => l.title)).toEqual(['A1'])
    expect((await store.listWordLists(b.id)).map((l) => l.title)).toEqual(['B1'])
    expect(await store.listGames(b.id)).toEqual([])
    expect(await store.listGames(a.id)).toHaveLength(1)
  })
  it('numbers words 1..n and replaces them wholesale on update', async () => {
    const p = await store.createPlayer(cooper)
    const l = await store.createWordList(p.id, { title: 'W', weekStart: '2026-10-19', words: [{ text: 'a', sentence: null }] })
    const u = await store.updateWordList(l.id, { words: ['x', 'y', 'z'].map((text) => ({ text, sentence: null })) })
    expect(u.words.map((w) => [w.position, w.text])).toEqual([[1, 'x'], [2, 'y'], [3, 'z']])
  })
  it('lists newest week first and keeps exactly one active list per player', async () => {
    const p = await store.createPlayer(cooper)
    const old = await store.createWordList(p.id, { title: 'Old', weekStart: '2026-10-12', words: [] })
    const nu = await store.createWordList(p.id, { title: 'New', weekStart: '2026-10-19', words: [] })
    await store.setActiveList(p.id, old.id)
    await store.setActiveList(p.id, nu.id)
    const lists = await store.listWordLists(p.id)
    expect(lists.map((l) => l.title)).toEqual(['New', 'Old'])
    expect(lists.map((l) => l.isActive)).toEqual([true, false])
  })
  it('getWordList returns null for an unknown id', async () => {
    expect(await store.getWordList('nope')).toBeNull()
  })
})

describe('games', () => {
  it('records attempts idempotently on (position, attemptNumber)', async () => {
    const p = await store.createPlayer(cooper)
    const g = await store.createGame({ playerId: p.id, listId: null, mode: 'practice', words: gw(['cat']), warnings: [] })
    const att = { position: 0, attemptNumber: 1 as const, text: 'cat', correct: true, outcome: 'double' as const }
    await store.recordAttempt(g.id, att)
    await store.recordAttempt(g.id, att)
    expect((await store.getGame(g.id))!.attempts).toHaveLength(1)
  })
  it('finds the in-progress game until it is completed', async () => {
    const p = await store.createPlayer(cooper)
    const g = await store.createGame({ playerId: p.id, listId: null, mode: 'practice', words: gw(['cat']), warnings: [] })
    expect((await store.findInProgressGame(p.id))?.id).toBe(g.id)
    await store.completeGame(g.id, summarize(createGame(gw(['cat']))))
    expect(await store.findInProgressGame(p.id)).toBeNull()
    const done = await store.getGame(g.id)
    expect(done?.status).toBe('complete')
    expect(done?.completedAt).toBeTruthy()
    expect(done?.summary?.runs).toBe(0)
  })
  it('(19) deleting a list keeps finished games and their words', async () => {
    const p = await store.createPlayer(cooper)
    const l = await store.createWordList(p.id, { title: 'W', weekStart: '2026-10-19', words: [{ text: 'cat', sentence: null }] })
    const g = await store.createGame({ playerId: p.id, listId: l.id, mode: 'weekly', words: gw(['cat']), warnings: [] })
    await store.deleteWordList(l.id)
    const after = await store.getGame(g.id)
    expect(after?.listId).toBeNull()
    expect(after?.words.map((w) => w.text)).toEqual(['cat'])
  })
  it('filters games by mode and status, newest first', async () => {
    const p = await store.createPlayer(cooper)
    const g1 = await store.createGame({ playerId: p.id, listId: null, mode: 'practice', words: gw(['a']), warnings: [] })
    await store.completeGame(g1.id, summarize(createGame(gw(['a']))))
    await store.createGame({ playerId: p.id, listId: null, mode: 'weekly', words: gw(['a']), warnings: [] })
    expect((await store.listGames(p.id, { mode: 'practice' })).map((g) => g.id)).toEqual([g1.id])
    expect(await store.listGames(p.id, { status: 'complete' })).toHaveLength(1)
    expect((await store.listGames(p.id))[0]?.mode).toBe('weekly')
  })
  it('persists across store instances (survives a refresh)', async () => {
    const p = await store.createPlayer(cooper)
    const fresh = createLocalStore()
    expect((await fresh.listPlayers()).map((x) => x.id)).toEqual([p.id])
  })
})

describe('parent pin and account', () => {
  it('sets and verifies a pin', async () => {
    expect(await store.hasParentPin()).toBe(false)
    await store.setParentPin('1234')
    expect(await store.hasParentPin()).toBe(true)
    expect(await store.verifyParentPin('1234')).toBe(true)
    expect(await store.verifyParentPin('0000')).toBe(false)
  })
  it('deleteAccount wipes everything', async () => {
    await store.createPlayer(cooper)
    await store.setParentPin('1234')
    await store.deleteAccount()
    expect(await store.listPlayers()).toEqual([])
    expect(await store.hasParentPin()).toBe(false)
  })
})
