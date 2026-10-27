import { createGame, submitAnswer } from './game'
import { summarize } from './results'
import type { GameState, GameWord } from './types'

const mk = (texts: string[], reviewFrom = Infinity): GameWord[] =>
  texts.map((text, position) => ({
    position,
    text,
    sentence: null,
    source: position >= reviewFrom ? 'review' : 'current',
    sourceWordId: null,
  }))

function play(state: GameState, ...answers: string[]): GameState {
  for (const a of answers) state = submitAnswer(state, a).state
  return state
}

describe('summarize', () => {
  // words: a (double), b (single), c (walk), d (strikeout); d is a review word
  const state = play(createGame(mk(['a', 'b', 'c', 'd'], 3)), 'a', 'x', 'b', 'x', 'x', 'c', 'x', 'x', 'x')
  const s = summarize(state)

  it('copies the tallies', () => {
    expect(s).toMatchObject({ doubles: 1, singles: 1, walks: 1, strikeouts: 1, hits: 2, totalStrikes: 6 })
  })
  it('computes first-try accuracy as a rounded percentage', () => {
    expect(s.firstTryAccuracy).toBe(25)
  })
  it('lists the completely missed words', () => {
    expect(s.missedWords).toEqual(['d'])
  })
  it('breaks results down by current vs review words', () => {
    expect(s.current).toEqual({ total: 3, firstTry: 1, missed: 0 })
    expect(s.review).toEqual({ total: 1, firstTry: 0, missed: 1 })
  })
  it('reports 0% accuracy for an empty game rather than NaN', () => {
    expect(summarize(createGame([])).firstTryAccuracy).toBe(0)
  })
})
