/** Season record (fun-overhaul brief 6.3). Pure. Only completed weekly games with a result count. */
import type { GameRecord } from '../data/types'

export interface SeasonRecord {
  wins: number
  losses: number
  /** Positive: won N straight. Negative: lost N straight. 0: no counted games. */
  streak: number
  /** Newest last, at most five. */
  lastFive: ('win' | 'loss')[]
}

type Countable = Pick<GameRecord, 'mode' | 'status' | 'result' | 'startedAt' | 'completedAt'>

/** Results of the counted games (completed weekly games with a result), oldest first. */
export function countedResults(games: readonly Countable[]): ('win' | 'loss')[] {
  return games
    .filter((g) => g.mode === 'weekly' && g.status === 'complete' && (g.result === 'win' || g.result === 'loss'))
    .sort((a, b) => (a.completedAt ?? a.startedAt).localeCompare(b.completedAt ?? b.startedAt))
    .map((g) => g.result as 'win' | 'loss')
}

export function seasonRecord(games: readonly Countable[]): SeasonRecord {
  const counted = countedResults(games)
  const wins = counted.filter((r) => r === 'win').length
  let streak = 0
  const last = counted[counted.length - 1]
  for (let i = counted.length - 1; i >= 0 && counted[i] === last; i--) streak += last === 'win' ? 1 : -1
  return { wins, losses: counted.length - wins, streak, lastFive: counted.slice(-5) }
}

/** "12 and 7, won 3 straight". '' before the first counted game. */
export function recordLine(r: SeasonRecord): string {
  if (r.wins + r.losses === 0) return ''
  const base = `${r.wins} and ${r.losses}`
  const n = Math.abs(r.streak)
  if (n < 2) return base
  return `${base}, ${r.streak > 0 ? 'won' : 'lost'} ${n} straight`
}
