/** Shared engine types. The engine is pure TypeScript: no React, no DOM, no I/O. */

export type Hand = 'L' | 'R'

export type Outcome = 'homeRun' | 'double' | 'single' | 'walk' | 'strikeout'

export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard']

export type WordSource = 'current' | 'review'

export interface GameWord {
  /** 0-based slot in this game's order. */
  position: number
  text: string
  sentence: string | null
  source: WordSource
  difficulty: Difficulty
  /** Id of the list word this came from, kept for history only (no FK). */
  sourceWordId: string | null
}

export interface Bases {
  first: boolean
  second: boolean
  third: boolean
}

export interface Attempt {
  attemptNumber: 1 | 2 | 3
  text: string
  correct: boolean
}

export interface AtBat {
  position: number
  inning: number
  attempts: Attempt[]
  strikes: number
  outcome: Outcome | null
  runsScored: number
}

export interface Tallies {
  runs: number
  hits: number
  homeRuns: number
  singles: number
  doubles: number
  walks: number
  strikeouts: number
  totalStrikes: number
  firstTry: number
  secondTry: number
  thirdTry: number
  missed: number
}

export interface GameState {
  words: GameWord[]
  /** Index of the word currently at bat. Equals words.length once complete. */
  index: number
  strikes: number
  outs: number
  inning: number
  bases: Bases
  tallies: Tallies
  atBats: AtBat[]
  status: 'active' | 'complete'
  /** Seeds the Visitors (opponent.ts). '' in engine-only tests. */
  gameId: string
  /** Visitors runs per inning, filled at inning end (and at game end). Never mid-inning. */
  visitors: number[]
}

/** What happened when the child submitted a word. The UI animates FROM this; it never decides outcomes. */
export type SubmitEvent =
  | { kind: 'ignored'; reason: 'blank' | 'complete' | 'busy' }
  | { kind: 'strike'; strike: 1 | 2; attemptsSoFar: Attempt[] }
  | {
      kind: 'at-bat-complete'
      outcome: Outcome
      attempts: Attempt[]
      runsScored: number
      basesBefore: Bases
      basesAfter: Bases
      outsAfter: number
      inningEnded: boolean
      nextInning: number
      gameOver: boolean
      correctSpelling: string
      word: GameWord
      /** Visitors runs revealed with this play (inning end or game end), else null. */
      visitorRunsThisInning: number | null
      /** Visitors total before this play's reveal. */
      visitorsBefore: number
      /** null unless gameOver. A tie is a win. */
      gameResult: 'win' | 'loss' | null
    }
