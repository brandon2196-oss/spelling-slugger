import { seededRng, shuffle } from './rng'
import { practiceWords, weeklyWords, type SourceWord } from './selection'

const words = (prefix: string, n: number): SourceWord[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, text: `${prefix}word${i}`, sentence: null, source: 'current', difficulty: 'medium' }))

const current = words('c', 15)

describe('weeklyWords', () => {
  it('keeps every list word with its source and difficulty, shuffled', () => {
    const list = [
      { id: 'a', text: 'cat', sentence: null, source: 'current' as const, difficulty: 'hard' as const },
      { id: 'b', text: 'dog', sentence: null, source: 'review' as const, difficulty: 'easy' as const },
    ]
    const out = weeklyWords(list, seededRng(3))
    expect(out.map((x) => x.text).sort()).toEqual(['cat', 'dog'])
    expect(out.find((x) => x.text === 'dog')).toMatchObject({ source: 'review', difficulty: 'easy', sourceWordId: 'b' })
    expect(out.map((x) => x.position)).toEqual([0, 1])
  })
})

describe('practiceWords', () => {
  it('returns every list word shuffled, all marked current', () => {
    const out = practiceWords(current, seededRng(4))
    expect(out).toHaveLength(15)
    expect(out.every((w) => w.source === 'current')).toBe(true)
    expect(new Set(out.map((w) => w.sourceWordId)).size).toBe(15)
  })
})

describe('rng', () => {
  it('seededRng is deterministic and in [0,1)', () => {
    const a = seededRng(42), b = seededRng(42)
    const xs = [a(), a(), a()]
    expect(xs).toEqual([b(), b(), b()])
    for (const x of xs) expect(x >= 0 && x < 1).toBe(true)
  })
  it('shuffle keeps every element and does not mutate', () => {
    const xs = [1, 2, 3, 4, 5]
    const out = shuffle(xs, seededRng(7))
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(xs).toEqual([1, 2, 3, 4, 5])
  })
})
