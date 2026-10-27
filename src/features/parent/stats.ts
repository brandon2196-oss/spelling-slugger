/** Pure aggregations over completed games for the parent dashboard. */
import type { GameRecord } from '../../data/types'
import { normalize } from '../../engine/grade'

export interface WordStat {
  text: string
  seen: number
  firstTry: number
  missed: number
  strikes: number
  lastSeen: string
}

const completed = (games: GameRecord[]) => games.filter((g) => g.status === 'complete')
const official = (games: GameRecord[]) => completed(games).filter((g) => g.mode === 'weekly')

export function wordStats(games: GameRecord[]): WordStat[] {
  const map = new Map<string, WordStat>()
  for (const g of completed(games)) {
    for (const w of g.words) {
      const attempts = g.attempts.filter((a) => a.position === w.position)
      const final = attempts.find((a) => a.outcome !== null)
      if (!final) continue // never resolved (abandoned mid-word)
      const key = normalize(w.text)
      const s = map.get(key) ?? { text: w.text, seen: 0, firstTry: 0, missed: 0, strikes: 0, lastSeen: g.startedAt }
      s.seen += 1
      s.strikes += attempts.filter((a) => !a.correct).length
      if (final.outcome === 'double') s.firstTry += 1
      if (final.outcome === 'strikeout') s.missed += 1
      if (g.startedAt > s.lastSeen) s.lastSeen = g.startedAt
      map.set(key, s)
    }
  }
  return [...map.values()]
}

/** Struck out at least `min` times; worst first. */
export function frequentlyMissed(stats: WordStat[], min = 1): WordStat[] {
  return stats.filter((s) => s.missed >= min).sort((a, b) => b.missed - a.missed || b.strikes - a.strikes || a.text.localeCompare(b.text))
}

/** Seen at least twice, never struck out, first try at least three times in four. */
export function mastered(stats: WordStat[]): WordStat[] {
  return stats.filter((s) => s.seen >= 2 && s.missed === 0 && s.firstTry / s.seen >= 0.75).sort((a, b) => a.text.localeCompare(b.text))
}

export interface WeekPoint {
  listId: string
  weekStart: string
  bestRuns: number
  firstTryAccuracy: number
  games: number
}

function firstTryPct(games: GameRecord[]): number {
  let first = 0
  let total = 0
  for (const g of games) {
    const finals = g.attempts.filter((a) => a.outcome !== null)
    total += finals.length
    first += finals.filter((a) => a.outcome === 'double').length
  }
  return total === 0 ? 0 : Math.round((first / total) * 100)
}

/** One point per list that has at least one completed weekly game, oldest week first. */
export function weeklyTrend(games: GameRecord[], lists: { id: string; weekStart: string }[]): WeekPoint[] {
  const weekly = official(games)
  return lists
    .map((l) => {
      const gs = weekly.filter((g) => g.listId === l.id)
      if (gs.length === 0) return null
      return {
        listId: l.id,
        weekStart: l.weekStart,
        bestRuns: Math.max(...gs.map((g) => g.summary?.runs ?? 0)),
        firstTryAccuracy: firstTryPct(gs),
        games: gs.length,
      }
    })
    .filter((p): p is WeekPoint => p !== null)
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}

/** First-try percentage over review words only; null when no review word has been played. */
export function reviewRetention(games: GameRecord[]): number | null {
  let first = 0
  let total = 0
  for (const g of completed(games)) {
    for (const w of g.words) {
      if (w.source !== 'review') continue
      const final = g.attempts.find((a) => a.position === w.position && a.outcome !== null)
      if (!final) continue
      total += 1
      if (final.outcome === 'double') first += 1
    }
  }
  return total === 0 ? null : Math.round((first / total) * 100)
}

export function totals(games: GameRecord[]): { games: number; practice: number; highScore: number; firstTryRate: number } {
  const weekly = official(games)
  const practice = completed(games).filter((g) => g.mode !== 'weekly')
  return {
    games: weekly.length,
    practice: practice.length,
    highScore: weekly.length ? Math.max(...weekly.map((g) => g.summary?.runs ?? 0)) : 0,
    firstTryRate: firstTryPct(weekly),
  }
}
