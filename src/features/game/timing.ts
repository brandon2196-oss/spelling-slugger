import type { Difficulty } from '../../engine/types'

/** 0 when motion should be skipped (tests, reduced-motion users), otherwise 1. */
export function motionScale(): number {
  if (import.meta.env.VITE_NO_ANIMATION === '1') return 0
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0.25
  return 1
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms * motionScale()))

/** How much longer the breath before an at-bat is for this word. Only hard words slow down. */
export function paceMultiplier(difficulty: Difficulty): number {
  return difficulty === 'hard' ? 1.5 : 1
}

/** Extra ms to hold before the next at-bat, on top of the base breath, for its word's difficulty. */
export function breathExtraMs(baseMs: number, difficulty: Difficulty | undefined): number {
  return difficulty ? baseMs * (paceMultiplier(difficulty) - 1) : 0
}
