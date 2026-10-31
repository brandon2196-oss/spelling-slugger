import type { AnnounceEvent, CommentaryContext } from '../../audio/announcer'
import { EMPTY_BASES } from '../../engine/bases'
import type { SubmitEvent } from '../../engine/types'
import type { FieldController } from '../../field/controller'
import { CUES } from '../../audio/layering'
import { playSequence, walkupOnce, type SequenceSfx } from './playSequence'

const O = { pitchCall: 'whiff' as const, scale: 0 }

const word = { position: 0, text: 'cat', sentence: null, source: 'current' as const, sourceWordId: null, difficulty: 'medium' as const }
const done = (over: Partial<Extract<SubmitEvent, { kind: 'at-bat-complete' }>>): SubmitEvent => ({
  kind: 'at-bat-complete', outcome: 'double', attempts: [], runsScored: 0, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
  outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'cat', word, visitorRunsThisInning: null, visitorsBefore: 0, homeTotal: 0, gameResult: null, ...over,
})

function recorder() {
  const calls: string[] = []
  const rec = (name: string) => vi.fn(async (...args: unknown[]) => { calls.push(typeof args[0] === 'number' ? `${name}(${args[0]})` : name) })
  const field: FieldController = {
    setPlayer: vi.fn(), setBases: vi.fn(),
    playPitch: rec('playPitch'), playStrike: rec('playStrike'), playHit: rec('playHit'), playWalk: rec('playWalk'),
    playInningEnd: rec('playInningEnd'), playGameOver: rec('playGameOver'), banner: rec('banner'),
  }
  const sfx = {
    ...Object.fromEntries(CUES.map((c) => [c, () => { calls.push(`sfx.${c}`) }])),
    organ: (riff: string) => { calls.push(`sfx.organ(${riff})`) },
  } as SequenceSfx
  const announce = vi.fn(async (text: string) => { calls.push(`announce(${text})`) })
  const commentary = vi.fn(async (event: AnnounceEvent, _ctx: CommentaryContext) => { calls.push(`say(${event})`) })
  return { field, sfx, announce, commentary, calls }
}

