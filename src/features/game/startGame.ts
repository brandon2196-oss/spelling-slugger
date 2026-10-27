/** Builds and persists new games for each mode, and finds unfinished ones. */
import { findPrecedingList } from '../../data/previous-week'
import type { GameRecord, Store } from '../../data/types'
import { normalize } from '../../engine/grade'
import { practiceWords, selectGameWords, type SourceWord } from '../../engine/selection'
import type { GameWord } from '../../engine/types'

const toSource = (list: { words: { id: string; text: string; sentence: string | null }[] }): SourceWord[] =>
  list.words.map((w) => ({ id: w.id, text: w.text, sentence: w.sentence }))

export async function startWeeklyGame(store: Store, playerId: string, listId: string, rng: () => number = Math.random): Promise<GameRecord> {
  const lists = await store.listWordLists(playerId)
  const list = lists.find((l) => l.id === listId)
  if (!list) throw new Error('LIST_NOT_FOUND')
  const previous = findPrecedingList(lists, list)
  const { words, warnings } = selectGameWords(toSource(list), previous ? toSource(previous) : null, rng)
  return store.createGame({ playerId, listId, mode: 'weekly', words, warnings })
}

export async function startPracticeGame(store: Store, playerId: string, listId: string, rng: () => number = Math.random): Promise<GameRecord> {
  const list = await store.getWordList(listId)
  if (!list) throw new Error('LIST_NOT_FOUND')
  return store.createGame({ playerId, listId, mode: 'practice', words: practiceWords(toSource(list), rng), warnings: [] })
}

export const MISSED_WORDS_MAX = 20

/** Words the child has ever gotten wrong, worst first, from completed games. */
export async function startMissedWordsGame(store: Store, playerId: string, rng: () => number = Math.random): Promise<GameRecord> {
  const games = await store.listGames(playerId, { status: 'complete' })
  const stats = new Map<string, { word: GameWord; wrong: number; lastSeen: string }>()
  for (const g of games) {
    const byPos = new Map(g.words.map((w) => [w.position, w]))
    for (const a of g.attempts) {
      if (a.correct) continue
      const w = byPos.get(a.position)
      if (!w) continue
      const key = normalize(w.text)
      const s = stats.get(key) ?? { word: w, wrong: 0, lastSeen: g.startedAt }
      s.wrong += 1
      if (g.startedAt > s.lastSeen) s.lastSeen = g.startedAt
      stats.set(key, s)
    }
  }
  const ranked = [...stats.values()].sort((a, b) => b.wrong - a.wrong || (a.lastSeen < b.lastSeen ? 1 : -1)).slice(0, MISSED_WORDS_MAX)
  if (ranked.length === 0) throw new Error('NO_MISSED_WORDS')
  const words = practiceWords(
    ranked.map((s, i) => ({ id: s.word.sourceWordId ?? `missed-${i}`, text: s.word.text, sentence: s.word.sentence })),
    rng,
  )
  return store.createGame({ playerId, listId: null, mode: 'missed', words, warnings: [] })
}

export function resumeOrNull(store: Store, playerId: string): Promise<GameRecord | null> {
  return store.findInProgressGame(playerId)
}
