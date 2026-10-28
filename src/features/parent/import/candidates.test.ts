import { extractCandidates } from './candidates'

describe('extractCandidates', () => {
  it('takes every word of a one-column list', () => {
    const lines = ['Spelling Words', 'Week 9', 'cat', 'dog', 'because', 'friend', "don't", 'well-known']
    expect(extractCandidates(lines).likely).toEqual(['cat', 'dog', 'because', 'friend', "don't", 'well-known'])
  })

  it('splits two-column lines into both words', () => {
    const lines = ['Name: ____________', 'bright    night', 'light  fright', 'sight']
    expect(extractCandidates(lines).likely).toEqual(['bright', 'night', 'light', 'fright', 'sight'])
  })

  it('strips numbering and bullets', () => {
    const lines = ['1. apple', '2) banana', '3 cherry', '• grape', '- lemon', '* mango']
    expect(extractCandidates(lines).likely).toEqual(['apple', 'banana', 'cherry', 'grape', 'lemon', 'mango'])
  })

  it('keeps the word and drops the definition on numbered lines', () => {
    const lines = ['1. brave: showing courage when afraid', '2. enormous - very very big', '3. gentle']
    const { likely, other } = extractCandidates(lines)
    expect(likely).toEqual(['brave', 'enormous', 'gentle'])
    expect(other).toContain('courage')
    expect(other).not.toContain('brave')
  })

  it('never pre-selects header noise', () => {
    const lines = ['Spelling Words', 'Challenge words', 'Bonus', 'Mrs. Lee', 'Week 9 Unit 3', 'Name:', 'Date:', 'ocean', 'island']
    const { likely } = extractCandidates(lines)
    expect(likely).toEqual(['ocean', 'island'])
  })

  it('lower-cases an ALL CAPS sheet but leaves mixed case alone', () => {
    expect(extractCandidates(['CAT', 'DOG', 'BIRD']).likely).toEqual(['cat', 'dog', 'bird'])
    expect(extractCandidates(['Cat', 'dog', 'Texas']).likely).toEqual(['Cat', 'dog', 'Texas'])
  })

  it('collapses duplicates across likely and other', () => {
    const lines = ['happy', 'Happy', 'sad', 'The dog is very happy and sad today ok']
    const { likely, other } = extractCandidates(lines)
    expect(likely).toEqual(['happy', 'sad'])
    expect(other).not.toContain('happy')
  })

  it('handles one long comma-separated line as a list', () => {
    const line = 'cat, dog, bird, fish, frog, goat, hen, lamb, mouse, newt, owl, pig, rat, seal, toad'
    expect(extractCandidates([line]).likely).toHaveLength(15)
  })

  it('puts sentence words in other, not likely', () => {
    const { likely, other } = extractCandidates(['Please practice these words every night this week'])
    expect(likely).toEqual([])
    expect(other).toContain('practice')
    expect(other).not.toContain('week')
  })

  it('returns empty for empty input', () => {
    expect(extractCandidates([])).toEqual({ likely: [], other: [] })
  })
})
