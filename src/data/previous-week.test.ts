import { MAX_PRECEDING_GAP_DAYS, findPrecedingList } from './previous-week'
import type { WordList } from './types'

const list = (id: string, weekStart: string): WordList => ({
  id, playerId: 'p', title: id, weekStart, isActive: false, createdAt: '', words: [],
})

describe('findPrecedingList', () => {
  it('returns the most recent earlier list', () => {
    const lists = [list('a', '2026-10-05'), list('b', '2026-10-12'), list('c', '2026-10-19')]
    expect(findPrecedingList(lists, lists[2]!)?.id).toBe('b')
  })
  it('returns null when the only earlier list is too old', () => {
    const lists = [list('a', '2026-09-14'), list('c', '2026-10-19')]
    expect(findPrecedingList(lists, lists[1]!)).toBeNull()
  })
  it('accepts a two-week gap (holiday weeks)', () => {
    const lists = [list('a', '2026-10-05'), list('c', '2026-10-19')]
    expect(findPrecedingList(lists, lists[1]!)?.id).toBe('a')
  })
  it('returns null for the oldest list', () => {
    const lists = [list('a', '2026-10-05')]
    expect(findPrecedingList(lists, lists[0]!)).toBeNull()
  })
  it('treats a list exactly three weeks back as missing, not last week', () => {
    const lists = [list('a', '2026-09-28'), list('c', '2026-10-19')]
    expect(findPrecedingList(lists, lists[1]!)).toBeNull()
  })
  it('exposes the gap constant', () => {
    expect(MAX_PRECEDING_GAP_DAYS).toBe(14)
  })
})
