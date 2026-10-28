/**
 * The server-side Store: every query is scoped to one family. Rows another family owns look
 * absent (null / NOT_FOUND), never forbidden, so ids leak nothing.
 */
import type { GameSummary } from '../../src/engine/results'
import { summarize } from '../../src/engine/results'
import { rebuild } from '../../src/engine/replay'
import type { GameWord, Hand, Outcome } from '../../src/engine/types'
import type {
  Appearance, GameFilter, GameMode, GameRecord, NewGame, NewPlayer, NewWord, Player, Store, StoredAttempt, Word, WordList,
} from '../../src/data/types'
import { hashPassword, verifyPassword } from './auth'
import type { Db, Queryable } from './db'

export class NotFound extends Error {
  constructor() {
    super('NOT_FOUND')
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s)
const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v))
const isoOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : iso(v))

interface PlayerRow {
  id: string; name: string; team_name: string; jersey_number: number; batting_hand: Hand; appearance: Appearance; created_at: unknown
}
interface ListRow { id: string; player_id: string; title: string; week_start: string; is_active: boolean; created_at: unknown }
interface WordRow { id: string; list_id: string; position: number; text: string; sentence: string | null }
interface GameRow {
  id: string; player_id: string; list_id: string | null; mode: GameMode; status: GameRecord['status']
  warnings: string[] | null; summary: GameSummary | null; started_at: unknown; completed_at: unknown
}
interface GameWordRow { game_id: string; position: number; text: string; sentence: string | null; source: GameWord['source']; source_word_id: string | null; outcome: Outcome | null }
interface AttemptRow { game_id: string; position: number; attempt_number: number; text: string; correct: boolean }

const toPlayer = (r: PlayerRow): Player => ({
  id: r.id, name: r.name, teamName: r.team_name, jerseyNumber: r.jersey_number, hand: r.batting_hand,
  appearance: r.appearance, createdAt: iso(r.created_at),
})
const toWord = (w: WordRow): Word => ({ id: w.id, position: w.position, text: w.text, sentence: w.sentence })
const toList = (r: ListRow, words: WordRow[]): WordList => ({
  id: r.id, playerId: r.player_id, title: r.title, weekStart: r.week_start, isActive: r.is_active, createdAt: iso(r.created_at),
  words: words.filter((w) => w.list_id === r.id).sort((a, b) => a.position - b.position).map(toWord),
})
function toGame(r: GameRow, gws: GameWordRow[], atts: AttemptRow[]): GameRecord {
  const mine = gws.filter((w) => w.game_id === r.id).sort((a, b) => a.position - b.position)
  const outcomes = new Map(mine.map((w) => [w.position, w.outcome]))
  const attempts: StoredAttempt[] = atts
    .filter((a) => a.game_id === r.id)
    .sort((a, b) => a.position - b.position || a.attempt_number - b.attempt_number)
    .map((a) => ({
      position: a.position, attemptNumber: a.attempt_number as 1 | 2 | 3, text: a.text, correct: a.correct,
      outcome: a.correct || a.attempt_number === 3 ? (outcomes.get(a.position) ?? null) : null,
    }))
  return {
    id: r.id, playerId: r.player_id, listId: r.list_id, mode: r.mode, status: r.status,
    words: mine.map((w) => ({ position: w.position, text: w.text, sentence: w.sentence, source: w.source, sourceWordId: w.source_word_id })),
    attempts, warnings: r.warnings ?? [], summary: r.summary, startedAt: iso(r.started_at), completedAt: isoOrNull(r.completed_at),
  }
}

const LIST_COLS = "id, player_id, title, to_char(week_start, 'YYYY-MM-DD') as week_start, is_active, created_at"
const GAME_COLS = 'id, player_id, list_id, mode, status, warnings, summary, started_at, completed_at'

export async function createFamily(db: Queryable): Promise<string> {
  const { rows } = await db.query<{ id: string }>('insert into families default values returning id')
  return rows[0]!.id
}

