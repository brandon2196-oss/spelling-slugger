/**
 * Field geometry, pure and testable. The view is from behind home plate: home at the bottom,
 * second base at the top, first base to the viewer's RIGHT, third to the LEFT.
 */
import type { Bases, Hand, Outcome } from '../engine/types'

export interface Point {
  x: number
  y: number
}

/** The stadium renders at a true 16-bit resolution and is scaled up with hard pixels. */
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
const BOX_OFFSET = 26

export function basePoint(b: Base): Point {
  const p = FIELD[b]
  return { x: p.x, y: p.y }
}

/**
 * Seen from behind the plate, a left-handed batter stands in the first-base-side box (viewer's
 * right) and faces the plate, i.e. faces LEFT, which is how the sprite is drawn. A right-handed
 * batter stands in the third-base-side box and is the mirror image (flipX).
 */
export function batterPlacement(hand: Hand): { x: number; y: number; flipX: boolean } {
  return hand === 'L'
    ? { x: FIELD.home.x + BOX_OFFSET, y: FIELD.home.y + 2, flipX: false }
    : { x: FIELD.home.x - BOX_OFFSET, y: FIELD.home.y + 2, flipX: true }
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

/** The dirt infield: a diamond `pad` pixels outside the four bases, on integer coordinates. */
export function infieldDiamond(pad = 14): Point[] {
  return [
    { x: FIELD.second.x, y: FIELD.second.y - pad },
    { x: FIELD.first.x + pad, y: FIELD.first.y },
    { x: FIELD.home.x, y: FIELD.home.y + pad },
    { x: FIELD.third.x - pad, y: FIELD.third.y },
  ]
}

/** Mowing stripes from `top` to `bottom` (exclusive), `step` rows each, light first. */
export function grassStripes(top: number, bottom: number, step = 16): { y: number; h: number; light: boolean }[] {
  const out: { y: number; h: number; light: boolean }[] = []
  for (let y = top, i = 0; y < bottom; y += step, i++) out.push({ y, h: Math.min(step, bottom - y), light: i % 2 === 0 })
  return out
}