describe('playSequence', () => {
  it('crowd cheers once on 2+ runs', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single', runsScored: 2 }), r.commentary, O)
    expect(r.calls.filter((c) => c.startsWith('sfx.cheer'))).toHaveLength(1)
  })
  it('crowd cheers once on a home run, even when runs score', async () => {
    for (const runsScored of [1, 4]) {
      const r = recorder()
      await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'homeRun', runsScored }), r.commentary, O)
      expect(r.calls.filter((c) => c.startsWith('sfx.cheer'))).toHaveLength(1)
    }
  })
  it('more than one run uses the plural commentary and passes the count', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single', runsScored: 2, nextInning: 4 }), r.commentary, O)
    expect(r.calls).toContain('say(runs)')
    expect(r.calls).not.toContain('say(run)')
    expect(r.commentary).toHaveBeenCalledWith('runs', { runs: 2, inning: 4, word: 'cat' })
    expect(r.commentary).toHaveBeenCalledWith('single', { runs: 2, inning: 4, word: 'cat' })
  })
  it('a strikeout that ends the inning: buzz, groan, organ sting, then the new inning', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'strikeout', inningEnded: true, nextInning: 2 }), r.commentary, O)
    expect(r.calls).toEqual([
      'playPitch', 'sfx.umpStrike3', 'sfx.groan', 'playStrike(3)', 'announce(STRIKE THREE!)', 'say(strikeout)',
      'sfx.organ(inning)', 'announce(THREE OUTS!)', 'say(inningEnd)', 'playInningEnd(2)', 'announce(NEW INNING!)',
    ])
    expect(r.commentary).toHaveBeenCalledWith('inningEnd', { runs: 0, inning: 2, word: 'cat' })
  })
  it('a strikeout that ends the game celebrates instead of starting an inning', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'strikeout', inningEnded: true, gameOver: true }), r.commentary, O)
    expect(r.calls).toContain('playGameOver(0)')
    expect(r.calls).not.toContain('playInningEnd(2)')
    expect(r.calls).toContain('sfx.fanfare')
    expect(r.calls).toContain('say(gameOver)')
    expect(r.calls).not.toContain('say(inningEnd)')
    expect(r.calls).not.toContain('sfx.organ(inning)')
    expect(r.calls.indexOf('sfx.fanfare')).toBeLessThan(r.calls.indexOf('say(gameOver)'))
  })
  it('strike two gets its own commentary event', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 2, attemptsSoFar: [] }, r.commentary, O)
    expect(r.calls).toContain('say(strike2)')
  })
  it('a walk trots the forced runners', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'walk' }), r.commentary, O)
    expect(r.calls).toEqual(['playPitch', 'sfx.mitt', 'sfx.umpBall4', 'playWalk', 'announce(TAKE YOUR BASE!)', 'say(walk)'])
  })
  it('board text and commentary for the same moment run concurrently', async () => {
    const r = recorder()
    let release!: () => void
    const announce = vi.fn(() => new Promise<void>((res) => { release = res }))
    const p = playSequence(r.field, r.sfx, announce, done({ outcome: 'double' }), r.commentary, O)
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    expect(announce).toHaveBeenCalledWith('DOUBLE!')
    expect(r.commentary).toHaveBeenCalledWith('double', expect.anything())
    expect(r.calls).toContain('playHit') // the swing doesn't wait for the board text or the line
    expect(r.calls).not.toContain('sfx.organ(charge)') // but the next moment does wait
    release()
    await p
  })
  it('ignored events do nothing', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'ignored', reason: 'blank' }, r.commentary, O)
    expect(r.calls).toEqual([])
    expect(r.commentary).not.toHaveBeenCalled()
  })

  it('runs the hit animation while the booth is still talking', async () => {
    const r = recorder()
    const slowCommentary = async (evt: string) => {
      await new Promise((res) => setTimeout(res, 5))
      r.calls.push(`say(${evt})`)
    }
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double' }), slowCommentary as never, O)
    expect(r.calls.indexOf('playHit')).toBeLessThan(r.calls.indexOf('say(double)'))
  })
  it('a double with one run: pitch, crack, cheer-small, ball-wall, hit, organ charge', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double', runsScored: 1 }), r.commentary, O)
    expect(r.calls).toEqual([
      'playPitch', 'sfx.crack', 'sfx.cheerSmall', 'sfx.ballWall', 'playHit', 'announce(DOUBLE!)', 'say(double)',
      'sfx.organ(charge)', 'announce(RUN SCORED!)', 'say(run)',
    ])
  })
  it('a strike never calls a hit', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 1, attemptsSoFar: [] }, r.commentary, O)
    expect(r.calls).toEqual(['playPitch', 'sfx.whiff', 'sfx.umpStrike', 'playStrike(1)', 'announce(STRIKE ONE!)', 'say(strike1)'])
  })
  it('the pitch call picks mitt over whiff when asked', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, { kind: 'strike', strike: 2, attemptsSoFar: [] }, r.commentary, { ...O, pitchCall: 'mitt' })
    expect(r.calls.slice(0, 3)).toEqual(['playPitch', 'sfx.mitt', 'sfx.umpStrike'])
  })
  it('a home run that ends the game plays one fanfare, not two', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'homeRun', runsScored: 1, inningEnded: true, gameOver: true }), r.commentary, O)
    expect(r.calls.filter((c) => c === 'sfx.fanfare')).toHaveLength(1)
  })
  it('exactly one cheer on every hit', async () => {
    for (const outcome of ['single', 'double', 'homeRun'] as const) {
      for (const runsScored of [0, 1, 2, 4]) {
        const r = recorder()
        await playSequence(r.field, r.sfx, r.announce, done({ outcome, runsScored }), r.commentary, O)
        expect(r.calls.filter((c) => c.startsWith('sfx.cheer'))).toHaveLength(1)
      }
    }
  })
  it('hands an onBeat to the field and organ-charge plays once even if runScored also fires', async () => {
    const r = recorder()
    let onBeat: ((b: 'runScored') => void) | null = null
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single', runsScored: 2 }), r.commentary, {
      ...O,
      onBeatSink: (fn) => { onBeat = fn; fn('runScored') },
    })
    expect(onBeat).not.toBeNull()
    expect(r.calls.filter((c) => c === 'sfx.organ(charge)')).toHaveLength(1)
  })
  it('hands onBeat to the field by default and clears it after the play', async () => {
    const r = recorder()
    let seen: unknown = null
    r.field.playHit = vi.fn(async () => { seen = r.field.onBeat; r.field.onBeat?.('wall') })
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double' }), r.commentary, { pitchCall: 'whiff', scale: 1 })
    expect(typeof seen).toBe('function')
    expect(r.calls.filter((c) => c === 'sfx.ballWall')).toHaveLength(1)
    expect(r.field.onBeat).toBeUndefined()
  })
})

