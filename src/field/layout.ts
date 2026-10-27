/**
 * Field geometry, pure and testable. The view is from behind home plate: home at the bottom,
 * second base at the top, first base to the viewer's RIGHT, third to the LEFT.
 */
import type { Bases, Hand, Outcome } from '../engine/types'

export interface Point {
  x: number
  y: number
}

export const FIELD = {
  width: 800,
  height: 600,
  home: { x: 400, y: 525 },
  first: { x: 565, y: 410 },
  second: { x: 400, y: 295 },
  third: { x: 235, y: 410 },
  mound: { x: 400, y: 430 },
} as const

export type Base = 'home' | 'first' | 'second' | 'third'
export type Destination = Base | 'score'

const ORDER: Base[] = ['home', 'first', 'second', 'third']
const BOX_OFFSET = 42

export function basePoint(b: Base): Point {
  const p = FIELD[b]
  return { x: p.x, y: p.y }
}

/**
 * A left-handed batter stands in the first-base-side box (viewer's right) and faces the pitcher;
 * the figure is the right-handed drawing mirrored. Right-handed: third-base side, upright.
 */
export function batterPlacement(hand: Hand): { x: number; y: number; flipX: boolean } {
  return hand === 'L'
    ? { x: FIELD.home.x + BOX_OFFSET, y: FIELD.home.y - 6, flipX: true }
    : { x: FIELD.home.x - BOX_OFFSET, y: FIELD.home.y - 6, flipX: false }
}

/** Waypoints a runner passes through going from `from` to `to`, excluding the start. */
export function runnerPath(from: Base, to: Destination): Point[] {
  const start = ORDER.indexOf(from)
  const end = to === 'score' ? 4 : ORDER.indexOf(to)
  const out: Point[] = []
  for (let i = start + 1; i <= end; i++) out.push(basePoint(ORDER[i % 4]!))
  return out
}

/** Which runner went where, derived from the engine's before/after bases. */
export function basesDiff(before: Bases, after: Bases, outcome: Outcome, runsScored: number): { from: Base; to: Destination }[] {
  if (outcome === 'strikeout') return []
  const moves: { from: Base; to: Destination }[] = []
  const occupied: Base[] = (['third', 'second', 'first'] as const).filter((b) => before[b])
  if (outcome === 'single' || outcome === 'double') {
    const n = outcome === 'single' ? 1 : 2
    for (const b of occupied) {
      const idx = ORDER.indexOf(b) + n
      moves.push({ from: b, to: idx >= 4 ? 'score' : ORDER[idx]! })
    }
    moves.push({ from: 'home', to: ORDER[n]! })
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
