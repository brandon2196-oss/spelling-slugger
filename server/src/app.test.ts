// @vitest-environment node
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Server } from 'node:http'
import { createApp } from './app'
import { createTestDb, migrate, type Db } from './db'

type Json = Record<string, unknown> | unknown[] | null
interface Res { status: number; body: Json; headers: Headers }

/** A browser-ish client: keeps the session cookie, sends the CSRF header unless told not to. */
function client(base: string) {
  let cookie = ''
  async function call(method: string, p: string, body?: unknown, opts: { csrf?: boolean } = {}): Promise<Res> {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (cookie) headers.cookie = cookie
    if (opts.csrf !== false && method !== 'GET') headers['x-requested-with'] = 'slugger'
    if (body !== undefined) headers['content-type'] = 'application/json'
    const r = await fetch(base + p, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    const set = r.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0]!
    const text = await r.text()
    let parsed: Json = null
    try { parsed = text ? (JSON.parse(text) as Json) : null } catch { parsed = { raw: text } }
    return { status: r.status, body: parsed, headers: r.headers }
  }
  return {
    call,
    get: (p: string) => call('GET', p),
    post: (p: string, b?: unknown) => call('POST', p, b ?? {}),
    patch: (p: string, b: unknown) => call('PATCH', p, b),
    put: (p: string, b: unknown) => call('PUT', p, b),
    del: (p: string) => call('DELETE', p),
    rawCookie: () => cookie,
  }
}

const cooper = {
  name: 'Cooper', teamName: 'Sluggers', jerseyNumber: 7, hand: 'L',
  appearance: {
    primaryColor: '#000', secondaryColor: '#fff', jerseyColor: '#000', pantsColor: '#fff',
    hatColor: '#000', skinTone: '#fff', hairColor: '#000', hairstyle: 'short',
  },
}
const gw = (position: number, text: string) => ({ position, text, sentence: null, source: 'current', sourceWordId: null })

let db: Db
let server: Server
let base: string
let staticDir: string
let n = 0
const email = () => `parent${++n}@example.com`

beforeAll(async () => {
  db = await createTestDb()
  await migrate(db)
  staticDir = await mkdtemp(path.join(tmpdir(), 'slugger-static-'))
  await writeFile(path.join(staticDir, 'index.html'), '<!doctype html><title>Slugger</title>')
  await writeFile(path.join(staticDir, 'sw.js'), '// sw')
  const app = createApp(db, { secureCookies: false, staticDir })
  await new Promise<void>((ok) => { server = app.listen(0, () => ok()) })
  const addr = server.address()
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})
afterAll(async () => {
  await new Promise<void>((ok) => server.close(() => ok()))
  await db.close()
})

async function signedUp() {
  const c = client(base)
  const e = email()
  const r = await c.post('/api/auth/register', { email: e, password: 'long-enough-pw' })
  expect(r.status).toBe(201)
  return { c, email: e }
}

describe('auth', () => {
  it('registers, sets an httpOnly lax cookie, reports the user, rejects duplicates and short passwords', async () => {
    const c = client(base)
    const e = email()
    const r = await c.post('/api/auth/register', { email: e, password: 'long-enough-pw' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ user: { email: e } })
    const set = r.headers.get('set-cookie')!
    expect(set).toMatch(/^slugger_session=/)
    expect(set).toMatch(/HttpOnly/)
    expect(set).toMatch(/SameSite=Lax/)
    expect(set).not.toMatch(/Secure/)

    expect((await c.get('/api/auth/me')).body).toMatchObject({ user: { email: e } })

    const dup = await client(base).post('/api/auth/register', { email: e.toUpperCase(), password: 'long-enough-pw' })
    expect(dup.status).toBe(409)
    expect(dup.body).toEqual({ error: 'EMAIL_TAKEN' })

    const weak = await client(base).post('/api/auth/register', { email: email(), password: 'short' })
    expect(weak.status).toBe(400)
  })

  it('logs in and out', async () => {
    const { email: e } = await signedUp()
    const c = client(base)
    expect((await c.post('/api/auth/login', { email: e, password: 'wrong-password' })).status).toBe(401)
    expect((await c.post('/api/auth/login', { email: e, password: 'wrong-password' })).body).toEqual({ error: 'INVALID_CREDENTIALS' })
    expect((await c.get('/api/auth/me')).body).toEqual({ user: null })
    expect((await c.post('/api/auth/login', { email: e, password: 'long-enough-pw' })).status).toBe(200)
    expect((await c.get('/api/auth/me')).body).toMatchObject({ user: { email: e } })
    expect((await c.post('/api/auth/logout')).status).toBe(204)
    expect((await c.get('/api/auth/me')).body).toEqual({ user: null })
  })

  it('changes the password for the signed-in parent', async () => {
    const { c, email: e } = await signedUp()
    expect((await c.post('/api/auth/password', { newPassword: 'another-long-pw' })).status).toBe(204)
    const c2 = client(base)
    expect((await c2.post('/api/auth/login', { email: e, password: 'long-enough-pw' })).status).toBe(401)
    expect((await c2.post('/api/auth/login', { email: e, password: 'another-long-pw' })).status).toBe(200)
  })

  it('requires a session for data and the custom header for mutations', async () => {
    const anon = client(base)
    expect((await anon.get('/api/players')).status).toBe(401)
    const { c } = await signedUp()
    const noHeader = await c.call('POST', '/api/players', cooper, { csrf: false })
    expect(noHeader.status).toBe(403)
    expect((await c.get('/api/players')).body).toEqual([])
  })
})

