import { EMPTY_BASES } from './bases'
import { createGame, currentWord, submitAnswer } from './game'
import type { GameState, GameWord, SubmitEvent } from './types'

const mk = (texts: string[]): GameWord[] =>
  texts.map((text, position) => ({ position, text, sentence: null, source: 'current', sourceWordId: null }))

/** Submit a sequence of answers, returning the final state and the last event. */
function play(state: GameState, ...answers: string[]): { state: GameState; event: SubmitEvent } {
  let out: { state: GameState; event: SubmitEvent } = { state, event: { kind: 'ignored', reason: 'blank' } }
  for (const a of answers) out = submitAnswer(out.state, a)
  return out
}

const twenty = Array.from({ length: 20 }, (_, i) => `word${i}`)

describe('createGame', () => {
  it('starts at word 0, inning 1, nobody on, nothing tallied', () => {
    const s = createGame(mk(['cat']))
    expect(s.index).toBe(0)
    expect(s.inning).toBe(1)
    expect(s.outs).toBe(0)
    expect(s.strikes).toBe(0)
    expect(s.bases).toEqual(EMPTY_BASES)
    expect(s.tallies.runs).toBe(0)
    expect(s.status).toBe('active')
    expect(currentWord(s)?.text).toBe('cat')
  })
})

describe('outcomes by attempt', () => {
  it('(1) correct on the first try is a double', () => {
    const { state, event } = play(createGame(mk(['baseball'])), 'baseball')
    expect(event).toMatchObject({ kind: 'at-bat-complete', outcome: 'double' })
    expect(state.bases).toEqual({ first: false, second: true, third: false })
    expect(state.tallies).toMatchObject({ doubles: 1, hits: 1, firstTry: 1 })
  })
  it('(2) correct on the second try is a single', () => {
    const { state, event } = play(createGame(mk(['baseball'])), 'basbal', 'baseball')
    expect(event).toMatchObject({ kind: 'at-bat-complete', outcome: 'single' })
    expect(state.tallies).toMatchObject({ singles: 1, hits: 1, secondTry: 1, totalStrikes: 1 })
  })
  it('(3) correct on the third try is a walk, never a hit', () => {
    const { state, event } = play(createGame(mk(['baseball'])), 'x', 'y', 'baseball')
    expect(event).toMatchObject({ kind: 'at-bat-complete', outcome: 'walk' })
    expect(state.tallies).toMatchObject({ walks: 1, hits: 0, thirdTry: 1 })
    expect(state.bases.first).toBe(true)
  })
  it('(4) three wrong submissions are a strikeout and reveal the word', () => {
    const { state, event } = play(createGame(mk(['baseball'])), 'x', 'y', 'z')
    expect(event).toMatchObject({ kind: 'at-bat-complete', outcome: 'strikeout', correctSpelling: 'baseball' })
    expect(state.outs).toBe(1)
    expect(state.tallies).toMatchObject({ strikeouts: 1, missed: 1, totalStrikes: 3 })
  })
})

describe('strikes', () => {
  it('(5) one wrong word is exactly one strike however many letters are off', () => {
    const { state, event } = play(createGame(mk(['baseball'])), 'basbal')
    expect(event).toMatchObject({ kind: 'strike', strike: 1 })
    expect(state.strikes).toBe(1)
    const two = play(createGame(mk(['baseball'])), 'bsaebll')
    expect(two.state.strikes).toBe(1)
  })
  it('(6) a blank submission is ignored and changes nothing', () => {
    const start = createGame(mk(['baseball']))
    const { state, event } = submitAnswer(start, '   ')
    expect(event).toEqual({ kind: 'ignored', reason: 'blank' })
    expect(state).toEqual(start)
  })
  it('reset for every new word', () => {
    const { state, event } = play(createGame(mk(['a', 'b'])), 'x', 'y', 'z', 'b')
    expect(event).toMatchObject({ outcome: 'double' })
    expect(state.strikes).toBe(0)
  })
})

describe('innings', () => {
  it('(12/13) three outs end the inning, clear the bases and reset outs', () => {
    const g = createGame(mk(['a', 'b', 'c', 'd', 'e']))
    const afterDouble = play(g, 'a')
    expect(afterDouble.state.bases.second).toBe(true)
    const { state, event } = play(afterDouble.state, 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x', 'x')
    expect(event).toMatchObject({ kind: 'at-bat-complete', outcome: 'strikeout', inningEnded: true, nextInning: 2 })
    expect(state.outs).toBe(0)
    expect(state.inning).toBe(2)
    expect(state.bases).toEqual(EMPTY_BASES)
    expect(state.status).toBe('active')
  })
  it('(14) the game continues until every word is attempted, with no inning cap', () => {
    let s = createGame(mk(twenty))
    // 7 strikeouts then 13 doubles
    for (let i = 0; i < 7; i++) s = play(s, 'x', 'x', 'x').state
    expect(s.inning).toBe(3)
    for (let i = 7; i < 20; i++) s = play(s, `word${i}`).state
    expect(s.index).toBe(20)
    expect(s.status).toBe('complete')
  })
})

describe('game end', () => {
  it('(15) runners left on base after the final word do not score', () => {
    const { state, event } = play(createGame(mk(['a', 'b'])), 'a', 'b') // double then double
    expect(event).toMatchObject({ gameOver: true, runsScored: 1 })
    expect(state.tallies.runs).toBe(1) // runner from second scored on the double; batter on second is stranded
    expect(state.bases).toEqual({ first: false, second: true, third: false })
    expect(state.status).toBe('complete')
  })
  it('(26) submissions after the game is complete are ignored', () => {
    const done = play(createGame(mk(['a'])), 'a').state
    const { state, event } = submitAnswer(done, 'a')
    expect(event).toEqual({ kind: 'ignored', reason: 'complete' })
    expect(state).toEqual(done)
  })
  it('a strikeout on the final word ends the game without a phantom new inning', () => {
    const { state, event } = play(createGame(mk(['a'])), 'x', 'x', 'x')
    expect(event).toMatchObject({ gameOver: true, outcome: 'strikeout' })
    expect(state.inning).toBe(1)
  })
})

describe('purity', () => {
  it('never mutates the input state', () => {
    const start = createGame(mk(['a']))
    const snapshot = JSON.parse(JSON.stringify(start))
    submitAnswer(start, 'a')
    expect(start).toEqual(snapshot)
  })
  it('records every attempt on the at-bat', () => {
    const { event } = play(createGame(mk(['a'])), 'q', 'a')
    expect(event).toMatchObject({
      attempts: [
        { attemptNumber: 1, text: 'q', correct: false },
        { attemptNumber: 2, text: 'a', correct: true },
      ],
    })
  })
})
