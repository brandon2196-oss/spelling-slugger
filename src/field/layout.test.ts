import { EMPTY_BASES } from '../engine/bases'
import { FIELD, basePoint, basesDiff, batterPlacement, runnerPath } from './layout'

describe('batterPlacement', () => {
  it("(20) a lefty stands in the first-base-side box (viewer's right) and is mirrored", () => {
    const p = batterPlacement('L')
    expect(p.x).toBeGreaterThan(FIELD.home.x)
    expect(p.flipX).toBe(true)
  })
  it("(21) a righty stands in the third-base-side box (viewer's left) and is upright", () => {
    const p = batterPlacement('R')
    expect(p.x).toBeLessThan(FIELD.home.x)
    expect(p.flipX).toBe(false)
  })
  it('both boxes sit beside the plate, not on it', () => {
    expect(Math.abs(batterPlacement('L').x - FIELD.home.x)).toBe(Math.abs(batterPlacement('R').x - FIELD.home.x))
  })
})

describe('runnerPath', () => {
  it('goes around the diamond in order', () => {
    expect(runnerPath('first', 'third')).toEqual([basePoint('second'), basePoint('third')])
    expect(runnerPath('home', 'second')).toEqual([basePoint('first'), basePoint('second')])
    expect(runnerPath('third', 'score')).toEqual([basePoint('home')])
  })
})

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
