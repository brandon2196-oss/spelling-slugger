import { EMPTY_BASES } from '../engine/bases'
import type { Outcome, SubmitEvent } from '../engine/types'
import { CUES, OFFSETS, ambienceFor, cheerFor, driveLayers, layersFor, pickPitchCall, type Cue, type SequenceSfx } from './layering'

const word = { position: 0, text: 'cat', sentence: null, source: 'current' as const, sourceWordId: null, difficulty: 'medium' as const }
const done = (outcome: Outcome, runsScored = 0): SubmitEvent => ({
  kind: 'at-bat-complete', outcome, attempts: [], runsScored, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
  outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'cat', word, visitorRunsThisInning: null, visitorsBefore: 0, gameResult: null,
})
const strike: SubmitEvent = { kind: 'strike', strike: 1, attemptsSoFar: [] }
const cueList = (e: SubmitEvent, call: 'whiff' | 'mitt' = 'whiff') => layersFor(e, call).map((l) => l.cue)

function rec() {
  const calls: string[] = []
  const sfx = {
    ...Object.fromEntries(CUES.map((c) => [c, () => { calls.push(c) }])),
    organ: (r: string) => { calls.push(`organ(${r})`) },
  } as SequenceSfx
  return { calls, sfx }
}

describe('layersFor', () => {
  it('single: crack on contact, then cheer-small at +120', () => {
    expect(layersFor(done('single'), 'whiff')).toEqual([
      { at: 0, cue: 'crack', beat: 'contact' }, { at: OFFSETS.cheer, cue: 'cheerSmall' },
    ])
  })
  it('double adds ball-wall on the wall beat (fallback +700)', () => {
    expect(layersFor(done('double', 1), 'whiff')).toContainEqual({ at: 700, cue: 'ballWall', beat: 'wall' })
  })
  it('2+ runs on a hit gets cheer-big', () => {
    expect(cueList(done('single', 2))).toContain('cheerBig')
  })
  it('home run: crack-hr on contact, cheer-hr +200, fanfare +1200 or leavesYard', () => {
    expect(layersFor(done('homeRun', 1), 'whiff')).toEqual([
      { at: 0, cue: 'crackHomeRun', beat: 'contact' }, { at: 200, cue: 'cheerHr' }, { at: 1200, cue: 'fanfare', beat: 'leavesYard' },
    ])
  })
  it('strike with the mitt call: mitt on pitchArrival, then the umpire +250', () => {
    expect(layersFor(strike, 'mitt')).toEqual([{ at: 0, cue: 'mitt', beat: 'pitchArrival' }, { at: 250, cue: 'umpStrike' }])
  })
  it('strike with the whiff call: whiff now (no beat), then the umpire', () => {
    expect(layersFor(strike, 'whiff')).toEqual([{ at: 0, cue: 'whiff' }, { at: 250, cue: 'umpStrike' }])
  })
  it('strikeout: ump-strike3 then groan, no mitt', () => {
    expect(cueList(done('strikeout'), 'mitt')).toEqual(['umpStrike3', 'groan'])
  })
  it('walk: mitt on pitchArrival then ump-ball4', () => {
    expect(layersFor(done('walk', 1), 'whiff')).toEqual([{ at: 0, cue: 'mitt', beat: 'pitchArrival' }, { at: 250, cue: 'umpBall4' }])
  })
  it('ignored: nothing', () => {
    expect(layersFor({ kind: 'ignored', reason: 'blank' }, 'whiff')).toEqual([])
  })
  it('one-cheer rule: never more than one cheer, big sizes only on HR or 2+ runs', () => {
    for (const outcome of ['single', 'double', 'homeRun', 'walk', 'strikeout'] as Outcome[]) {
      for (let runs = 0; runs <= 4; runs++) {
        const cs = cueList(done(outcome, runs)).filter((c): c is Cue => c.startsWith('cheer'))
        expect(cs.length).toBeLessThanOrEqual(1)
        if (cs[0] === 'cheerBig' || cs[0] === 'cheerHr') expect(outcome === 'homeRun' || runs >= 2).toBe(true)
        expect(cheerFor(outcome, runs) ?? undefined).toBe(cs[0])
      }
    }
  })
})

describe('driveLayers', () => {
  it('fallback: offset 0 now, the rest after offset times scale', () => {
    vi.useFakeTimers()
    const r = rec()
    driveLayers(layersFor(done('homeRun', 1), 'whiff'), r.sfx, 1)
    expect(r.calls).toEqual(['crackHomeRun'])
    vi.advanceTimersByTime(200)
    expect(r.calls).toEqual(['crackHomeRun', 'cheerHr'])
    vi.advanceTimersByTime(1000)
    expect(r.calls).toEqual(['crackHomeRun', 'cheerHr', 'fanfare'])
    vi.useRealTimers()
  })
  it('reduced motion (0.25) shrinks offsets', () => {
    const setTimer = vi.fn()
    driveLayers(layersFor(done('homeRun', 1), 'whiff'), rec().sfx, 0.25, setTimer)
    expect(setTimer.mock.calls.map((c) => c[1])).toEqual([50, 300])
  })
  it('scale 0 (VITE_NO_ANIMATION) fires the whole stack synchronously in order', () => {
    const r = rec()
    driveLayers(layersFor(done('double', 2), 'whiff'), r.sfx, 0)
    expect(r.calls).toEqual(['crack', 'cheerBig', 'ballWall'])
  })
  it('a beat fires its cue early and the fallback timer does not fire it again', () => {
    vi.useFakeTimers()
    const r = rec()
    const d = driveLayers(layersFor(done('double'), 'whiff'), r.sfx, 1)
    vi.advanceTimersByTime(300)
    d.onBeat('wall')
    expect(r.calls.filter((c) => c === 'ballWall')).toHaveLength(1)
    vi.advanceTimersByTime(1000)
    expect(r.calls.filter((c) => c === 'ballWall')).toHaveLength(1)
    vi.useRealTimers()
  })
  it('a beat after its fallback already fired is ignored', () => {
    const r = rec()
    const d = driveLayers(layersFor(strike, 'mitt'), r.sfx, 0)
    d.onBeat('pitchArrival')
    expect(r.calls.filter((c) => c === 'mitt')).toHaveLength(1)
  })
  it('runScored plays organ-charge once; organCharge() after it is a no-op', () => {
    const r = rec()
    const d = driveLayers(layersFor(done('single', 2), 'whiff'), r.sfx, 0)
    d.onBeat('runScored')
    d.onBeat('runScored')
    d.organCharge()
    expect(r.calls.filter((c) => c === 'organ(charge)')).toHaveLength(1)
  })
  it('beats with no matching layer do nothing', () => {
    const r = rec()
    const d = driveLayers(layersFor(done('single'), 'whiff'), r.sfx, 0)
    const before = [...r.calls]
    d.onBeat('wall'); d.onBeat('leavesYard')
    expect(r.calls).toEqual(before)
  })
})

describe('pickPitchCall and ambienceFor', () => {
  it('pickPitchCall splits on 0.5', () => {
    expect(pickPitchCall(() => 0.1)).toBe('whiff')
    expect(pickPitchCall(() => 0.9)).toBe('mitt')
  })
  it('ambience is high with any runner on, low with bases empty', () => {
    expect(ambienceFor(EMPTY_BASES)).toBe('low')
    expect(ambienceFor({ first: false, second: true, third: false })).toBe('high')
  })
})
