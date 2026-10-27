/** SupabaseStore: the production Store. Every query runs under the signed-in parent's RLS. */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GameSummary } from '../engine/results'
import type { GameWord, Hand, Outcome } from '../engine/types'
import type {
  Appearance, GameFilter, GameMode, GameRecord, NewGame, NewPlayer, NewWord, Player, Store, StoredAttempt, Word, WordList,
} from './types'

interface PlayerRow {
  id: string
  family_id: string
  name: string
  team_name: string
  jersey_number: number
  batting_hand: Hand
  appearance: Appearance
  created_at: string
}
interface WordRow { id: string; list_id: string; position: number; text: string; sentence: string | null }
interface ListRow {
  id: string; player_id: string; title: string; week_start: string; is_active: boolean; created_at: string
  words?: WordRow[]
}
interface GameWordRow {
  position: number; text: string; sentence: string | null; source: 'current' | 'review'; source_word_id: string | null; outcome: Outcome | null
}
interface AttemptRow { position: number; attempt_number: number; text: string; correct: boolean }
interface GameRow {
  id: string; player_id: string; list_id: string | null; mode: GameMode; status: GameRecord['status']
  warnings: string[]; summary: GameSummary | null; started_at: string; completed_at: string | null
  game_words?: GameWordRow[]; attempts?: AttemptRow[]
}

function fail(error: { message: string } | null, what: string): asserts error is null {
  if (error) throw new Error(`${what}: ${error.message}`)
}

const toPlayer = (r: PlayerRow): Player => ({
  id: r.id, name: r.name, teamName: r.team_name, jerseyNumber: r.jersey_number, hand: r.batting_hand,
  appearance: r.appearance, createdAt: r.created_at,
})

const toWord = (w: WordRow): Word => ({ id: w.id, position: w.position, text: w.text, sentence: w.sentence })

const toList = (r: ListRow): WordList => ({
  id: r.id, playerId: r.player_id, title: r.title, weekStart: r.week_start, isActive: r.is_active, createdAt: r.created_at,
  words: [...(r.words ?? [])].sort((a, b) => a.position - b.position).map(toWord),
})

