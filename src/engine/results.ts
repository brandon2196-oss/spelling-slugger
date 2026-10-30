/** End-of-game summary (spec §12). Pure derivation from GameState. */
import type { GameState, Tallies, WordSource } from './types'

export interface SourceBreakdown {
  total: number
  firstTry: number
  missed: number
}

export interface GameSummary extends Tallies {
  /** 0–100, rounded to an integer. */
  firstTryAccuracy: number
  current: SourceBreakdown
  review: SourceBreakdown
  missedWords: string[]
}

function breakdown(state: GameState, source: WordSource): SourceBreakdown {
  const words = state.words.filter((w) => w.source === source)
  const positions = new Set(words.map((w) => w.position))
  const atBats = state.atBats.filter((ab) => positions.has(ab.position) && ab.outcome !== null)
  return {
    total: words.length,
    firstTry: atBats.filter((ab) => ab.outcome !== 'strikeout' && ab.attempts.length === 1).length,
    missed: atBats.filter((ab) => ab.outcome === 'strikeout').length,
  }
}

export function summarize(state: GameState): GameSummary {
  const attempted = state.atBats.filter((ab) => ab.outcome !== null).length
  const firstTryAccuracy = attempted === 0 ? 0 : Math.round((state.tallies.firstTry / attempted) * 100)
  const byPosition = new Map(state.words.map((w) => [w.position, w.text]))
  const missedWords = state.atBats
    .filter((ab) => ab.outcome === 'strikeout')
    .map((ab) => byPosition.get(ab.position) ?? '')
  return {
    ...state.tallies,
    firstTryAccuracy,
    current: breakdown(state, 'current'),
    review: breakdown(state, 'review'),
    missedWords,
  }
}
