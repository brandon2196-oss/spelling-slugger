import { describe, expect, it } from 'vitest'
import { createGame, submitAnswer } from './game'
import { bestPlay } from './highlight'
import type { Difficulty, GameWord } from './types'

const words = (mix: Difficulty[]): GameWord[] =>
  mix.map((difficulty, i) => ({ position: i, text: `w${i}`, sentence: null, source: 'current', difficulty, sourceWordId: null }))

/** n = wrong tries before the right one (3 = strikeout). */
function play(mix: Difficulty[], misses: number[]) {
  let s = createGame(words(mix), 'h')
  misses.forEach((n, i) => {
    for (let a = 0; a < Math.min(n, 3); a++) s = submitAnswer(s, 'nope').state
    if (n < 3) s = submitAnswer(s, `w${i}`).state
  })
  return s
}

describe('bestPlay', () => {
  it('picks the home run with the most runs', () => {
    const s = play(['easy', 'easy', 'hard', 'hard'], [0, 0, 0, 0])
    const p = bestPlay(s)!
    expect(p.outcome).toBe('homeRun')
    expect(p.position).toBe(2) // two on, three runs, beats the solo shot after it
    expect(p.runs).toBe(3)
    expect(p.before).toEqual({ first: true, second: true, third: false })
    expect(p.after).toEqual({ first: false, second: false, third: false })
  })
  it('else the play that scored the most runs', () => {
    const s = play(['easy', 'easy', 'easy', 'medium'], [0, 0, 0, 0])
    expect(bestPlay(s)).toMatchObject({ position: 3, outcome: 'double', runs: 2 })
  })
  it('else the first hit', () => {
    expect(bestPlay(play(['easy', 'easy'], [3, 0]))).toMatchObject({ position: 1, outcome: 'single', runs: 0 })
  })
  it('nothing for a game with no hits', () => {
    expect(bestPlay(play(['easy', 'easy'], [3, 2]))).toBeNull()
  })
})
