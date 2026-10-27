import type { WordList } from './types'

/**
 * How far back "the immediately preceding week" may reach. A gap longer than this means last
 * week's list was never entered, and spec §6 says not to fall back to an older week.
 */
export const MAX_PRECEDING_GAP_DAYS = 21

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

export function findPrecedingList(lists: WordList[], target: WordList): WordList | null {
  const earlier = lists
    .filter((l) => l.id !== target.id && l.weekStart < target.weekStart)
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
  const candidate = earlier[0]
  if (!candidate) return null
  return daysBetween(candidate.weekStart, target.weekStart) > MAX_PRECEDING_GAP_DAYS ? null : candidate
}
