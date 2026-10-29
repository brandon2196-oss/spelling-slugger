/** Builds the word set for a game (spec §6 "Weekly Review Words"). */
import { normalize } from './grade'
import { shuffle } from './rng'
import type { Difficulty, GameWord, WordSource } from './types'

export interface SourceWord {
  id: string
  text: string
  sentence: string | null
  difficulty?: Difficulty
}

export interface Selection {
  words: GameWord[]
  warnings: string[]
}

export const REVIEW_COUNT = 5

function toGameWords(items: { word: SourceWord; source: WordSource }[]): GameWord[] {
  return items.map(({ word, source }, position) => ({
    position,
    text: word.text,
    sentence: word.sentence,
    source,
    difficulty: word.difficulty ?? 'medium',
    sourceWordId: word.id,
  }))
}

/** Remove case/punctuation duplicates, keeping first occurrence. */
function distinct(words: SourceWord[], exclude: Set<string> = new Set()): SourceWord[] {
  const seen = new Set(exclude)
  const out: SourceWord[] = []
  for (const w of words) {
    const key = normalize(w.text)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(w)
  }
  return out
}

export function selectGameWords(current: SourceWord[], previous: SourceWord[] | null, rng: () => number): Selection {
  const warnings: string[] = []
  const currentDistinct = distinct(current)
  const currentKeys = new Set(currentDistinct.map((w) => normalize(w.text)))

  let review: SourceWord[] = []
  if (previous === null) {
    warnings.push("No previous week's list was found, so this game uses only the current words.")
  } else {
    const eligible = distinct(previous, currentKeys)
    review = shuffle(eligible, rng).slice(0, REVIEW_COUNT)
    if (review.length < REVIEW_COUNT) {
      const n = review.length
      const total = currentDistinct.length + n
      warnings.push(
        `Only ${n} review word${n === 1 ? '' : 's'} from last week ${n === 1 ? 'was' : 'were'} available (words that also appear this week are skipped), so this game has ${total} words instead of ${currentDistinct.length + REVIEW_COUNT}.`,
      )
    }
  }

  const combined = shuffle(
    [
      ...currentDistinct.map((word) => ({ word, source: 'current' as const })),
      ...review.map((word) => ({ word, source: 'review' as const })),
    ],
    rng,
  )
  return { words: toGameWords(combined), warnings }
}

export function practiceWords(list: SourceWord[], rng: () => number): GameWord[] {
  return toGameWords(shuffle(distinct(list), rng).map((word) => ({ word, source: 'current' as const })))
}
