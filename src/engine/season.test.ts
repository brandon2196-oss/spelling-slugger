import { describe, expect, it } from 'vitest'
import { recordLine, seasonRecord } from './season'

const g = (result: 'win' | 'loss' | null, day: number, over: Partial<{ mode: 'weekly' | 'practice' | 'missed'; status: 'complete' | 'in_progress' }> = {}) => ({
  mode: over.mode ?? ('weekly' as const), status: over.status ?? ('complete' as const), result,
  startedAt: `2026-10-${String(day).padStart(2, '0')}T00:00:00Z`, completedAt: `2026-10-${String(day).padStart(2, '0')}T00:10:00Z`,
})

describe('seasonRecord', () => {
  it('counts wins and losses', () => {
    expect(seasonRecord([g('win', 1), g('loss', 2), g('win', 3)])).toMatchObject({ wins: 2, losses: 1 })
  })
  it('streak runs from the newest game, regardless of input order', () => {
    const r = seasonRecord([g('win', 5), g('loss', 1), g('win', 4), g('win', 3)])
    expect(r.streak).toBe(3)
    expect(seasonRecord([g('win', 1), g('loss', 2), g('loss', 3)]).streak).toBe(-2)
  })
  it('lastFive is the newest five, oldest first', () => {
    const games = [1, 2, 3, 4, 5, 6, 7].map((d) => g(d % 2 ? 'win' : 'loss', d))
    expect(seasonRecord(games).lastFive).toEqual(['win', 'loss', 'win', 'loss', 'win'])
  })
  it('leaves out practice, missed-word, in-progress and legacy (null) games', () => {
    const r = seasonRecord([g('win', 1, { mode: 'practice' }), g('loss', 2, { mode: 'missed' }), g(null, 3), g('win', 4, { status: 'in_progress' }), g('loss', 5)])
    expect(r).toEqual({ wins: 0, losses: 1, streak: -1, lastFive: ['loss'] })
  })
  it('is empty with no counted games', () => {
    expect(seasonRecord([])).toEqual({ wins: 0, losses: 0, streak: 0, lastFive: [] })
  })
})

describe('recordLine', () => {
  it('reads like the brief', () => {
    expect(recordLine({ wins: 12, losses: 7, streak: 3, lastFive: [] })).toBe('12 and 7, won 3 straight')
    expect(recordLine({ wins: 1, losses: 2, streak: -2, lastFive: [] })).toBe('1 and 2, lost 2 straight')
    expect(recordLine({ wins: 1, losses: 0, streak: 1, lastFive: [] })).toBe('1 and 0')
    expect(recordLine({ wins: 0, losses: 0, streak: 0, lastFive: [] })).toBe('')
  })
})
