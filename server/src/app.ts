/** The HTTP API plus static hosting for the built frontend. */
import express, { type NextFunction, type Request, type Response } from 'express'
import path from 'node:path'
import { MIN_PASSWORD_LENGTH, SESSION_COOKIE, SESSION_DAYS } from './auth'
import type { Db } from './db'
import { createServerStore, NotFound } from './store'
import type { Store } from '../../src/data/types'
import { authenticate, createSession, deleteSession, findSession, registerUser, setPassword, type SessionUser } from './users'

export interface AppOptions {
  /** True behind HTTPS (production). Sets the Secure flag and trusts the proxy's protocol header. */
  secureCookies: boolean
  /** Built frontend to serve with an SPA fallback; omit for API-only. */
  staticDir?: string
  /** False closes signups (invite-only). Default true. */
  allowRegistration?: boolean
}

/** Browsers send this on every mutation; a cross-site form or image tag cannot. */
const CSRF_HEADER = 'x-requested-with'
const CSRF_VALUE = 'slugger'

class HttpError extends Error {
  status: number
  constructor(status: number, code: string) {
    super(code)
    this.status = status
  }
}
const bad = (code = 'BAD_REQUEST') => new HttpError(400, code)

// ---------------------------------------------------------------- tiny validators
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
function str(v: unknown, max = 200, min = 1): string {
  if (typeof v !== 'string' || v.length < min || v.length > max) throw bad()
  return v
}
function optStr(v: unknown, max = 200, min = 1): string | undefined {
  return v === undefined ? undefined : str(v, max, min)
}
function int(v: unknown, lo: number, hi: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < lo || v > hi) throw bad()
  return v
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) throw bad()
  return v as T
}
function parseAppearance(v: unknown) {
  if (!isObj(v)) throw bad()
  const colors = ['primaryColor', 'secondaryColor', 'jerseyColor', 'pantsColor', 'hatColor', 'skinTone', 'hairColor'] as const
  const out: Record<string, string> = {}
  for (const k of colors) out[k] = str(v[k], 32)
  out.hairstyle = oneOf(v.hairstyle, ['short', 'curly', 'long', 'buzz', 'ponytail', 'afro'])
  return out as unknown as Parameters<Store['createPlayer']>[0]['appearance']
}
function parseNewPlayer(b: unknown) {
  if (!isObj(b)) throw bad()
  return {
    name: str(b.name, 30), teamName: str(b.teamName ?? '', 40, 0), jerseyNumber: int(b.jerseyNumber, 0, 99),
    hand: oneOf(b.hand, ['L', 'R'] as const), appearance: parseAppearance(b.appearance),
  }
}
function parsePlayerPatch(b: unknown) {
  if (!isObj(b)) throw bad()
  return {
    ...(b.name !== undefined ? { name: str(b.name, 30) } : {}),
    ...(b.teamName !== undefined ? { teamName: str(b.teamName, 40, 0) } : {}),
    ...(b.jerseyNumber !== undefined ? { jerseyNumber: int(b.jerseyNumber, 0, 99) } : {}),
    ...(b.hand !== undefined ? { hand: oneOf(b.hand, ['L', 'R'] as const) } : {}),
    ...(b.appearance !== undefined ? { appearance: parseAppearance(b.appearance) } : {}),
  }
}
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DIFF = ['easy', 'medium', 'hard'] as const
function parseWords(v: unknown) {
  if (!Array.isArray(v) || v.length > 200) throw bad()
  return v.map((w) => {
    if (!isObj(w)) throw bad()
    return {
      text: str(w.text, 60), sentence: w.sentence == null ? null : str(w.sentence, 300),
      difficulty: w.difficulty == null ? 'medium' as const : oneOf(w.difficulty, DIFF),
      source: w.source == null ? 'current' as const : oneOf(w.source, ['current', 'review'] as const),
    }
  })
}
function parseGameWords(v: unknown) {
  if (!Array.isArray(v) || v.length === 0 || v.length > 200) throw bad()
  return v.map((w) => {
    if (!isObj(w)) throw bad()
    return {
      position: int(w.position, 0, 500), text: str(w.text, 60), sentence: w.sentence == null ? null : str(w.sentence, 300),
      source: oneOf(w.source, ['current', 'review'] as const), sourceWordId: w.sourceWordId == null ? null : str(w.sourceWordId, 64),
      difficulty: w.difficulty == null ? 'medium' as const : oneOf(w.difficulty, DIFF),
    }
  })
}
function parseAttempt(b: unknown) {
  if (!isObj(b)) throw bad()
  return {
    position: int(b.position, 0, 500), attemptNumber: int(b.attemptNumber, 1, 3) as 1 | 2 | 3, text: str(b.text, 200, 0),
    correct: typeof b.correct === 'boolean' ? b.correct : (() => { throw bad() })(),
    outcome: b.outcome == null ? null : oneOf(b.outcome, ['homeRun', 'double', 'single', 'walk', 'strikeout'] as const),
  }
}
/** Registration enforces the minimum length; login only needs a string, so a short wrong password is still a 401. */
function parseCredentials(b: unknown, minPassword: number) {
  if (!isObj(b)) throw bad()
  const email = str(b.email, 254).trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('INVALID_EMAIL')
  const password = str(b.password, 1024, minPassword)
  return { email, password }
}

