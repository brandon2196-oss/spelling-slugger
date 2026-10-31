/**
 * The Visitors (fun-overhaul brief section 6.1). Pure and deterministic from the game id plus the
 * attempt log, so replay, resume and the server all agree on the line score.
 *
 * Model: in each inning the Visitors send up one batter per word the kid saw that inning, at the
 * same difficulty, and each batter "spells" at the typical kid rate (VISITOR_RATES). Ties go to the
 * kid and the Visitors never get a strikeout-free extra inning, so a typical kid wins about 65 percent. Outcomes and base running use the same rules as the kid (outcomeFor, advance),
 * so a Hard-heavy list makes the Visitors better too and the game stays close.
 * The Visitors score at inning end only; a perfect one-inning game still gets one Visitors inning.
 */
import { EMPTY_BASES, advance } from './bases'
import { outcomeFor } from './game'
import { seededRng } from './rng'
import type { Bases, Difficulty, GameState, Outcome } from './types'

/** Chance a Visitors batter gets it on try 1, 2, 3 (the rest strike out). Tuned in opponent.test.ts (about 65 percent kid wins, median margin 1). */
export const VISITOR_RATES = { first: 0.7, second: 0.2, third: 0.05 } as const

/** FNV-1a: a stable 32-bit seed from a string. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function visitorOutcome(r: number, d: Difficulty): Outcome {
  const { first, second, third } = VISITOR_RATES
  if (r < first) return outcomeFor(1, d)
  if (r < first + second) return outcomeFor(2, d)
  if (r < first + second + third) return outcomeFor(3, d)
  return 'strikeout'
}

/** Runs the Visitors score in `inning`, one batter per entry in `difficultyMix`. */
export function visitorRuns(gameId: string, inning: number, difficultyMix: Difficulty[]): number {
  const rng = seededRng(hashSeed(`${gameId}:visitors:${inning}`))
  let bases: Bases = { ...EMPTY_BASES }
  let runs = 0
  for (const d of difficultyMix) {
    const step = advance(bases, visitorOutcome(rng(), d))
    bases = step.bases
    runs += step.runs
  }
  return runs
}

/** Difficulties of the words the kid finished in `inning`. */
export function inningMix(state: GameState, inning: number): Difficulty[] {
  const byPos = new Map(state.words.map((w) => [w.position, w.difficulty ?? 'medium']))
  return state.atBats
    .filter((ab) => ab.inning === inning && ab.outcome !== null)
    .map((ab) => byPos.get(ab.position) ?? 'medium')
}

/** Last inning whose Visitors half has been revealed: every inning before the current one, plus the current one once the game is over. */
function lastRevealed(state: GameState): number {
  return state.status === 'complete' ? state.inning : state.inning - 1
}

/** Visitors runs per completed inning (index 0 is inning 1). Never includes the inning being played. */
export function visitorScore(state: GameState, gameId: string): number[] {
  const out: number[] = []
  for (let inning = 1; inning <= lastRevealed(state); inning++) out.push(visitorRuns(gameId, inning, inningMix(state, inning)))
  return out
}

export type GameResult = 'win' | 'loss'

/** A tie counts as a win for the kid. null until the game is over. */
export function gameResult(state: GameState, gameId: string): GameResult | null {
  if (state.status !== 'complete') return null
  const visitors = visitorScore(state, gameId).reduce((a, b) => a + b, 0)
  return state.tallies.runs >= visitors ? 'win' : 'loss'
}
