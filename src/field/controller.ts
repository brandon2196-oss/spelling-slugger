import type { Appearance } from '../data/types'
import type { Bases, Hand } from '../engine/types'

export interface PlayerLook {
  hand: Hand
  appearance: Appearance
  jerseyNumber: number
}

/**
 * What the game screen may ask the field to show. Every method animates something that the
 * engine has ALREADY decided; the field never changes the score.
 */
export interface FieldController {
  setPlayer(look: PlayerLook): void
  setBases(b: Bases): void
  playPitch(): Promise<void>
  playStrike(n: 1 | 2 | 3): Promise<void>
  playHit(outcome: 'single' | 'double' | 'homeRun', before: Bases, after: Bases, runs: number): Promise<void>
  playWalk(before: Bases, after: Bases, runs: number): Promise<void>
  playInningEnd(nextInning: number): Promise<void>
  playGameOver(runs: number): Promise<void>
  banner(text: string, ms?: number): Promise<void>
}
