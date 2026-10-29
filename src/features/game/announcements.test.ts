import { EMPTY_BASES } from '../../engine/bases'
import type { SubmitEvent } from '../../engine/types'
import { announcementsFor } from './announcements'

const word = { position: 0, text: 'cat', sentence: null, source: 'current' as const, sourceWordId: null, difficulty: 'medium' as const }
const done = (over: Partial<Extract<SubmitEvent, { kind: 'at-bat-complete' }>>): SubmitEvent => ({
  kind: 'at-bat-complete', outcome: 'double', attempts: [], runsScored: 0, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
  outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'cat', word, ...over,
})

describe('announcementsFor', () => {
  it('names each strike', () => {
    expect(announcementsFor({ kind: 'strike', strike: 1, attemptsSoFar: [] })).toEqual(['STRIKE ONE!'])
    expect(announcementsFor({ kind: 'strike', strike: 2, attemptsSoFar: [] })).toEqual(['STRIKE TWO!'])
  })
  it('calls the hit, then the runs', () => {
    expect(announcementsFor(done({ outcome: 'double', runsScored: 2 }))).toEqual(['DOUBLE!', '2 RUNS SCORED!'])
    expect(announcementsFor(done({ outcome: 'single', runsScored: 1 }))).toEqual(['BASE HIT!', 'RUN SCORED!'])
    expect(announcementsFor(done({ outcome: 'walk' }))).toEqual(['TAKE YOUR BASE!'])
  })
  it('handles strikeouts, inning changes and game over', () => {
    expect(announcementsFor(done({ outcome: 'strikeout', inningEnded: true, nextInning: 2 }))).toEqual(['STRIKE THREE!', 'THREE OUTS!', 'NEW INNING!'])
    expect(announcementsFor(done({ outcome: 'strikeout', inningEnded: true, gameOver: true }))).toEqual(['STRIKE THREE!', 'THREE OUTS!', 'GAME OVER!'])
    expect(announcementsFor(done({ gameOver: true }))).toEqual(['DOUBLE!', 'GAME OVER!'])
  })
  it('says nothing for ignored input', () => {
    expect(announcementsFor({ kind: 'ignored', reason: 'blank' })).toEqual([])
  })
})
