import type { Bases, Outcome } from './types'

export const EMPTY_BASES: Bases = { first: false, second: false, third: false }

export function runnersOn(bases: Bases): number {
  return Number(bases.first) + Number(bases.second) + Number(bases.third)
}

/** Represent bases as an array indexed 0=first, 1=second, 2=third. Index 3 = home (scores). */
function toArray(b: Bases): boolean[] {
  return [b.first, b.second, b.third]
}

function fromArray(a: boolean[]): Bases {
  return { first: a[0] ?? false, second: a[1] ?? false, third: a[2] ?? false }
}

/** Every runner (and the batter, from "base 0 - 1") advances exactly `n` bases. */
function advanceAll(bases: Bases, n: number): { bases: Bases; runs: number } {
  const before = toArray(bases)
  const after = [false, false, false]
  let runs = 0
  before.forEach((occupied, i) => {
    if (!occupied) return
    const dest = i + n
    if (dest >= 3) runs += 1
    else after[dest] = true
  })
  // Batter: starts at "home" (index -1) and ends at n - 1.
  if (n <= 3) after[n - 1] = true
  else runs += 1
  return { bases: fromArray(after), runs }
}

/** Walk: batter to first; runners move only when the base behind them is being filled. */
function walk(bases: Bases): { bases: Bases; runs: number } {
  const a = toArray(bases)
  let runs = 0
  if (a[0]) {
    if (a[1]) {
      if (a[2]) runs = 1 // bases loaded: runner on third forced home
      a[2] = true // runner on second forced to third
    }
    a[1] = true // runner on first forced to second
  }
  a[0] = true // batter takes first
  return { bases: fromArray(a), runs }
}

export function advance(bases: Bases, outcome: Outcome): { bases: Bases; runs: number } {
  switch (outcome) {
    case 'single':
      return advanceAll(bases, 1)
    case 'double':
      return advanceAll(bases, 2)
    case 'walk':
      return walk(bases)
    case 'homeRun':
      return advanceAll(bases, 4)
    case 'strikeout':
      return { bases: { ...bases }, runs: 0 }
  }
}
