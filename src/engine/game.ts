/**
 * The deterministic game reducer. Every rule in spec §8–§9 lives here and nowhere else.
 * `submitAnswer` is pure: same state + same text → same result, and the input is never mutated.
 */
import { EMPTY_BASES, advance } from './bases'
import { isBlank, isCorrect } from './grade'
import { inningMix, visitorRuns } from './opponent'
import type { Attempt, Difficulty, GameState, GameWord, Outcome, SubmitEvent, Tallies } from './types'

export type { SubmitEvent } from './types'

const OUTS_PER_INNING = 3
const MAX_ATTEMPTS = 3

const ZERO_TALLIES: Tallies = {
  runs: 0,
  hits: 0,
  singles: 0,
  doubles: 0,
  homeRuns: 0,
  walks: 0,
  strikeouts: 0,
  totalStrikes: 0,
  firstTry: 0,
  secondTry: 0,
  thirdTry: 0,
  missed: 0,
}

export function createGame(words: GameWord[], gameId = ''): GameState {
  return {
    words: words.map((w) => ({ ...w })),
    index: 0,
    strikes: 0,
    outs: 0,
    inning: 1,
    bases: { ...EMPTY_BASES },
    tallies: { ...ZERO_TALLIES },
    atBats: [],
    status: words.length === 0 ? 'complete' : 'active',
    gameId,
    visitors: [],
  }
}

export function currentWord(state: GameState): GameWord | null {
  return state.words[state.index] ?? null
}

const FIRST_TRY: Record<Difficulty, Exclude<Outcome, 'strikeout' | 'walk'>> = { easy: 'single', medium: 'double', hard: 'homeRun' }
const ONE_DOWN: Record<'homeRun' | 'double' | 'single', 'double' | 'single' | 'walk'> = { homeRun: 'double', double: 'single', single: 'walk' }

/** Outcome for a correct answer on attempt n given the word's difficulty. */
export function outcomeFor(n: 1 | 2 | 3, difficulty: Difficulty): Exclude<Outcome, 'strikeout'> {
  const first = FIRST_TRY[difficulty]
  if (n === 1) return first
  if (n === 2) return ONE_DOWN[first]
  return 'walk'
}

function tallyOutcome(t: Tallies, outcome: Outcome, attemptNumber: number, runs: number): Tallies {
  const next = { ...t, runs: t.runs + runs }
  switch (outcome) {
    case 'homeRun':
      next.homeRuns += 1
      next.hits += 1
      break
    case 'double':
      next.doubles += 1
      next.hits += 1
      break
    case 'single':
      next.singles += 1
      next.hits += 1
      break
    case 'walk':
      next.walks += 1
      break
    case 'strikeout':
      next.strikeouts += 1
      next.missed += 1
      break
  }
  if (outcome !== 'strikeout') {
    if (attemptNumber === 1) next.firstTry += 1
    else if (attemptNumber === 2) next.secondTry += 1
    else next.thirdTry += 1
  }
  return next
}

/** Attempts already made on the word currently at bat (kept in a trailing, unresolved AtBat). */
function openAtBat(state: GameState): Attempt[] {
  const last = state.atBats[state.atBats.length - 1]
  if (last && last.position === state.index && last.outcome === null) return last.attempts
  return []
}

export function submitAnswer(state: GameState, text: string): { state: GameState; event: SubmitEvent } {
  if (state.status === 'complete') return { state, event: { kind: 'ignored', reason: 'complete' } }
  if (isBlank(text)) return { state, event: { kind: 'ignored', reason: 'blank' } }

  const word = currentWord(state)
  if (!word) return { state, event: { kind: 'ignored', reason: 'complete' } }

  const priorAttempts = openAtBat(state)
  const attemptNumber = (priorAttempts.length + 1) as 1 | 2 | 3
  const correct = isCorrect(text, word.text)
  const attempts: Attempt[] = [...priorAttempts, { attemptNumber, text, correct }]
  const strikes = correct ? state.strikes : state.strikes + 1
  const totalStrikes = correct ? state.tallies.totalStrikes : state.tallies.totalStrikes + 1

  // Replace or append the in-progress at-bat record.
  const atBatsWithoutOpen = priorAttempts.length ? state.atBats.slice(0, -1) : state.atBats

  if (!correct && attemptNumber < MAX_ATTEMPTS) {
    const open = { position: word.position, inning: state.inning, attempts, strikes, outcome: null, runsScored: 0 }
    return {
      state: { ...state, strikes, tallies: { ...state.tallies, totalStrikes }, atBats: [...atBatsWithoutOpen, open] },
      event: { kind: 'strike', strike: attemptNumber as 1 | 2, attemptsSoFar: attempts },
    }
  }

  const outcome: Outcome = correct ? outcomeFor(attemptNumber, word.difficulty ?? 'medium') : 'strikeout'
  const { bases: basesAfter, runs } = advance(state.bases, outcome)
  let outs = outcome === 'strikeout' ? state.outs + 1 : state.outs
  let inning = state.inning
  let bases = basesAfter
  const nextIndex = state.index + 1
  const gameOver = nextIndex >= state.words.length
  const inningEnded = outs >= OUTS_PER_INNING

  if (inningEnded) {
    outs = 0
    bases = { ...EMPTY_BASES }
    if (!gameOver) inning += 1
  }

  const atBat = { position: word.position, inning: state.inning, attempts, strikes, outcome, runsScored: runs }
  const tallies = { ...tallyOutcome(state.tallies, outcome, attemptNumber, runs), totalStrikes }

  const atBatsAfter = [...atBatsWithoutOpen, atBat]
  // The Visitors bat at inning end (or game end), never mid-inning.
  const visitorRunsThisInning =
    inningEnded || gameOver ? visitorRuns(state.gameId, state.inning, inningMix({ ...state, atBats: atBatsAfter }, state.inning)) : null
  const visitors = visitorRunsThisInning === null ? state.visitors : [...state.visitors, visitorRunsThisInning]
  const visitorsBefore = state.visitors.reduce((a, b) => a + b, 0)
  const gameResult = gameOver ? (tallies.runs >= visitorsBefore + (visitorRunsThisInning ?? 0) ? 'win' : 'loss') : null

  const next: GameState = {
    ...state,
    visitors,
    index: nextIndex,
    strikes: 0,
    outs,
    inning,
    bases,
    tallies,
    atBats: atBatsAfter,
    status: gameOver ? 'complete' : 'active',
  }

  return {
    state: next,
    event: {
      kind: 'at-bat-complete',
      outcome,
      attempts,
      runsScored: runs,
      basesBefore: { ...state.bases },
      basesAfter: bases,
      outsAfter: outs,
      inningEnded,
      nextInning: inning,
      gameOver,
      correctSpelling: word.text,
      word,
      visitorRunsThisInning,
      visitorsBefore,
      homeTotal: tallies.runs,
      gameResult,
    },
  }
}