export function createServerStore(db: Db, familyId: string): Store {
  // ---- ownership guards: throw NotFound unless the row belongs to this family
  async function ownPlayer(q: Queryable, playerId: unknown): Promise<string> {
    if (!isUuid(playerId)) throw new NotFound()
    const { rows } = await q.query('select 1 from players where id = $1 and family_id = $2', [playerId, familyId])
    if (rows.length === 0) throw new NotFound()
    return playerId
  }
  async function ownList(q: Queryable, listId: unknown): Promise<string> {
    if (!isUuid(listId)) throw new NotFound()
    const { rows } = await q.query(
      'select 1 from word_lists l join players p on p.id = l.player_id where l.id = $1 and p.family_id = $2', [listId, familyId],
    )
    if (rows.length === 0) throw new NotFound()
    return listId
  }
  async function ownGame(q: Queryable, gameId: unknown): Promise<string> {
    if (!isUuid(gameId)) throw new NotFound()
    const { rows } = await q.query(
      'select 1 from games g join players p on p.id = g.player_id where g.id = $1 and p.family_id = $2', [gameId, familyId],
    )
    if (rows.length === 0) throw new NotFound()
    return gameId
  }

  async function insertWords(q: Queryable, listId: string, words: NewWord[]): Promise<void> {
    for (const [i, w] of words.entries())
      await q.query('insert into words (list_id, position, text, sentence) values ($1, $2, $3, $4)', [listId, i + 1, w.text, w.sentence])
  }
  async function loadLists(where: string, params: unknown[]): Promise<WordList[]> {
    const lists = (await db.query<ListRow>(
      `select ${LIST_COLS} from word_lists l where l.player_id in (select id from players where family_id = $1) and ${where}
       order by week_start desc, created_at desc`, [familyId, ...params],
    )).rows
    if (lists.length === 0) return []
    const words = (await db.query<WordRow>('select * from words where list_id = any($1::uuid[])', [lists.map((l) => l.id)])).rows
    return lists.map((l) => toList(l, words))
  }
  async function loadGames(where: string, params: unknown[], limit?: number): Promise<GameRecord[]> {
    const games = (await db.query<GameRow>(
      `select ${GAME_COLS} from games g where g.player_id in (select id from players where family_id = $1) and ${where}
       order by started_at desc${limit ? ` limit ${limit}` : ''}`, [familyId, ...params],
    )).rows
    if (games.length === 0) return []
    const ids = games.map((g) => g.id)
    const [gws, atts] = await Promise.all([
      db.query<GameWordRow>('select * from game_words where game_id = any($1::uuid[])', [ids]),
      db.query<AttemptRow>('select * from attempts where game_id = any($1::uuid[])', [ids]),
    ])
    return games.map((g) => toGame(g, gws.rows, atts.rows))
  }
  const getList = async (id: unknown): Promise<WordList | null> =>
    isUuid(id) ? ((await loadLists('l.id = $2', [id]))[0] ?? null) : null
  const getGame = async (id: unknown): Promise<GameRecord | null> =>
    isUuid(id) ? ((await loadGames('g.id = $2', [id]))[0] ?? null) : null

  return {
    async listPlayers() {
      const { rows } = await db.query<PlayerRow>('select * from players where family_id = $1 order by created_at', [familyId])
      return rows.map(toPlayer)
    },
    async createPlayer(input: NewPlayer) {
      const { rows } = await db.query<PlayerRow>(
        `insert into players (family_id, name, team_name, jersey_number, batting_hand, appearance)
         values ($1, $2, $3, $4, $5, $6) returning *`,
        [familyId, input.name, input.teamName, input.jerseyNumber, input.hand, JSON.stringify(input.appearance)],
      )
      return toPlayer(rows[0]!)
    },
    async updatePlayer(id, patch) {
      await ownPlayer(db, id)
      const { rows } = await db.query<PlayerRow>(
        `update players set name = coalesce($3, name), team_name = coalesce($4, team_name),
           jersey_number = coalesce($5, jersey_number), batting_hand = coalesce($6, batting_hand),
           appearance = coalesce($7::jsonb, appearance)
         where id = $1 and family_id = $2 returning *`,
        [id, familyId, patch.name ?? null, patch.teamName ?? null, patch.jerseyNumber ?? null, patch.hand ?? null,
          patch.appearance ? JSON.stringify(patch.appearance) : null],
      )
      return toPlayer(rows[0]!)
    },
    async deletePlayer(id) {
      await ownPlayer(db, id)
      await db.query('delete from players where id = $1 and family_id = $2', [id, familyId])
    },

    async listWordLists(playerId) {
      if (!isUuid(playerId)) return []
      return loadLists('l.player_id = $2', [playerId])
    },
    getWordList: getList,
    async createWordList(playerId, input) {
      await ownPlayer(db, playerId)
      const id = await db.tx(async (q) => {
        const { rows } = await q.query<{ id: string }>(
          'insert into word_lists (player_id, title, week_start) values ($1, $2, $3) returning id', [playerId, input.title, input.weekStart],
        )
        await insertWords(q, rows[0]!.id, input.words)
        return rows[0]!.id
      })
      return (await getList(id))!
    },
    async updateWordList(id, patch) {
      await ownList(db, id)
      await db.tx(async (q) => {
        await q.query('update word_lists set title = coalesce($2, title), week_start = coalesce($3, week_start) where id = $1',
          [id, patch.title ?? null, patch.weekStart ?? null])
        if (patch.words !== undefined) {
          await q.query('delete from words where list_id = $1', [id])
          await insertWords(q, id, patch.words)
        }
      })
      return (await getList(id))!
    },
    async setActiveList(playerId, listId) {
      await ownPlayer(db, playerId)
      await ownList(db, listId)
      await db.tx(async (q) => {
        await q.query('update word_lists set is_active = false where player_id = $1 and is_active', [playerId])
        const { rows } = await q.query('update word_lists set is_active = true where id = $1 and player_id = $2 returning id', [listId, playerId])
        if (rows.length === 0) throw new NotFound()
      })
    },
    async deleteWordList(id) {
      await ownList(db, id)
      await db.query('delete from word_lists where id = $1', [id])
    },

    async createGame(input: NewGame) {
      await ownPlayer(db, input.playerId)
      if (input.listId !== null) await ownList(db, input.listId)
      const id = await db.tx(async (q) => {
        const { rows } = await q.query<{ id: string }>(
          'insert into games (player_id, list_id, mode, warnings) values ($1, $2, $3, $4) returning id',
          [input.playerId, input.listId, input.mode, input.warnings],
        )
        for (const w of input.words)
          await q.query(
            'insert into game_words (game_id, position, text, sentence, source, source_word_id) values ($1, $2, $3, $4, $5, $6)',
            [rows[0]!.id, w.position, w.text, w.sentence, w.source, w.sourceWordId],
          )
        return rows[0]!.id
      })
      return (await getGame(id))!
    },
    async recordAttempt(gameId, a) {
      await ownGame(db, gameId)
      await db.tx(async (q) => {
        await q.query(
          `insert into attempts (game_id, position, attempt_number, text, correct) values ($1, $2, $3, $4, $5)
           on conflict (game_id, position, attempt_number) do nothing`,
          [gameId, a.position, a.attemptNumber, a.text, a.correct],
        )
        if (a.outcome !== null)
          await q.query('update game_words set outcome = $3 where game_id = $1 and position = $2 and outcome is null', [gameId, a.position, a.outcome])
      })
    },
    /** The client's summary is ignored: the attempt log is replayed through the engine instead. */
    async completeGame(gameId) {
      await ownGame(db, gameId)
      const game = (await getGame(gameId))!
      const summary = summarize(rebuild(game.words, game.attempts))
      await db.query(
        `update games set status = 'complete', summary = $2::jsonb, completed_at = now() where id = $1 and status = 'in_progress'`,
        [gameId, JSON.stringify(summary)],
      )
    },
    getGame,
    async findInProgressGame(playerId) {
      if (!isUuid(playerId)) return null
      return (await loadGames("g.player_id = $2 and g.status = 'in_progress'", [playerId], 1))[0] ?? null
    },
    async listGames(playerId, filter: GameFilter = {}) {
      if (!isUuid(playerId)) return []
      const where = ['g.player_id = $2']
      const params: unknown[] = [playerId]
      if (filter.mode) { params.push(filter.mode); where.push(`g.mode = $${params.length + 1}`) }
      if (filter.listId) { params.push(filter.listId); where.push(`g.list_id = $${params.length + 1}`) }
      if (filter.status) { params.push(filter.status); where.push(`g.status = $${params.length + 1}`) }
      return loadGames(where.join(' and '), params)
    },

    async hasParentPin() {
      const { rows } = await db.query<{ has: boolean }>('select parent_pin_hash is not null as has from families where id = $1', [familyId])
      return rows[0]?.has ?? false
    },
    async setParentPin(pin) {
      await db.query('update families set parent_pin_hash = $2 where id = $1', [familyId, await hashPassword(pin)])
    },
    async verifyParentPin(pin) {
      const { rows } = await db.query<{ h: string | null }>('select parent_pin_hash as h from families where id = $1', [familyId])
      const h = rows[0]?.h
      return h ? verifyPassword(pin, h) : false
    },
    async deleteAccount() {
      await db.query('delete from families where id = $1', [familyId])
    },
  }
}
