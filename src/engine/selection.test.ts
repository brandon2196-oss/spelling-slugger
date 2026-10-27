import { seededRng, shuffle } from './rng'
import { REVIEW_COUNT, practiceWords, selectGameWords, type SourceWord } from './selection'
import { normalize } from './grade'

const words = (prefix: string, n: number): SourceWord[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, text: `${prefix}word${i}`, sentence: null }))

const current = words('c', 15)
const previous = words('p', 10)

describe('selectGameWords', () => {
  it('(16) picks 15 current plus 5 distinct review words, 20 total, no duplicates', () => {
    const { words: picked, warnings } = selectGameWords(current, previous, seededRng(1))
    expect(picked).toHaveLength(20)
    const review = picked.filter((w) => w.source === 'review')
    expect(review).toHaveLength(REVIEW_COUNT)
    expect(new Set(review.map((w) => w.sourceWordId)).size).toBe(5)
    expect(new Set(picked.map((w) => normalize(w.text))).size).toBe(20)
    expect(warnings).toEqual([])
  })
  it('(17) review words all come from the previous list', () => {
    const { words: picked } = selectGameWords(current, previous, seededRng(2))
    const prevIds = new Set(previous.map((p) => p.id))
    for (const w of picked.filter((w) => w.source === 'review')) expect(prevIds.has(w.sourceWordId!)).toBe(true)
    for (const w of picked.filter((w) => w.source === 'current')) expect(w.sourceWordId!.startsWith('c')).toBe(true)
  })
  it('(18) different seeds give different review sets or orders', () => {
    const results = [1, 2, 3, 4, 5].map((seed) =>
      selectGameWords(current, previous, seededRng(seed)).words.map((w) => w.sourceWordId).join(','),
    )
    expect(new Set(results).size).toBeGreaterThan(1)
  })
  it('assigns positions 0..n-1 in shuffled order', () => {
    const { words: picked } = selectGameWords(current, previous, seededRng(3))
    expect(picked.map((w) => w.position)).toEqual(Array.from({ length: 20 }, (_, i) => i))
  })
  it('is deterministic for the same seed', () => {
    const a = selectGameWords(current, previous, seededRng(9)).words.map((w) => w.sourceWordId)
    const b = selectGameWords(current, previous, seededRng(9)).words.map((w) => w.sourceWordId)
    expect(a).toEqual(b)
  })
  it('with no previous list uses only the current words and says so', () => {
    const { words: picked, warnings } = selectGameWords(current, null, seededRng(1))
    expect(picked).toHaveLength(15)
    expect(warnings).toEqual(["No previous week's list was found, so this game uses only the current words."])
  })
  it('skips review words that also appear this week and explains the shortfall', () => {
    const overlapping: SourceWord[] = [
      ...current.slice(0, 7).map((w, i) => ({ id: `o${i}`, text: w.text.toUpperCase(), sentence: null })),
      ...words('q', 3),
    ]
    const { words: picked, warnings } = selectGameWords(current, overlapping, seededRng(1))
    expect(picked).toHaveLength(18)
    expect(picked.filter((w) => w.source === 'review')).toHaveLength(3)
    expect(warnings).toEqual([
      'Only 3 review words from last week were available (words that also appear this week are skipped), so this game has 18 words instead of 20.',
    ])
  })
  it('uses the singular when one review word is available', () => {
    const { warnings } = selectGameWords(current, words('q', 1), seededRng(1))
    expect(warnings[0]).toMatch(/^Only 1 review word from last week/)
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
