/** Builds the word set for a game. Review words are added at list save (see weekList.ts). */
import { normalize } from './grade'
import { shuffle } from './rng'
import type { Difficulty, GameWord, WordSource } from './types'

export interface SourceWord {
  id: string
  text: string
  sentence: string | null
  source: WordSource
  difficulty: Difficulty
}

/** Remove case/punctuation duplicates, keeping first occurrence. */
function distinct(words: SourceWord[]): SourceWord[] {
  const seen = new Set<string>()
  const out: SourceWord[] = []
  for (const w of words) {
    const key = normalize(w.text)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(w)
  }
  return out
}

function toGameWords(items: SourceWord[]): GameWord[] {
  return items.map((w, position) => ({
    position, text: w.text, sentence: w.sentence, source: w.source, difficulty: w.difficulty, sourceWordId: w.id,
  }))
}

/** The weekly game: the saved list (already 15 + review) shuffled. Never adds words. */
export function weeklyWords(list: SourceWord[], rng: () => number): GameWord[] {
  return toGameWords(shuffle(distinct(list), rng))
}

export function practiceWords(list: SourceWord[], rng: () => number): GameWord[] {
  return toGameWords(shuffle(distinct(list), rng).map((w) => ({ ...w, source: 'current' as const })))
}
