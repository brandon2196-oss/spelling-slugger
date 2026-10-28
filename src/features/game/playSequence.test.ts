import type { AnnounceEvent, CommentaryContext } from '../../audio/announcer'
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
    groan: () => calls.push('sfx.groan'), organ: (riff) => calls.push(`sfx.organ(${riff})`),
  }
  const announce = vi.fn(async (text: string) => { calls.push(`announce(${text})`) })
  const commentary = vi.fn(async (event: AnnounceEvent, _ctx: CommentaryContext) => { calls.push(`say(${event})`) })
  return { field, sfx, announce, commentary, calls }
}

describe('playSequence', () => {
  it('a double with a run: pitch, hit, cheer with the organ charge, no inning end', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double', runsScored: 1 }), r.commentary)
    expect(r.calls).toEqual([
      'playPitch', 'sfx.crack', 'playHit', 'announce(DOUBLE!)', 'say(double)',
      'sfx.cheer', 'sfx.organ(charge)', 'announce(RUN SCORED!)', 'say(run)',
    ])
  })
  it('more than one run uses the plural commentary and passes the count', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single', runsScored: 2, nextInning: 4 }), r.commentary)
    expect(r.calls).toContain('say(runs)')
    expect(r.calls).not.toContain('say(run)')
    expect(r.commentary).toHaveBeenCalledWith('runs', { runs: 2, inning: 4, word: 'cat' })
    expect(r.commentary).toHaveBeenCalledWith('single', { runs: 2, inning: 4, word: 'cat' })
  })
  it('a strikeout that ends the inning: buzz, groan, organ sting, then the new inning', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'strikeout', inningEnded: true, nextInning: 2 }), r.commentary)
    expect(r.calls).toEqual([
      'playPitch', 'sfx.strikeBuzz', 'sfx.groan', 'playStrike(3)', 'announce(STRIKE THREE!)', 'say(strikeout)',
      'sfx.organ(inning)', 'announce(THREE OUTS!)', 'say(inningEnd)', 'playInningEnd(2)', 'announce(NEW INNING!)',
    ])
    expect(r.commentary).toHaveBeenCalledWith('inningEnd', { runs: 0, inning: 2, word: 'cat' })
  })
  it('a strikeout that ends the game celebrates instead of starting an inning', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'strikeout', inningEnded: true, gameOver: true }), r.commentary)
    expect(r.calls).toContain('playGameOver(0)')
    expect(r.calls).not.toContain('playInningEnd(2)')
    expect(r.calls).toContain('sfx.fanfare')
    expect(r.calls).toContain('say(gameOver)')
    expect(r.calls).not.toContain('say(inningEnd)')
    expect(r.calls).not.toContain('sfx.organ(inning)')
    expect(r.calls.indexOf('sfx.fanfare')).toBeLessThan(r.calls.indexOf('say(gameOver)'))
  })
  it('a strike never calls a hit', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 1, attemptsSoFar: [] }, r.commentary)
    expect(r.calls).toEqual(['playPitch', 'sfx.whiff', 'playStrike(1)', 'announce(STRIKE ONE!)', 'say(strike1)'])
  })
  it('strike two gets its own commentary event', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 2, attemptsSoFar: [] }, r.commentary)
    expect(r.calls).toContain('say(strike2)')
  })
  it('a walk trots the forced runners', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'walk' }), r.commentary)
    expect(r.calls).toEqual(['playPitch', 'sfx.walkChime', 'playWalk', 'announce(TAKE YOUR BASE!)', 'say(walk)'])
  })
  it('board text and commentary for the same moment run concurrently', async () => {
    const r = recorder()
    let release!: () => void
    const announce = vi.fn(() => new Promise<void>((res) => { release = res }))
    const p = playSequence(r.field, r.sfx, announce, done({ outcome: 'double' }), r.commentary)
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(announce).toHaveBeenCalledWith('DOUBLE!')
    expect(r.commentary).toHaveBeenCalledWith('double', expect.anything())
    expect(r.calls).toContain('playHit') // the swing doesn't wait for the board text or the line
    expect(r.calls).not.toContain('sfx.cheer') // but the next moment does wait
    release()
    await p
  })
  it('ignored events do nothing', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'ignored', reason: 'blank' }, r.commentary)
    expect(r.calls).toEqual([])
    expect(r.commentary).not.toHaveBeenCalled()
  })

  it('runs the hit animation while the booth is still talking', async () => {
    const r = recorder()
    const slowCommentary = async (evt: string) => {
      await new Promise((res) => setTimeout(res, 5))
      r.calls.push(`say(${evt})`)
    }
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double' }), slowCommentary as never)
    expect(r.calls.indexOf('playHit')).toBeLessThan(r.calls.indexOf('say(double)'))
  })
})
