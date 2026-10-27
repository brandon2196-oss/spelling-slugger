import { EMPTY_BASES, advance, runnersOn } from './bases'
import type { Bases } from './types'

const b = (first = false, second = false, third = false): Bases => ({ first, second, third })

describe('advance: single', () => {
  it('moves a runner on first to second', () => {
    expect(advance(b(true), 'single')).toEqual({ bases: b(true, true, false), runs: 0 })
  })
  it('scores the runner from third and moves second to third, batter on first', () => {
    expect(advance(b(false, true, true), 'single')).toEqual({ bases: b(true, false, true), runs: 1 })
  })
})

describe('advance: double', () => {
  it('moves a runner on first to third, batter on second', () => {
    expect(advance(b(true), 'double')).toEqual({ bases: b(false, true, true), runs: 0 })
  })
  it('with bases loaded scores two, leaves runners on second and third', () => {
    expect(advance(b(true, true, true), 'double')).toEqual({ bases: b(false, true, true), runs: 2 })
  })
})

describe('advance: walk', () => {
  it('does not move an unforced runner on second', () => {
    expect(advance(b(false, true), 'walk')).toEqual({ bases: b(true, true, false), runs: 0 })
  })
  it('forces runners on first and second up one base', () => {
    expect(advance(b(true, true), 'walk')).toEqual({ bases: b(true, true, true), runs: 0 })
  })
  it('with bases loaded forces one run home', () => {
    expect(advance(b(true, true, true), 'walk')).toEqual({ bases: b(true, true, true), runs: 1 })
  })
  it('does not move an unforced runner on third when first is empty', () => {
    expect(advance(b(false, false, true), 'walk')).toEqual({ bases: b(true, false, true), runs: 0 })
  })
})

describe('advance: strikeout', () => {
  it('leaves runners where they are', () => {
    expect(advance(b(false, false, true), 'strikeout')).toEqual({ bases: b(false, false, true), runs: 0 })
  })
})

describe('helpers', () => {
  it('EMPTY_BASES has nobody on', () => {
    expect(runnersOn(EMPTY_BASES)).toBe(0)
  })
  it('runnersOn counts occupied bases', () => {
    expect(runnersOn(b(true, false, true))).toBe(2)
  })
})