describe('walkupOnce', () => {
  it('plays organ walkup once per at-bat, not on repeats', () => {
    const r = recorder()
    const walkup = walkupOnce(r.sfx)
    expect(walkup(0)).toBe(true)
    expect(walkup(0)).toBe(false)
    expect(walkup(1)).toBe(true)
    expect(walkup(1)).toBe(false)
    expect(r.calls).toEqual(['sfx.organ(walkup)', 'sfx.organ(walkup)'])
  })
  it('never plays during a normal pitch sequence', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single' }), r.commentary, O)
    expect(r.calls).not.toContain('sfx.organ(walkup)')
  })
})

describe('playSequence: the Visitors (Phase 3)', () => {
  it('reveals the Visitors at inning end, after the inning-end call and before NEW INNING', async () => {
    const r = recorder()
    const reveal = vi.fn(() => { r.calls.push('reveal') })
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'strikeout', inningEnded: true, nextInning: 2, homeTotal: 3, visitorRunsThisInning: 1, visitorsBefore: 0 }), r.commentary, { ...O, revealVisitors: reveal })
    expect(r.calls.slice(r.calls.indexOf('say(inningEnd)'))).toEqual([
      'say(inningEnd)', 'playInningEnd(2)', 'reveal', 'announce(VISITORS SCORE 1!)', 'say(visitorsScore)', 'announce(NEW INNING!)',
    ])
  })
  it('never reveals mid-inning', async () => {
    const r = recorder()
    const reveal = vi.fn()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single', runsScored: 1, homeTotal: 1 }), r.commentary, { ...O, revealVisitors: reveal })
    expect(reveal).not.toHaveBeenCalled()
  })
  it('calls a tie and a Visitors lead', async () => {
    const tie = recorder()
    await playSequence(tie.field, tie.sfx, tie.announce, done({ outcome: 'strikeout', inningEnded: true, nextInning: 2, homeTotal: 2, visitorRunsThisInning: 2, visitorsBefore: 0 }), tie.commentary, O)
    expect(tie.calls).toContain('say(visitorsTie)')
    const lead = recorder()
    await playSequence(lead.field, lead.sfx, lead.announce, done({ outcome: 'strikeout', inningEnded: true, nextInning: 2, homeTotal: 2, visitorRunsThisInning: 3, visitorsBefore: 1 }), lead.commentary, O)
    expect(lead.calls).toContain('say(visitorsLead)')
  })
  it('calls the kid retaking the lead on a scoring play', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'double', runsScored: 2, homeTotal: 4, visitorsBefore: 3 }), r.commentary, O)
    expect(r.calls).toContain('say(kidRetakesLead)')
    expect(r.calls).toContain('announce(2 RUNS SCORED!)')
  })
  it('a loss: no fanfare, no celebration, TOUGH LOSS banner and the kind loss call', async () => {
    const r = recorder()
    await playSequence(r.field, r.sfx, r.announce, done({ outcome: 'single', gameOver: true, homeTotal: 1, visitorRunsThisInning: 2, visitorsBefore: 1, gameResult: 'loss' }), r.commentary, O)
    expect(r.calls).not.toContain('sfx.fanfare')
    expect(r.calls).not.toContain('playGameOver(0)')
    expect(r.calls).toContain('banner')
    expect(r.calls).toContain('announce(TOUGH LOSS)')
    expect(r.calls).toContain('say(loss)')
    expect(r.calls.indexOf('say(visitorsLead)')).toBeLessThan(r.calls.indexOf('say(loss)'))
  })
  it('a win celebrates; a come-from-behind final play is a walk off', async () => {
    const win = recorder()
    await playSequence(win.field, win.sfx, win.announce, done({ outcome: 'single', gameOver: true, homeTotal: 5, visitorRunsThisInning: 0, visitorsBefore: 2, gameResult: 'win' }), win.commentary, O)
    expect(win.calls).toContain('playGameOver(0)')
    expect(win.calls).toContain('announce(HOME TEAM WINS!)')
    expect(win.calls).toContain('say(win)')
    const wo = recorder()
    await playSequence(wo.field, wo.sfx, wo.announce, done({ outcome: 'homeRun', runsScored: 2, gameOver: true, homeTotal: 4, visitorRunsThisInning: 1, visitorsBefore: 2, gameResult: 'win' }), wo.commentary, O)
    expect(wo.calls).toContain('announce(WALK OFF!)')
    expect(wo.calls).toContain('say(walkOff)')
    expect(wo.calls).not.toContain('say(kidRetakesLead)')
  })
})
