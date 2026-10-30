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

const RAMP_SCORE: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }
/** How far a word can drift from its band. Large enough that bands overlap (still mixed), small enough to trend. */
export const RAMP_JITTER = 1.25

/**
 * Mixed order that trends easy → hard: each word's sort key is its difficulty score plus uniform
 * jitter. Shuffled first so equal keys (e.g. an all-medium list) stay random.
 */
function ramp(words: SourceWord[], rng: () => number): SourceWord[] {
  return shuffle(words, rng)
    .map((w) => ({ w, key: RAMP_SCORE[w.difficulty] + (rng() * 2 - 1) * RAMP_JITTER }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.w)
}

/** The weekly game: the saved list (already 15 + review), ramped easy → hard. Never adds words. */
export function weeklyWords(list: SourceWord[], rng: () => number): GameWord[] {
  return toGameWords(ramp(distinct(list), rng))
}

export function practiceWords(list: SourceWord[], rng: () => number): GameWord[] {
  return toGameWords(shuffle(distinct(list), rng).map((w) => ({ ...w, source: 'current' as const })))
}
