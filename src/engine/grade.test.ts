import { isBlank, isCorrect, normalize } from './grade'

describe('isCorrect', () => {
  it('ignores case', () => {
    expect(isCorrect('Baseball', 'baseball')).toBe(true)
  })
  it('ignores surrounding whitespace', () => {
    expect(isCorrect('  baseball ', 'baseball')).toBe(true)
  })
  it('treats any misspelling as simply incorrect, whatever the letter count', () => {
    expect(isCorrect('basbal', 'baseball')).toBe(false)
    expect(isCorrect('basaball', 'baseball')).toBe(false)
    expect(isCorrect('bseball', 'baseball')).toBe(false)
  })
  it('accepts a curly apostrophe for a straight one', () => {
    expect(isCorrect('don’t', "don't")).toBe(true)
  })
  it('requires the apostrophe when the word has one', () => {
    expect(isCorrect('dont', "don't")).toBe(false)
  })
  it('accepts dash variants for a hyphen', () => {
    expect(isCorrect('well–known', 'well-known')).toBe(true)
  })
})

describe('isBlank', () => {
  it('is true for empty and whitespace-only input', () => {
    expect(isBlank('')).toBe(true)
    expect(isBlank('   ')).toBe(true)
  })
  it('is false for any letter', () => {
    expect(isBlank('a')).toBe(false)
  })
})

describe('normalize', () => {
  it('collapses inner whitespace to one space', () => {
    expect(normalize('ice   cream')).toBe('ice cream')
  })
})
