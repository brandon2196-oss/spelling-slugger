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

describe('weeklyWords difficulty ramp', () => {
  const mixed: SourceWord[] = (['easy', 'medium', 'hard'] as const).flatMap((d) =>
    Array.from({ length: 6 }, (_, i) => ({ id: `${d}${i}`, text: `${d}w${i}`, sentence: null, source: 'current' as const, difficulty: d })),
  )
  const score = { easy: 0, medium: 1, hard: 2 } as const
  const avg = (xs: { difficulty: 'easy' | 'medium' | 'hard' }[]) => xs.reduce((s, w) => s + score[w.difficulty], 0) / xs.length

  it('keeps every word once with positions 0..n-1', () => {
    const out = weeklyWords(mixed, seededRng(1))
    expect(out.map((w) => w.sourceWordId).sort()).toEqual(mixed.map((w) => w.id).sort())
    expect(out.map((w) => w.position)).toEqual(mixed.map((_, i) => i))
  })

  it('trends easy early and hard late across seeds', () => {
    let early = 0, late = 0
    for (let s = 0; s < 200; s++) {
      const out = weeklyWords(mixed, seededRng(s))
      early += avg(out.slice(0, 6))
      late += avg(out.slice(12))
    }
    expect(early / 200).toBeLessThan(0.7)
    expect(late / 200).toBeGreaterThan(1.3)
  })

  it('still mixes: not a strict easy→medium→hard sort', () => {
    let unsorted = 0
    for (let s = 0; s < 50; s++) {
      const d = weeklyWords(mixed, seededRng(s)).map((w) => score[w.difficulty])
      if (d.some((v, i) => i > 0 && v < (d[i - 1] as number))) unsorted++
    }
    expect(unsorted).toBeGreaterThan(45)
  })

  it('shuffles when every word has the same difficulty', () => {
    const orders = new Set(Array.from({ length: 10 }, (_, s) => weeklyWords(current, seededRng(s)).map((w) => w.text).join()))
    expect(orders.size).toBeGreaterThan(5)
  })
})
