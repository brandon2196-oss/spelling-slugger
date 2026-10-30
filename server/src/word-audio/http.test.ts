// @vitest-environment node
import type { Server } from 'node:http'
import { clipHash } from '../../../src/audio/word-audio-profile'
import { createApp } from '../app'
import { createTestDb, migrate, type Db } from '../db'
import { createWordBaker, type Synth } from './baker'
import { createMemoryClipStorage } from './storage'

let db: Db
let server: Server
let base: string
let cookie = ''
let release: () => void = () => {}
let gate: Promise<void> = Promise.resolve()
const synth = vi.fn<Synth>(async (t) => { await gate; return Buffer.from(`mp3:${t}`) })
const storage = createMemoryClipStorage()
const baker = createWordBaker({ storage, synth, backoffMs: () => 0 })

async function call(method: string, p: string, body?: unknown) {
  const headers: Record<string, string> = { 'x-requested-with': 'slugger' }
  if (cookie) headers.cookie = cookie
  if (body !== undefined) headers['content-type'] = 'application/json'
  const r = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const set = r.headers.get('set-cookie')
  if (set) cookie = set.split(';')[0]!
  return r
}

beforeAll(async () => {
  db = await createTestDb()
  await migrate(db)
  const app = createApp(db, { secureCookies: false, wordAudio: baker })
  await new Promise<void>((ok) => { server = app.listen(0, () => ok()) })
  const addr = server.address()
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
  await call('POST', '/api/auth/register', { email: 'bake@example.com', password: 'longenough123' })
})
afterAll(async () => {
  await new Promise<void>((ok) => server.close(() => ok()))
  await db.close()
})

const kid = {
  name: 'Cooper', teamName: 'S', jerseyNumber: 7, hand: 'L',
  appearance: { primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff', hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short' },
}

describe('baked word audio over HTTP', () => {
  it('saves without waiting, bakes in the background, reports status, and serves clips', async () => {
    gate = new Promise((r) => { release = r })
    const pid = ((await (await call('POST', '/api/players', kid)).json()) as { id: string }).id
    const created = await call('POST', `/api/players/${pid}/lists`, { title: 'W', weekStart: '2026-10-26', words: [{ text: 'rhythm', sentence: 'Feel the rhythm.' }] })
    expect(created.status).toBe(201) // returned while synth is still blocked
    const lid = ((await created.json()) as { id: string }).id

    await vi.waitFor(async () =>
      expect(await (await call('GET', `/api/lists/${lid}/audio-status`)).json()).toEqual({ enabled: true, total: 3, ready: 0, pending: 3 }))
    const hash = await clipHash('word', 'rhythm')
    expect((await call('GET', `/audio/words/${hash}.mp3`)).status).toBe(404)

    release()
    await baker.idle()
    expect(await (await call('GET', `/api/lists/${lid}/audio-status`)).json()).toEqual({ enabled: true, total: 3, ready: 3, pending: 0 })
    const clip = await call('GET', `/audio/words/${hash}.mp3`)
    expect(clip.status).toBe(200)
    expect(clip.headers.get('content-type')).toBe('audio/mpeg')
    expect(clip.headers.get('cache-control')).toContain('immutable')
    expect(await clip.text()).toBe('mp3:rhythm')

    gate = Promise.resolve()
    await call('PATCH', `/api/lists/${lid}`, { words: [{ text: 'rhythm', sentence: null }, { text: 'yacht', sentence: null }] })
    const yacht = await clipHash('slow', 'yacht')
    await vi.waitFor(async () => expect(await storage.has(yacht)).toBe(true))
  })

  it('rejects bad clip names and hides other families\' lists', async () => {
    expect((await call('GET', '/audio/words/../../etc/passwd')).status).toBe(404)
    expect((await call('GET', '/audio/words/abc.mp3')).status).toBe(404)
    expect((await call('GET', '/api/lists/00000000-0000-0000-0000-000000000000/audio-status')).status).toBe(404)
  })
})