function toGame(r: GameRow): GameRecord {
  const words: GameWord[] = [...(r.game_words ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((w) => ({ position: w.position, text: w.text, sentence: w.sentence, source: w.source, sourceWordId: w.source_word_id }))
  const outcomes = new Map((r.game_words ?? []).map((w) => [w.position, w.outcome]))
  const attempts: StoredAttempt[] = [...(r.attempts ?? [])]
    .sort((a, b) => a.position - b.position || a.attempt_number - b.attempt_number)
    .map((a) => {
      const isLastOfWord = a.correct || a.attempt_number === 3
      return {
        position: a.position,
        attemptNumber: a.attempt_number as 1 | 2 | 3,
        text: a.text,
        correct: a.correct,
        outcome: isLastOfWord ? (outcomes.get(a.position) ?? null) : null,
      }
    })
  return {
    id: r.id, playerId: r.player_id, listId: r.list_id, mode: r.mode, status: r.status, words, attempts,
    warnings: r.warnings ?? [], summary: r.summary, startedAt: r.started_at, completedAt: r.completed_at,
  }
}

const LIST_SELECT = 'id, player_id, title, week_start, is_active, created_at, words(id, list_id, position, text, sentence)'
const GAME_SELECT =
  'id, player_id, list_id, mode, status, warnings, summary, started_at, completed_at, ' +
  'game_words(position, text, sentence, source, source_word_id, outcome), attempts(position, attempt_number, text, correct)'

export function createSupabaseStore(sb: SupabaseClient): Store {
  async function familyId(): Promise<string> {
    const { data, error } = await sb.from('family_members').select('family_id').limit(1).single()
    fail(error, 'Loading family')
    return (data as { family_id: string }).family_id
  }

  async function insertWords(listId: string, words: NewWord[]): Promise<void> {
    if (words.length === 0) return
    const { error } = await sb
      .from('words')
      .insert(words.map((w, i) => ({ list_id: listId, position: i + 1, text: w.text, sentence: w.sentence })))
    fail(error, 'Saving words')
  }

  async function getList(id: string): Promise<WordList | null> {
    const { data, error } = await sb.from('word_lists').select(LIST_SELECT).eq('id', id).maybeSingle()
    fail(error, 'Loading list')
    return data ? toList(data as unknown as ListRow) : null
  }

  return {
    async listPlayers() {
      const { data, error } = await sb.from('players').select('*').order('created_at')
      fail(error, 'Loading players')
      return (data as PlayerRow[]).map(toPlayer)
    },
    async createPlayer(input: NewPlayer) {
      const { data, error } = await sb
        .from('players')
        .insert({
          family_id: await familyId(), name: input.name, team_name: input.teamName, jersey_number: input.jerseyNumber,
          batting_hand: input.hand, appearance: input.appearance,
        })
        .select('*')
        .single()
      fail(error, 'Creating player')
      return toPlayer(data as PlayerRow)
    },
    async updatePlayer(id, patch) {
      const row: Partial<PlayerRow> = {}
      if (patch.name !== undefined) row.name = patch.name
      if (patch.teamName !== undefined) row.team_name = patch.teamName
      if (patch.jerseyNumber !== undefined) row.jersey_number = patch.jerseyNumber
      if (patch.hand !== undefined) row.batting_hand = patch.hand
      if (patch.appearance !== undefined) row.appearance = patch.appearance
      const { data, error } = await sb.from('players').update(row).eq('id', id).select('*').single()
      fail(error, 'Updating player')
      return toPlayer(data as PlayerRow)
    },
    async deletePlayer(id) {
      const { error } = await sb.from('players').delete().eq('id', id)
      fail(error, 'Deleting player')
    },

    async listWordLists(playerId) {
      const { data, error } = await sb
        .from('word_lists').select(LIST_SELECT).eq('player_id', playerId).order('week_start', { ascending: false })
      fail(error, 'Loading lists')
      return (data as unknown as ListRow[]).map(toList)
    },
    getWordList: getList,
    async createWordList(playerId, input) {
      const { data, error } = await sb
        .from('word_lists')
        .insert({ player_id: playerId, title: input.title, week_start: input.weekStart })
        .select('id')
        .single()
      fail(error, 'Creating list')
      const id = (data as { id: string }).id
      await insertWords(id, input.words)
      return (await getList(id))!
    },
    async updateWordList(id, patch) {
      const row: Partial<ListRow> = {}
      if (patch.title !== undefined) row.title = patch.title
      if (patch.weekStart !== undefined) row.week_start = patch.weekStart
      if (Object.keys(row).length) {
        const { error } = await sb.from('word_lists').update(row).eq('id', id)
        fail(error, 'Updating list')
      }
      if (patch.words !== undefined) {
        const { error } = await sb.from('words').delete().eq('list_id', id)
        fail(error, 'Replacing words')
        await insertWords(id, patch.words)
      }
      return (await getList(id))!
    },
    async setActiveList(playerId, listId) {
      const { error } = await sb.rpc('set_active_list', { p_player_id: playerId, p_list_id: listId })
      fail(error, 'Setting active list')
    },
    async deleteWordList(id) {
      const { error } = await sb.from('word_lists').delete().eq('id', id)
      fail(error, 'Deleting list')
    },

    async createGame(input: NewGame) {
      const { data, error } = await sb
        .from('games')
        .insert({ player_id: input.playerId, list_id: input.listId, mode: input.mode, warnings: input.warnings })
        .select('id')
        .single()
      fail(error, 'Creating game')
      const id = (data as { id: string }).id
      const { error: e2 } = await sb.from('game_words').insert(
        input.words.map((w) => ({
          game_id: id, position: w.position, text: w.text, sentence: w.sentence, source: w.source, source_word_id: w.sourceWordId,
        })),
      )
      fail(e2, 'Saving game words')
      return (await this.getGame(id))!
    },
    async recordAttempt(gameId, a: StoredAttempt) {
      const { error } = await sb.rpc('record_attempt', {
        p_game_id: gameId, p_position: a.position, p_attempt_number: a.attemptNumber, p_text: a.text,
        p_correct: a.correct, p_outcome: a.outcome,
      })
      fail(error, 'Saving attempt')
    },
    async completeGame(gameId, summary) {
      const { error } = await sb
        .from('games')
        .update({ status: 'complete', summary, completed_at: new Date().toISOString() })
        .eq('id', gameId)
        .eq('status', 'in_progress')
      fail(error, 'Completing game')
    },
    async getGame(id) {
      const { data, error } = await sb.from('games').select(GAME_SELECT).eq('id', id).maybeSingle()
      fail(error, 'Loading game')
      return data ? toGame(data as unknown as GameRow) : null
    },
    async findInProgressGame(playerId) {
      const { data, error } = await sb
        .from('games').select(GAME_SELECT).eq('player_id', playerId).eq('status', 'in_progress')
        .order('started_at', { ascending: false }).limit(1).maybeSingle()
      fail(error, 'Loading game')
      return data ? toGame(data as unknown as GameRow) : null
    },
    async listGames(playerId, filter: GameFilter = {}) {
      let q = sb.from('games').select(GAME_SELECT).eq('player_id', playerId).order('started_at', { ascending: false })
      if (filter.mode) q = q.eq('mode', filter.mode)
      if (filter.listId) q = q.eq('list_id', filter.listId)
      if (filter.status) q = q.eq('status', filter.status)
      const { data, error } = await q
      fail(error, 'Loading games')
      return (data as unknown as GameRow[]).map(toGame)
    },

    async hasParentPin() {
      const { data, error } = await sb.rpc('has_parent_pin')
      fail(error, 'Checking PIN')
      return Boolean(data)
    },
    async setParentPin(pin) {
      const { error } = await sb.rpc('set_parent_pin', { pin })
      fail(error, 'Saving PIN')
    },
    async verifyParentPin(pin) {
      const { data, error } = await sb.rpc('verify_parent_pin', { pin })
      fail(error, 'Checking PIN')
      return Boolean(data)
    },
    async deleteAccount() {
      const { error } = await sb.rpc('delete_my_account')
      fail(error, 'Deleting account')
    },
  }
}