/** Express 5 types params as string | string[]; our routes have no repeat segments. */
const param = (req: Request, name: string): string => String(req.params[name] ?? '')

// ---------------------------------------------------------------- rate limiting
/** Sliding-window counter per key, in memory (per instance). Enough to stop password and PIN guessing. */
function limiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return {
    /** Records an attempt; false when the key is over its limit. */
    hit(key: string): boolean {
      const now = Date.now()
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
      if (recent.length >= max) {
        hits.set(key, recent)
        return false
      }
      recent.push(now)
      hits.set(key, recent)
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k)
      return true
    },
    reset(key: string) {
      hits.delete(key)
    },
  }
}
const LOGIN_LIMIT = { max: 10, windowMs: 15 * 60_000 }
const PIN_LIMIT = { max: 10, windowMs: 5 * 60_000 }

// ---------------------------------------------------------------- cookies
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function createApp(db: Db, opts: AppOptions) {
  const app = express()
  app.disable('x-powered-by')
  if (opts.secureCookies) app.set('trust proxy', 1)

  const setSession = (res: Response, token: string) =>
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true, sameSite: 'lax', secure: opts.secureCookies, path: '/', maxAge: SESSION_DAYS * 86_400_000,
    })
  const clearSession = (res: Response) => res.clearCookie(SESSION_COOKIE, { path: '/' })

  const loginLimiter = limiter(LOGIN_LIMIT.max, LOGIN_LIMIT.windowMs)
  const pinLimiter = limiter(PIN_LIMIT.max, PIN_LIMIT.windowMs)

  interface Ctx { user: SessionUser; store: Store }
  const ctxOf = new WeakMap<Request, Ctx>()

  const api = express.Router()
  api.use(express.json({ limit: '256kb' }))

  // CSRF: any mutation must carry the custom header (never sent by cross-site forms).
  api.use((req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (req.headers[CSRF_HEADER] !== CSRF_VALUE) return next(new HttpError(403, 'FORBIDDEN'))
    next()
  })

  // Session lookup for every request; routes decide whether it is required.
  api.use(async (req, _res, next) => {
    try {
      const token = readCookie(req, SESSION_COOKIE)
      const user = token ? await findSession(db, token) : null
      if (user) ctxOf.set(req, { user, store: createServerStore(db, user.familyId) })
      next()
    } catch (e) {
      next(e)
    }
  })

  const requireUser = (req: Request): Ctx => {
    const c = ctxOf.get(req)
    if (!c) throw new HttpError(401, 'UNAUTHENTICATED')
    return c
  }
  type Handler = (req: Request, res: Response) => Promise<unknown>
  const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next)

  // ---- auth
  api.post('/auth/register', h(async (req, res) => {
    if (opts.allowRegistration === false) return res.status(403).json({ error: 'REGISTRATION_CLOSED' })
    const { email, password } = parseCredentials(req.body, MIN_PASSWORD_LENGTH)
    const user = await registerUser(db, email, password)
    setSession(res, await createSession(db, user.userId))
    res.status(201).json({ user: { id: user.userId, email: user.email } })
  }))
  api.post('/auth/login', h(async (req, res) => {
    const { email, password } = parseCredentials(req.body, 1)
    const key = `${req.ip ?? '?'}|${email.toLowerCase()}`
    if (!loginLimiter.hit(key)) throw new HttpError(429, 'TOO_MANY_ATTEMPTS')
    const user = await authenticate(db, email, password)
    if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS')
    loginLimiter.reset(key)
    setSession(res, await createSession(db, user.userId))
    res.json({ user: { id: user.userId, email: user.email } })
  }))
  api.post('/auth/logout', h(async (req, res) => {
    const token = readCookie(req, SESSION_COOKIE)
    if (token) await deleteSession(db, token)
    clearSession(res)
    res.status(204).end()
  }))
  api.get('/auth/me', h(async (req, res) => {
    const c = ctxOf.get(req)
    res.json({ user: c ? { id: c.user.userId, email: c.user.email } : null })
  }))
  api.post('/auth/password', h(async (req, res) => {
    const { user } = requireUser(req)
    if (!isObj(req.body)) throw bad()
    await setPassword(db, user.userId, str(req.body.newPassword, 1024, MIN_PASSWORD_LENGTH))
    res.status(204).end()
  }))

  // ---- players
  api.get('/players', h(async (req, res) => res.json(await requireUser(req).store.listPlayers())))
  api.post('/players', h(async (req, res) => res.status(201).json(await requireUser(req).store.createPlayer(parseNewPlayer(req.body)))))
  api.patch('/players/:id', h(async (req, res) => res.json(await requireUser(req).store.updatePlayer(param(req, 'id'), parsePlayerPatch(req.body)))))
  api.delete('/players/:id', h(async (req, res) => { await requireUser(req).store.deletePlayer(param(req, 'id')); res.status(204).end() }))

  // ---- word lists
  api.get('/players/:pid/lists', h(async (req, res) => res.json(await requireUser(req).store.listWordLists(param(req, 'pid')))))
  api.post('/players/:pid/lists', h(async (req, res) => {
    const b = isObj(req.body) ? req.body : {}
    const weekStart = str(b.weekStart, 10)
    if (!DATE.test(weekStart)) throw bad()
    const list = await requireUser(req).store.createWordList(param(req, 'pid'), { title: str(b.title, 120), weekStart, words: parseWords(b.words ?? []) })
    res.status(201).json(list)
  }))
  api.get('/lists/:id', h(async (req, res) => {
    const list = await requireUser(req).store.getWordList(param(req, 'id'))
    if (!list) throw new NotFound()
    res.json(list)
  }))
  api.patch('/lists/:id', h(async (req, res) => {
    const b = isObj(req.body) ? req.body : {}
    const weekStart = optStr(b.weekStart, 10)
    if (weekStart !== undefined && !DATE.test(weekStart)) throw bad()
    const patch = { title: optStr(b.title, 120), weekStart, words: b.words === undefined ? undefined : parseWords(b.words) }
    res.json(await requireUser(req).store.updateWordList(param(req, 'id'), patch))
  }))
  api.delete('/lists/:id', h(async (req, res) => { await requireUser(req).store.deleteWordList(param(req, 'id')); res.status(204).end() }))
  api.put('/players/:pid/active-list', h(async (req, res) => {
    const b = isObj(req.body) ? req.body : {}
    await requireUser(req).store.setActiveList(param(req, 'pid'), str(b.listId, 64))
    res.status(204).end()
  }))

  // ---- games
  api.post('/games', h(async (req, res) => {
    const b = isObj(req.body) ? req.body : {}
    const game = await requireUser(req).store.createGame({
      playerId: str(b.playerId, 64), listId: b.listId == null ? null : str(b.listId, 64),
      mode: oneOf(b.mode, ['weekly', 'practice', 'missed'] as const), words: parseGameWords(b.words),
      warnings: Array.isArray(b.warnings) ? b.warnings.map((w) => str(w, 300)) : [],
    })
    res.status(201).json(game)
  }))
  api.get('/games/:id', h(async (req, res) => {
    const game = await requireUser(req).store.getGame(param(req, 'id'))
    if (!game) throw new NotFound()
    res.json(game)
  }))
  api.post('/games/:id/attempts', h(async (req, res) => {
    await requireUser(req).store.recordAttempt(param(req, 'id'), parseAttempt(req.body))
    res.status(204).end()
  }))
  api.post('/games/:id/complete', h(async (req, res) => {
    await requireUser(req).store.completeGame(param(req, 'id'), null as never)
    res.status(204).end()
  }))
  api.get('/players/:pid/games/in-progress', h(async (req, res) => res.json(await requireUser(req).store.findInProgressGame(param(req, 'pid')))))
  api.get('/players/:pid/games', h(async (req, res) => {
    const q = req.query
    const filter = {
      ...(typeof q.mode === 'string' ? { mode: oneOf(q.mode, ['weekly', 'practice', 'missed'] as const) } : {}),
      ...(typeof q.listId === 'string' ? { listId: q.listId } : {}),
      ...(typeof q.status === 'string' ? { status: oneOf(q.status, ['in_progress', 'complete'] as const) } : {}),
    }
    res.json(await requireUser(req).store.listGames(param(req, 'pid'), filter))
  }))

  // ---- parent PIN and account
  api.get('/pin', h(async (req, res) => res.json({ set: await requireUser(req).store.hasParentPin() })))
  api.put('/pin', h(async (req, res) => {
    const pin = str(isObj(req.body) ? req.body.pin : undefined, 4, 4)
    if (!/^\d{4}$/.test(pin)) throw bad()
    await requireUser(req).store.setParentPin(pin)
    res.status(204).end()
  }))
  api.post('/pin/verify', h(async (req, res) => {
    const pin = str(isObj(req.body) ? req.body.pin : undefined, 4, 4)
    const { user, store } = requireUser(req)
    if (!pinLimiter.hit(user.familyId)) throw new HttpError(429, 'TOO_MANY_ATTEMPTS')
    const ok = await store.verifyParentPin(pin)
    if (ok) pinLimiter.reset(user.familyId)
    res.json({ ok })
  }))
  api.delete('/account', h(async (req, res) => {
    const { store } = requireUser(req)
    await store.deleteAccount()
    clearSession(res)
    res.status(204).end()
  }))

  api.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND')))

  // Errors → JSON. Postgres check/format violations are the client's fault.
  api.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message })
    if (err instanceof NotFound) return res.status(404).json({ error: 'NOT_FOUND' })
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') return res.status(409).json({ error: 'EMAIL_TAKEN' })
    if (err instanceof Error && 'type' in err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'BAD_JSON' })
    if (err instanceof Error && /violates (check|not-null) constraint|invalid input syntax/i.test(err.message))
      return res.status(400).json({ error: 'BAD_REQUEST' })
    console.error(err)
    res.status(500).json({ error: 'SERVER_ERROR' })
  })

  app.use('/api', api)

  if (opts.staticDir) {
    const dir = opts.staticDir
    app.use((req, res, next) => {
      if (req.path === '/sw.js' || req.path === '/index.html' || req.path === '/') res.setHeader('Cache-Control', 'no-cache')
      next()
    })
    app.use(express.static(dir, { index: 'index.html', maxAge: '1y', setHeaders: (res, p) => { if (/\.(html|webmanifest)$|sw\.js$|registerSW\.js$/.test(p)) res.setHeader('Cache-Control', 'no-cache') } }))
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(dir, 'index.html')))
  }

  return app
}
