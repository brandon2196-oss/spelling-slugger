import { EMPTY_BASES } from '../../engine/bases'
import type { SubmitEvent } from '../../engine/types'
import type { FieldController } from '../../field/controller'
import { playSequence, type SequenceSfx } from './playSequence'

const word = { position: 0, text: 'cat', sentence: null, source: 'current' as const, sourceWordId: null }
const done = (over: Partial<Extract<SubmitEvent, { kind: 'at-bat-complete' }>>): SubmitEvent => ({
  kind: 'at-bat-complete', outcome: 'double', attempts: [], runsScored: 0, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
  outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'cat', word, ...over,
})

function recorder() {
  const calls: string[] = []
  const rec = (name: string) => vi.fn(async (...args: unknown[]) => { calls.push(typeof args[0] === 'number' ? `${name}(${args[0]})` : name) })
  const field: FieldController = {
    setPlayer: vi.fn(), setBases: vi.fn(),
    playPitch: rec('playPitch'), playStrike: rec('playStrike'), playHit: rec('playHit'), playWalk: rec('playWalk'),
    playInningEnd: rec('playInningEnd'), playGameOver: rec('playGameOver'), banner: rec('banner'),
  }
  const sfx: SequenceSfx = {
    crack: () => calls.push('sfx.crack'), whiff: () => calls.push('sfx.whiff'), cheer: () => calls.push('sfx.cheer'),
    walkChime: () => calls.push('sfx.walkChime'), strikeBuzz: () => calls.push('sfx.strikeBuzz'), fanfare: () => calls.push('sfx.fanfare'),
  }
  const announce = vi.fn(async (text: string) => { calls.push(`announce(${text})`) })
  return { field, sfx, announce, calls }
}

describe('playSequence', () => {
  it('a double with a run: pitch, hit, no inning end', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double', runsScored: 1 }))
    expect(r.calls).toEqual(['playPitch', 'sfx.crack', 'announce(DOUBLE!)', 'playHit', 'sfx.cheer', 'announce(RUN SCORED!)'])
  })
  it('a strikeout that ends the inning', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'strikeout', inningEnded: true, nextInning: 2 }))
    expect(r.calls).toEqual(['playPitch', 'sfx.strikeBuzz', 'playStrike(3)', 'announce(STRIKE THREE!)', 'announce(THREE OUTS!)', 'playInningEnd(2)', 'announce(NEW INNING!)'])
  })
  it('a strikeout that ends the game celebrates instead of starting an inning', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'strikeout', inningEnded: true, gameOver: true }))
    expect(r.calls).toContain('playGameOver(0)')
    expect(r.calls).not.toContain('playInningEnd(2)')
    expect(r.calls).toContain('sfx.fanfare')
  })
  it('a strike never calls a hit', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 1, attemptsSoFar: [] })
    expect(r.calls).toEqual(['playPitch', 'sfx.whiff', 'playStrike(1)', 'announce(STRIKE ONE!)'])
  })
  it('a walk trots the forced runners', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'walk' }))
    expect(r.calls).toEqual(['playPitch', 'sfx.walkChime', 'announce(TAKE YOUR BASE!)', 'playWalk'])
  })
  it('ignored events do nothing', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'ignored', reason: 'blank' })
    expect(r.calls).toEqual([])
  })
})