describe('rate limits', () => {
  it('locks login for an email after 10 failed attempts, even with the right password', async () => {
    const { email: e } = await signedUp()
    const c = client(base)
    for (let i = 0; i < 10; i++) expect((await c.post('/api/auth/login', { email: e, password: 'wrong-password' })).status).toBe(401)
    const locked = await c.post('/api/auth/login', { email: e, password: 'long-enough-pw' })
    expect(locked.status).toBe(429)
    expect(locked.body).toEqual({ error: 'TOO_MANY_ATTEMPTS' })
    // another account is unaffected
    const { c: other } = await signedUp()
    expect((await other.get('/api/auth/me')).status).toBe(200)
  })

  it('locks PIN checks for a family after 10 wrong guesses', async () => {
    const { c } = await signedUp()
    await c.put('/api/pin', { pin: '1234' })
    for (let i = 0; i < 10; i++) expect((await c.post('/api/pin/verify', { pin: '0000' })).body).toEqual({ ok: false })
    const locked = await c.post('/api/pin/verify', { pin: '1234' })
    expect(locked.status).toBe(429)
  })
})

describe('players, lists, games over HTTP', () => {
  it('runs the whole weekly flow', async () => {
    const { c } = await signedUp()
    const p = await c.post('/api/players', cooper)
    expect(p.status).toBe(201)
    const pid = (p.body as { id: string }).id
    expect(((await c.get('/api/players')).body as unknown[]).length).toBe(1)
    expect((await c.patch(`/api/players/${pid}`, { name: 'Coop' })).body).toMatchObject({ name: 'Coop', jerseyNumber: 7 })

    const l = await c.post(`/api/players/${pid}/lists`, { title: 'Week 9', weekStart: '2026-10-26', words: [{ text: 'cat', sentence: null }] })
    expect(l.status).toBe(201)
    const lid = (l.body as { id: string }).id
    expect((await c.put(`/api/players/${pid}/active-list`, { listId: lid })).status).toBe(204)
    expect((await c.get(`/api/players/${pid}/lists`)).body).toMatchObject([{ id: lid, isActive: true }])
    expect((await c.patch(`/api/lists/${lid}`, { words: [{ text: 'dog', sentence: null }, { text: 'cat', sentence: null }] })).body)
      .toMatchObject({ words: [{ position: 1, text: 'dog' }, { position: 2, text: 'cat' }] })

    const g = await c.post('/api/games', { playerId: pid, listId: lid, mode: 'weekly', words: [gw(0, 'dog'), gw(1, 'cat')], warnings: [] })
    expect(g.status).toBe(201)
    const gid = (g.body as { id: string }).id
    expect((await c.get(`/api/players/${pid}/games/in-progress`)).body).toMatchObject({ id: gid })
    const att = { position: 0, attemptNumber: 1, text: 'dog', correct: true, outcome: 'double' }
    expect((await c.post(`/api/games/${gid}/attempts`, att)).status).toBe(204)
    expect((await c.post(`/api/games/${gid}/attempts`, att)).status).toBe(204)
    expect((await c.post(`/api/games/${gid}/attempts`, { position: 1, attemptNumber: 1, text: 'cat', correct: true, outcome: 'double' })).status).toBe(204)
    expect((await c.post(`/api/games/${gid}/complete`, { firstTryAccuracy: 3 })).status).toBe(204)
    const done = (await c.get(`/api/games/${gid}`)).body as { status: string; summary: { firstTryAccuracy: number; runs: number } }
    expect(done.status).toBe('complete')
    expect(done.summary.firstTryAccuracy).toBe(100)
    expect(done.summary.runs).toBe(1)
    expect((await c.get(`/api/players/${pid}/games?status=complete`)).body).toHaveLength(1)
    expect((await c.get(`/api/players/${pid}/games/in-progress`)).body).toBeNull()

    expect((await c.get('/api/pin')).body).toEqual({ set: false })
    expect((await c.put('/api/pin', { pin: '1234' })).status).toBe(204)
    expect((await c.post('/api/pin/verify', { pin: '1234' })).body).toEqual({ ok: true })
    expect((await c.post('/api/pin/verify', { pin: '9999' })).body).toEqual({ ok: false })

    expect((await c.del(`/api/lists/${lid}`)).status).toBe(204)
    expect((await c.get(`/api/lists/${lid}`)).status).toBe(404)
    expect((await c.del(`/api/players/${pid}`)).status).toBe(204)
    expect((await c.get('/api/players')).body).toEqual([])
  })

  it('rejects malformed bodies with 400 instead of 500', async () => {
    const { c } = await signedUp()
    expect((await c.post('/api/players', { name: '' })).status).toBe(400)
    expect((await c.post('/api/players', { ...cooper, jerseyNumber: 150 })).status).toBe(400)
    expect((await c.post('/api/games', { playerId: 'not-a-uuid', mode: 'weekly', words: [gw(0, 'x')] })).status).toBe(404)
    expect((await c.post('/api/games', { playerId: 'not-a-uuid', mode: 'weekly', words: [] })).status).toBe(400)
    expect((await c.put('/api/pin', { pin: '12' })).status).toBe(400)
  })

  it('keeps families apart: every foreign id is a 404 and nothing changes', async () => {
    const { c: a } = await signedUp()
    const { c: b } = await signedUp()
    const pid = ((await a.post('/api/players', cooper)).body as { id: string }).id
    const lid = ((await a.post(`/api/players/${pid}/lists`, { title: 'W', weekStart: '2026-10-26', words: [{ text: 'cat', sentence: null }] })).body as { id: string }).id
    const gid = ((await a.post('/api/games', { playerId: pid, listId: lid, mode: 'weekly', words: [gw(0, 'cat')], warnings: [] })).body as { id: string }).id

    expect((await b.get('/api/players')).body).toEqual([])
    expect((await b.get(`/api/players/${pid}/lists`)).body).toEqual([])
    expect((await b.get(`/api/lists/${lid}`)).status).toBe(404)
    expect((await b.get(`/api/games/${gid}`)).status).toBe(404)
    expect((await b.get(`/api/players/${pid}/games`)).body).toEqual([])
    expect((await b.patch(`/api/players/${pid}`, { name: 'hacked' })).status).toBe(404)
    expect((await b.del(`/api/players/${pid}`)).status).toBe(404)
    expect((await b.post(`/api/players/${pid}/lists`, { title: 'x', weekStart: '2026-10-26', words: [] })).status).toBe(404)
    expect((await b.patch(`/api/lists/${lid}`, { title: 'hacked' })).status).toBe(404)
    expect((await b.del(`/api/lists/${lid}`)).status).toBe(404)
    expect((await b.put(`/api/players/${pid}/active-list`, { listId: lid })).status).toBe(404)
    expect((await b.post(`/api/games/${gid}/attempts`, { position: 0, attemptNumber: 1, text: 'cat', correct: true, outcome: 'double' })).status).toBe(404)
    expect((await b.post(`/api/games/${gid}/complete`, {})).status).toBe(404)

    expect((await a.get(`/api/lists/${lid}`)).body).toMatchObject({ title: 'W' })
    expect((await a.get(`/api/games/${gid}`)).body).toMatchObject({ attempts: [], status: 'in_progress' })
    expect((await a.get('/api/players')).body).toMatchObject([{ name: 'Cooper' }])
  })

  it('deletes the account and ends the session', async () => {
    const { c, email: e } = await signedUp()
    await c.post('/api/players', cooper)
    expect((await c.del('/api/account')).status).toBe(204)
    expect((await c.get('/api/auth/me')).body).toEqual({ user: null })
    expect((await client(base).post('/api/auth/login', { email: e, password: 'long-enough-pw' })).status).toBe(401)
  })
})

describe('static serving', () => {
  it('serves the SPA for app routes, no-cache for sw.js, and JSON 404 under /api', async () => {
    const page = await fetch(`${base}/parent/players/abc/lists`)
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('<title>Slugger</title>')
    const sw = await fetch(`${base}/sw.js`)
    expect(sw.headers.get('cache-control')).toMatch(/no-cache/)
    const nope = await fetch(`${base}/api/nope`)
    expect(nope.status).toBe(404)
    expect(await nope.json()).toEqual({ error: 'NOT_FOUND' })
  })
})
