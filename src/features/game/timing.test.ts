import { breathExtraMs, paceMultiplier } from './timing'

describe('paceMultiplier', () => {
  it('is 1x for easy and medium, 1.5x for hard', () => {
    expect(paceMultiplier('easy')).toBe(1)
    expect(paceMultiplier('medium')).toBe(1)
    expect(paceMultiplier('hard')).toBe(1.5)
  })
})

describe('breathExtraMs', () => {
  it('adds half the base breath only before a hard word', () => {
    expect(breathExtraMs(1100, 'hard')).toBe(550)
    expect(breathExtraMs(1100, 'medium')).toBe(0)
    expect(breathExtraMs(1100, 'easy')).toBe(0)
    expect(breathExtraMs(1100, undefined)).toBe(0)
  })
})
