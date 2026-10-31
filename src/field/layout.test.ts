import { EMPTY_BASES } from '../engine/bases'
import { basesDiff, FIELD, nextBase, restScaleX, runnerScaleX, type Base } from './layout'

describe('basesDiff', () => {
  it('moves the batter to second on a double with nobody on', () => {
    expect(basesDiff(EMPTY_BASES, { first: false, second: true, third: false }, 'double', 0)).toEqual([{ from: 'home', to: 'second' }])
  })
  it('scores the runner from third and puts the batter on first on a single', () => {
    const moves = basesDiff({ first: false, second: false, third: true }, { first: true, second: false, third: false }, 'single', 1)
    expect(moves).toEqual(expect.arrayContaining([{ from: 'third', to: 'score' }, { from: 'home', to: 'first' }]))
    expect(moves).toHaveLength(2)
  })
  it('on a walk moves only the forced runners', () => {
    const moves = basesDiff({ first: true, second: false, third: true }, { first: true, second: true, third: true }, 'walk', 0)
    expect(moves).toEqual(expect.arrayContaining([{ from: 'first', to: 'second' }, { from: 'home', to: 'first' }]))
    expect(moves).toHaveLength(2)
  })
  it('moves nobody on a strikeout', () => {
    expect(basesDiff({ first: true, second: false, third: false }, { first: true, second: false, third: false }, 'strikeout', 0)).toEqual([])
  })
})

describe('basesDiff homeRun', () => {
  it('sends every runner and the batter home', () => {
    expect(basesDiff({ first: true, second: false, third: true }, { first: false, second: false, third: false }, 'homeRun', 3)).toEqual([
      { from: 'third', to: 'score' }, { from: 'first', to: 'score' }, { from: 'home', to: 'score' },
    ])
  })
})

describe('runnerScaleX (run/trot art faces LEFT; flip when the leg goes right)', () => {
  const legs: [Base, Base, number][] = [
    ['home', 'first', -1],
    ['first', 'second', 1],
    ['second', 'third', 1],
    ['third', 'home', -1],
  ]
  it.each(legs)('%s -> %s sets scaleX %d', (from, to, want) => {
    expect(runnerScaleX(FIELD[from], FIELD[to])).toBe(want)
  })
  it.each(['R', 'L'] as const)('%s-handed batter running home -> first faces right (flipped)', (hand) => {
    // Runner starts at the plate whichever box the batter stood in; facing ignores the lefty batter mirror.
    const start = { ...FIELD.home, x: FIELD.home.x + (hand === 'L' ? 8 : -8) }
    expect(runnerScaleX(start, FIELD.first)).toBe(-1)
  })
})

describe('on-base runners (advance and stop)', () => {
  it.each([
    ['first', 'second'],
    ['second', 'third'],
    ['third', 'home'],
    ['home', 'first'],
  ] as [Base, Base][])('next base after %s is %s', (at, want) => {
    expect(nextBase(at)).toBe(want)
  })
  // first -> second and second -> third run LEFT (art as packed); third -> home runs RIGHT (flipped).
  it.each([
    ['first', 1],
    ['second', 1],
    ['third', -1],
  ] as [Base, number][])('stopped on %s faces the next base (scaleX %d)', (at, want) => {
    expect(restScaleX(at)).toBe(want)
  })
  it('a runner who just ran home -> first (flipped) turns to face second when stopped', () => {
    expect(runnerScaleX(FIELD.home, FIELD.first)).toBe(-1)
    expect(restScaleX('first')).toBe(1)
  })
  it('restScaleX follows the scene base points it is given', () => {
    const pts = { home: { x: 0, y: 0 }, first: { x: 100, y: 0 }, second: { x: 300, y: 0 }, third: { x: 50, y: 0 } }
    expect(restScaleX('first', pts)).toBe(-1)
  })
})
