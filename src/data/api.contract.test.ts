// @vitest-environment node
/** The browser side (ApiStore + ApiAuth) against the real server on PGlite: the client/server contract. */
import type { Server } from 'node:http'
import { createApp } from '../../server/src/app'
import { createTestDb, migrate, type Db } from '../../server/src/db'
import { createApiAuth } from './api-auth'
import { createApiStore } from './api-store'
import type { AuthUser } from './auth'
import type { NewPlayer } from './types'

const cooper: NewPlayer = {
  name: 'Cooper', teamName: 'Sluggers', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}

/** Node's fetch has no cookie jar; this one remembers the session cookie like a browser would. */
function jarFetch(): typeof fetch {
  let cookie = ''
  return async (input, init) => {
    const headers = new Headers(init?.headers)
    if (cookie) headers.set('cookie', cookie)
    const r = await fetch(input, { ...init, headers })
    const set = r.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]!
    return r
  }
}

let db: Db
let server: Server
let baseUrl: string
beforeAll(async () => {
  db = await createTestDb()
  await migrate(db)
  await new Promise<void>((ok) => { server = createApp(db, { secureCookies: false }).listen(0, () => ok()) })
  const addr = server.address()
  baseUrl = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})
afterAll(async () => {
  await new Promise<void>((ok) => server.close(() => ok()))
  await db.close()
})

describe('ApiAuth + ApiStore against the server', () => {
  it('signs up, plays a game, sets a PIN, signs out, signs back in with a new password', async () => {
    const f = jarFetch()
    const auth = createApiAuth({ baseUrl, fetch: f })
    const store = createApiStore({ baseUrl, fetch: f })
    const seen: (AuthUser | null)[] = []
    auth.onChange((u) => seen.push(u))

    expect(await auth.getUser()).toBeNull()
    await expect(store.listPlayers()).rejects.toThrow('UNAUTHENTICATED')

    expect(await auth.signUp('mom@example.com', 'long-enough-pw')).toBe('signed_in')
    expect((await auth.getUser())?.email).toBe('mom@example.com')
    expect(seen.at(-1)?.email).toBe('mom@example.com')
    await expect(auth.signUp('MOM@example.com', 'long-enough-pw')).rejects.toThrow('EMAIL_TAKEN')

    const p = await store.createPlayer(cooper)
    expect((await store.listPlayers()).map((x) => x.id)).toEqual([p.id])
    const list = await store.createWordList(p.id, { title: 'Week 9', weekStart: '2026-10-26', words: [{ text: 'cat', sentence: null }] })
    await store.setActiveList(p.id, list.id)
    expect((await store.listWordLists(p.id))[0]).toMatchObject({ id: list.id, isActive: true, weekStart: '2026-10-26' })
    expect(await store.getWordList('00000000-0000-0000-0000-000000000000')).toBeNull()

    const g = await store.createGame({
      playerId: p.id, listId: list.id, mode: 'weekly',
      words: [{ position: 0, text: 'cat', sentence: null, source: 'current', sourceWordId: list.words[0]!.id }], warnings: [],
    })
    expect((await store.findInProgressGame(p.id))?.id).toBe(g.id)
    await store.recordAttempt(g.id, { position: 0, attemptNumber: 1, text: 'cat', correct: true, outcome: 'double' })
    await store.completeGame(g.id, { firstTryAccuracy: 0 } as never)
    const done = (await store.getGame(g.id))!
    expect(done.status).toBe('complete')
    expect(done.summary?.firstTryAccuracy).toBe(100)
    expect(done.attempts[0]).toMatchObject({ outcome: 'double' })
    expect(await store.listGames(p.id, { status: 'complete' })).toHaveLength(1)
    expect(await store.findInProgressGame(p.id)).toBeNull()

    expect(await store.hasParentPin()).toBe(false)
    await store.setParentPin('1234')
    expect(await store.verifyParentPin('1234')).toBe(true)
    expect(await store.verifyParentPin('0000')).toBe(false)

    await auth.updatePassword('another-long-pw')
    await auth.signOut()
    expect(await auth.getUser()).toBeNull()
    expect(seen.at(-1)).toBeNull()
    await expect(auth.signIn('mom@example.com', 'long-enough-pw')).rejects.toThrow('INVALID_CREDENTIALS')
    await auth.signIn('mom@example.com', 'another-long-pw')
    expect((await store.listPlayers()).length).toBe(1)
    await store.deleteAccount()
    expect(await auth.getUser()).toBeNull()
  })

  it('resetPassword explains that the site owner does resets', async () => {
    const auth = createApiAuth({ baseUrl, fetch: jarFetch() })
    await expect(auth.resetPassword('x@example.com')).rejects.toThrow('RESET_BY_OWNER')
  })
})
