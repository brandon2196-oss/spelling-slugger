import { gradeLetters } from './letterHint'

const marks = (t: string, c: string) => gradeLetters(t, c).map((m) => `${m.char}${m.ok ? '+' : '-'}`).join(' ')

describe('gradeLetters', () => {
  it('marks every letter right on an exact match', () => expect(marks('cat', 'cat')).toBe('c+ a+ t+'))
  it('is case-insensitive but keeps what the kid typed', () => expect(marks('CaT', 'cat')).toBe('C+ a+ T+'))
  it('marks position mismatches wrong (no yellow)', () => expect(marks('tac', 'cat')).toBe('t- a+ c-'))
  it('marks extra letters wrong', () => expect(marks('catt', 'cat')).toBe('c+ a+ t+ t-'))
  it('never adds blanks for missing letters', () => expect(gradeLetters('ca', 'cats')).toHaveLength(2))
  it('trims and normalizes apostrophes', () => expect(marks(' don’t ', "don't")).toBe("d+ o+ n+ '+ t+"))
  it('returns nothing for a blank try', () => expect(gradeLetters('   ', 'cat')).toEqual([]))
})
