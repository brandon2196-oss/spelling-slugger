/**
 * Rebuild a GameState from the persisted attempt log. The log is the source of truth for a
 * saved game; replaying it through the reducer makes resume deterministic and duplicate-proof.
 */
import { createGame, submitAnswer } from './game'
import type { GameState, GameWord } from './types'

export interface ReplayAttempt {
  position: number
  attemptNumber: number
  text: string
}

export function rebuild(words: GameWord[], attempts: ReplayAttempt[]): GameState {
  const seen = new Set<string>()
  const ordered = [...attempts]
    .sort((a, b) => a.position - b.position || a.attemptNumber - b.attemptNumber)
    .filter((a) => {
      const key = `${a.position}:${a.attemptNumber}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  let state = createGame(words)
  for (const a of ordered) {
    if (a.position !== state.index) continue // stale row for a word already resolved (or not yet reached)
    state = submitAnswer(state, a.text).state
  }
  return state
}
