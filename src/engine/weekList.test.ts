import { describe, expect, it } from 'vitest'
import { seededRng } from './rng'
import { buildWeekList } from './weekList'

const typed = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `c${i}`, sentence: null, difficulty: 'hard' as const }))
const prev = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `p${i}`, sentence: null, difficulty: 'hard' as const }))

describe('buildWeekList', () => {
  it('adds 5 distinct review words from last week, tagged review + easy', () => {
    const { words, warnings } = buildWeekList(typed(15), prev(15), seededRng(1))
    expect(words).toHaveLength(20)
    const review = words.filter((w) => w.source === 'review')
    expect(review).toHaveLength(5)
    expect(new Set(review.map((w) => w.text)).size).toBe(5)
    expect(review.every((w) => w.difficulty === 'easy' && w.text.startsWith('p'))).toBe(true)
    expect(words.slice(0, 15).every((w) => w.source === 'current' && w.difficulty === 'hard')).toBe(true)
    expect(warnings).toEqual([])
  })
  it('defaults typed words to medium', () => {
    const { words } = buildWeekList([{ text: 'cat', sentence: null }], null, seededRng(1))
    expect(words[0]).toMatchObject({ difficulty: 'medium', source: 'current' })
  })
  it('first week: no previous list keeps just the typed words and warns', () => {
    const { words, warnings } = buildWeekList(typed(15), null, seededRng(1))
    expect(words).toHaveLength(15)
    expect(warnings[0]).toMatch(/No previous week/)
  })
  it('fewer than 5 eligible review words adds all of them and skips words repeated this week', () => {
    const { words, warnings } = buildWeekList(typed(15), [{ text: 'c0', sentence: null }, { text: 'p1', sentence: null }], seededRng(1))
    expect(words.filter((w) => w.source === 'review').map((w) => w.text)).toEqual(['p1'])
    expect(warnings[0]).toMatch(/Only 1 review word/)
  })
  it('ignores review words already on last week\'s list (only its typed words count)', () => {
    const last = [...prev(3).map((w) => ({ ...w, source: 'current' as const })), { text: 'old', sentence: null, source: 'review' as const }]
    const { words } = buildWeekList(typed(15), last, seededRng(1))
    expect(words.some((w) => w.text === 'old')).toBe(false)
  })
  it('is deterministic for a seed', () => {
    expect(buildWeekList(typed(15), prev(15), seededRng(7))).toEqual(buildWeekList(typed(15), prev(15), seededRng(7)))
  })
})
