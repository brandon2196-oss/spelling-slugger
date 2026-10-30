import { createPicker } from './pool'

describe('createPicker', () => {
  it('never returns the same item twice in a row over 200 draws', () => {
    const pick = createPicker(['a', 'b', 'c'])
    let prev = pick()
    for (let i = 0; i < 200; i++) {
      const cur = pick()
      expect(cur).not.toBe(prev)
      prev = cur
    }
  })
  it('draws every item eventually', () => {
    const pick = createPicker([1, 2, 3, 4])
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) seen.add(pick())
    expect(seen.size).toBe(4)
  })
  it('a single item is always returned', () => {
    const pick = createPicker(['only'])
    for (let i = 0; i < 5; i++) expect(pick()).toBe('only')
  })
  it('an empty pool throws', () => {
    expect(() => createPicker([])).toThrow()
  })
  it('is deterministic for a given rng', () => {
    const a = createPicker(['x', 'y', 'z'], () => 0.99)
    expect([a(), a(), a()]).toEqual(['z', 'y', 'z'])
  })
})

describe('Sfx', () => {
  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true, writable: true })
  })

  it('every effect is safe to call when the browser has no AudioContext', async () => {
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true, writable: true })
    const { Sfx } = await import('./sfx')
    const s = new Sfx()
    s.enabled = true
    expect(() => {
      s.unlock(); s.setVolume(0.5)
      s.crack(); s.crackHomeRun(); s.whiff(); s.mitt(); s.umpStrike(); s.umpStrike3(); s.umpBall4(); s.ballWall()
      s.cheerSmall(); s.cheerBig(); s.cheerHr(); s.fanfare(); s.groan(); s.ambience('low'); s.ambience('off')
      s.organ('charge'); s.organ('inning'); s.organ('walkup')
    }).not.toThrow()
  })
  // Pool/no-repeat/organ-mapping behaviour of the clip-based Sfx lives in sfx.test.ts.
})
