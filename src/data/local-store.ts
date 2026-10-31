/**
 * LocalStore: everything in one localStorage blob. Used for development and tests; the API store (api-store.ts) is the production one. Formerly a stand-in before a
 * project exists and for end-to-end tests. Single implicit family; no real security.
 */
import type { GameSummary } from '../engine/results'
import { gameResult, visitorScore } from '../engine/opponent'
import { rebuild } from '../engine/replay'
import type {
  GameFilter, GameRecord, NewGame, NewPlayer, NewWord, Player, Store, StoredAttempt, Word, WordList,
} from './types'

const KEY = 'slugger.v1'

interface Blob {
  players: Player[]
  lists: WordList[]
  games: GameRecord[]
  pinHash: string | null
}

const empty = (): Blob => ({ players: [], lists: [], games: [], pinHash: null })

function load(): Blob {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const b: Blob = { ...empty(), ...(JSON.parse(raw) as Partial<Blob>) }
    // Games saved before Phase 3 have no result fields; they stay null (left out of the season record).
    b.games = b.games.map((g) => ({ ...g, result: g.result ?? null, visitorRuns: g.visitorRuns ?? null }))
    // Normalize words saved before difficulty/source existed.
    b.lists = b.lists.map((l) => ({
      ...l, words: l.words.map((w) => ({ ...w, difficulty: w.difficulty ?? 'medium', source: w.source ?? 'current' })),
    }))
    b.games = b.games.map((g) => ({ ...g, words: g.words.map((w) => ({ ...w, difficulty: w.difficulty ?? 'medium' })) }))
    return b
  } catch {
    return empty()
  }
}

function save(b: Blob): void {
  localStorage.setItem(KEY, JSON.stringify(b))
}

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const now = (): string => new Date().toISOString()

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`slugger:${pin}`)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback for environments without WebCrypto (tests). Not a security boundary.
  let h = 2166136261
  for (const byte of data) h = Math.imul(h ^ byte, 16777619) >>> 0
  return `fnv:${h.toString(16)}`
}

function numberWords(words: NewWord[]): Word[] {
  return words.map((w, i) => ({
    id: uid(), position: i + 1, text: w.text, sentence: w.sentence,
    difficulty: w.difficulty ?? 'medium', source: w.source ?? 'current',
  }))
}

const byWeekDesc = (a: WordList, b: WordList): number => (a.weekStart < b.weekStart ? 1 : a.weekStart > b.weekStart ? -1 : 0)
const byStartDesc = (a: GameRecord, b: GameRecord): number => (a.startedAt < b.startedAt ? 1 : a.startedAt > b.startedAt ? -1 : 0)
/** Newest first; games created in the same millisecond keep reverse insertion order. */
const newestFirst = (games: GameRecord[]): GameRecord[] => [...games].reverse().sort(byStartDesc)

export function createLocalStore(): Store {
  const mutate = <T>(fn: (b: Blob) => T): T => {
    const b = load()
    const out = fn(b)
    save(b)
    return out
  }

  return {
    async listPlayers() {
      return load().players
    },
    async createPlayer(input: NewPlayer) {
      return mutate((b) => {
        const p: Player = { ...input, id: uid(), createdAt: now() }
        b.players.push(p)
        return p
      })
    },
    async updatePlayer(id, patch) {
      return mutate((b) => {
        const p = b.players.find((x) => x.id === id)
        if (!p) throw new Error('Player not found')
        Object.assign(p, patch)
        return p
      })
    },
    async deletePlayer(id) {
      mutate((b) => {
        b.players = b.players.filter((p) => p.id !== id)
        b.lists = b.lists.filter((l) => l.playerId !== id)
        b.games = b.games.filter((g) => g.playerId !== id)
      })
    },

    async listWordLists(playerId) {
      return load().lists.filter((l) => l.playerId === playerId).sort(byWeekDesc)
    },
    async getWordList(id) {
      return load().lists.find((l) => l.id === id) ?? null
    },
    async createWordList(playerId, input) {
      return mutate((b) => {
        const l: WordList = {
          id: uid(), playerId, title: input.title, weekStart: input.weekStart, isActive: false,
          createdAt: now(), words: numberWords(input.words),
        }
        b.lists.push(l)
        return l
      })
    },
    async updateWordList(id, patch) {
      return mutate((b) => {
        const l = b.lists.find((x) => x.id === id)
        if (!l) throw new Error('List not found')
        if (patch.title !== undefined) l.title = patch.title
        if (patch.weekStart !== undefined) l.weekStart = patch.weekStart
        if (patch.words !== undefined) l.words = numberWords(patch.words)
        return l
      })
    },
    async setActiveList(playerId, listId) {
      mutate((b) => {
        for (const l of b.lists) if (l.playerId === playerId) l.isActive = l.id === listId
      })
    },
    async deleteWordList(id) {
      mutate((b) => {
        b.lists = b.lists.filter((l) => l.id !== id)
        for (const g of b.games) if (g.listId === id) g.listId = null
      })
    },

    async createGame(input: NewGame) {
      return mutate((b) => {
        const g: GameRecord = {
          id: uid(), playerId: input.playerId, listId: input.listId, mode: input.mode, status: 'in_progress',
          words: input.words.map((w) => ({ ...w })), attempts: [], warnings: [...input.warnings], summary: null, result: null, visitorRuns: null,
          startedAt: now(), completedAt: null,
        }
        b.games.push(g)
        return g
      })
    },
    async recordAttempt(gameId, attempt: StoredAttempt) {
      mutate((b) => {
        const g = b.games.find((x) => x.id === gameId)
        if (!g) throw new Error('Game not found')
        const dup = g.attempts.some((a) => a.position === attempt.position && a.attemptNumber === attempt.attemptNumber)
        if (!dup) g.attempts.push({ ...attempt })
      })
    },
    async completeGame(gameId, summary: GameSummary) {
      mutate((b) => {
        const g = b.games.find((x) => x.id === gameId)
        if (!g) throw new Error('Game not found')
        if (g.status === 'complete') return
        g.status = 'complete'
        g.summary = summary
        // Same as the server: the result comes from the attempt log, never the caller.
        const state = rebuild(g.words, g.attempts, g.id)
        g.result = gameResult(state, g.id)
        g.visitorRuns = state.status === 'complete' ? visitorScore(state, g.id).reduce((a, c) => a + c, 0) : null
        g.completedAt = now()
      })
    },
    async getGame(id) {
      return load().games.find((g) => g.id === id) ?? null
    },
    async findInProgressGame(playerId) {
      return newestFirst(load().games.filter((g) => g.playerId === playerId && g.status === 'in_progress'))[0] ?? null
    },
    async listGames(playerId, filter: GameFilter = {}) {
      return newestFirst(
        load().games.filter(
          (g) =>
            g.playerId === playerId &&
            (filter.mode === undefined || g.mode === filter.mode) &&
            (filter.listId === undefined || g.listId === filter.listId) &&
            (filter.status === undefined || g.status === filter.status),
        ),
      )
    },

    async hasParentPin() {
      return load().pinHash !== null
    },
    async setParentPin(pin) {
      const h = await hashPin(pin)
      mutate((b) => void (b.pinHash = h))
    },
    async verifyParentPin(pin) {
      const h = await hashPin(pin)
      return load().pinHash === h
    },
    async deleteAccount() {
      localStorage.removeItem(KEY)
    },
  }
}
