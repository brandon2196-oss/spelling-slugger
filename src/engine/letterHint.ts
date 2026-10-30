import { normalize } from './grade'

/** One typed character and whether it sits in the right spot. Display hint only; scoring stays whole-word. */
export interface LetterMark {
  char: string
  ok: boolean
}

/**
 * Grade a try letter by letter against the answer: right only when the same index matches.
 * Extra letters are wrong. No "wrong spot" state, and untyped letters are never returned,
 * so the hint can't reveal the word.
 */
export function gradeLetters(typed: string, correct: string): LetterMark[] {
  const shown = Array.from(typed.replace(/[‘’ʼ′]/g, "'").replace(/[‐‑‒–—]/g, '-').trim().replace(/\s+/g, ' '))
  const got = Array.from(normalize(typed))
  const want = Array.from(normalize(correct))
  return shown.map((char, i) => ({ char, ok: got[i] !== undefined && got[i] === want[i] }))
}
