/** Builds a kid's weekly list at save time: the typed words plus up to 5 review words from last week. */
import type { NewWord } from '../data/types'
import { normalize } from './grade'
import { shuffle } from './rng'

export const REVIEW_COUNT = 5

export function buildWeekList(typed: NewWord[], previous: NewWord[] | null, rng: () => number): { words: NewWord[]; warnings: string[] } {
  const current: NewWord[] = typed.map((w) => ({ ...w, difficulty: w.difficulty ?? 'medium', source: 'current' }))
  if (previous === null) {
    return { words: current, warnings: ["No previous week's list was found, so this week has only the words you typed."] }
  }
  const seen = new Set(current.map((w) => normalize(w.text)))
  const eligible: NewWord[] = []
  for (const w of previous) {
    if ((w.source ?? 'current') !== 'current') continue
    const key = normalize(w.text)
    if (seen.has(key)) continue
    seen.add(key)
    eligible.push(w)
  }
  const review: NewWord[] = shuffle(eligible, rng)
    .slice(0, REVIEW_COUNT)
    .map((w) => ({ text: w.text, sentence: w.sentence, difficulty: 'easy', source: 'review' }))
  const warnings: string[] = []
  if (review.length < REVIEW_COUNT) {
    const n = review.length
    warnings.push(`Only ${n} review word${n === 1 ? '' : 's'} from last week ${n === 1 ? 'was' : 'were'} available, so this week has ${current.length + n} words.`)
  }
  return { words: [...current, ...review], warnings }
}
