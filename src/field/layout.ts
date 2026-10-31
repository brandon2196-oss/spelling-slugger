/**
 * Field geometry and base running, pure and testable. The view is from behind home plate: home at the bottom,
 * second base at the top, first base to the viewer's RIGHT, third to the LEFT.
 */
import type { Bases, Outcome } from '../engine/types'

export interface Point {
  x: number
  y: number
}

/** Reference 320x240 base geometry; the cartoon manifest scales it to its default coordinates. */
export const FIELD = {
  width: 320,
  height: 240,
  home: { x: 160, y: 212 },
  first: { x: 228, y: 164 },
  second: { x: 160, y: 118 },
  third: { x: 92, y: 164 },
  mound: { x: 160, y: 170 },
} as const

export type Base = 'home' | 'first' | 'second' | 'third'
export type Destination = Base | 'score'

const ORDER: Base[] = ['home', 'first', 'second', 'third']

/** Which runner went where, derived from the engine's before/after bases. */
export function basesDiff(before: Bases, after: Bases, outcome: Outcome, runsScored: number): { from: Base; to: Destination }[] {
  if (outcome === 'strikeout') return []
  const moves: { from: Base; to: Destination }[] = []
  const occupied: Base[] = (['third', 'second', 'first'] as const).filter((b) => before[b])
  if (outcome === 'single' || outcome === 'double' || outcome === 'homeRun') {
    const n = outcome === 'single' ? 1 : outcome === 'double' ? 2 : 4
    for (const b of occupied) {
      const idx = ORDER.indexOf(b) + n
      moves.push({ from: b, to: idx >= 4 ? 'score' : ORDER[idx]! })
    }
    moves.push({ from: 'home', to: n >= 4 ? 'score' : ORDER[n]! })
    return moves
  }
  // walk: forced chain from first
  if (before.first) {
    if (before.second) {
      if (before.third) moves.push({ from: 'third', to: 'score' })
      moves.push({ from: 'second', to: 'third' })
    }
    moves.push({ from: 'first', to: 'second' })
  }
  moves.push({ from: 'home', to: 'first' })
  void after
  void runsScored
  return moves
}

/**
 * Horizontal scale for a runner on one leg. Packed run/trot art faces LEFT, so a rightward leg flips (-1).
 * Set outright per leg; never multiplied with the lefty batter mirror (runners are their own figs).
 */
export function runnerScaleX(from: Point, to: Point): 1 | -1 {
  return to.x > from.x ? -1 : 1
}
