import { parseWordPaste } from './wordPaste'

describe('parseWordPaste', () => {
  it('splits on commas and newlines, strips numbering, drops blanks and case-duplicates', () => {
    const { words, dropped } = parseWordPaste('1. apple\n2) banana,\n\ncherry, Apple ')
    expect(words).toEqual(['apple', 'banana', 'cherry'])
    expect(dropped).toEqual(['Apple'])
  })
  it('keeps punctuation and capitalization the parent typed', () => {
    expect(parseWordPaste("don't, Mississippi, well-known").words).toEqual(["don't", 'Mississippi', 'well-known'])
  })
  it('handles tabs and semicolons from spreadsheet pastes', () => {
    expect(parseWordPaste('cat\tdog;bird').words).toEqual(['cat', 'dog', 'bird'])
  })
  it('returns nothing for empty input', () => {
    expect(parseWordPaste('   \n ')).toEqual({ words: [], dropped: [] })
  })
})
