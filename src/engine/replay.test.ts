import { createGame, submitAnswer } from './game'
import { rebuild, type ReplayAttempt } from './replay'
import type { GameState, GameWord } from './types'

const mk = (texts: string[]): GameWord[] =>
  texts.map((text, position) => ({ position, text, sentence: null, source: 'current', sourceWordId: null }))

const twenty = Array.from({ length: 20 }, (_, i) => `w${i}`)

/** Play answers live while also collecting the attempt log a store would hold. */
function playAndLog(words: GameWord[], answers: string[]): { live: GameState; log: ReplayAttempt[] } {
  let live = createGame(words)
  const log: ReplayAttempt[] = []
  for (const text of answers) {
    const position = live.index
    const { state, event } = submitAnswer(live, text)
    if (event.kind !== 'ignored') {
      const attemptNumber = event.kind === 'strike' ? event.attemptsSoFar.length : event.attempts.length
      log.push({ position, attemptNumber, text })
    }
    live = state
  }
  return { live, log }
}

describe('rebuild', () => {
  it('reproduces the live state from the attempt log for a full game', () => {
    const answers: string[] = []
    twenty.forEach((w, i) => {
      if (i % 4 === 3) answers.push('x', 'x', 'x')
      else if (i % 4 === 2) answers.push('x', 'x', w)
      else if (i % 4 === 1) answers.push('x', w)
      else answers.push(w)
    })
    const { live, log } = playAndLog(mk(twenty), answers)
    expect(live.status).toBe('complete')
    expect(rebuild(mk(twenty), log)).toEqual(live)
  })
  it('(26) scores a duplicated attempt row only once', () => {
    const { live, log } = playAndLog(mk(['a', 'b']), ['a', 'b'])
    const dup = [...log, { ...log[0]! }]
    expect(rebuild(mk(['a', 'b']), dup)).toEqual(live)
  })
  it('resumes mid-word at two strikes on the same word', () => {
    const { live, log } = playAndLog(mk(['a', 'b']), ['a', 'x', 'y'])
    const rebuilt = rebuild(mk(['a', 'b']), log)
    expect(rebuilt.index).toBe(1)
    expect(rebuilt.strikes).toBe(2)
    expect(rebuilt).toEqual(live)
  })
  it('tolerates an unsorted log', () => {
    const { live, log } = playAndLog(mk(['a', 'b', 'c']), ['x', 'a', 'b', 'x', 'x', 'c'])
    expect(rebuild(mk(['a', 'b', 'c']), [...log].reverse())).toEqual(live)
  })
})
