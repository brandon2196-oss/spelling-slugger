/**
 * Word grading. The ONLY rule: the whole submitted word either matches or it does not.
 * Letters are never graded individually.
 */

const APOSTROPHES = /[‘’ʼ′]/g // ‘ ’ ʼ ′
const DASHES = /[‐‑‒–—]/g // ‐ ‑ ‒ – —

/** Lowercase, trim, collapse inner whitespace, straighten apostrophes and dashes. */
export function normalize(s: string): string {
  return s
    .replace(APOSTROPHES, "'")
    .replace(DASHES, '-')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

export function isBlank(s: string): boolean {
  return s.trim().length === 0
}

export function isCorrect(submitted: string, target: string): boolean {
  return normalize(submitted) === normalize(target)
}
