/** 0 when motion should be skipped (tests, reduced-motion users), otherwise 1. */
export function motionScale(): number {
  if (import.meta.env.VITE_NO_ANIMATION === '1') return 0
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0.25
  return 1
}

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms * motionScale()))
