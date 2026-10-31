import { createClipPlayer } from '../../audio/clips'
import { ambienceFor, type FieldBeat } from '../../audio/layering'
import { DUCK_GAIN } from '../../audio/mixer'
import { AMBIENCE_URLS, POOL_SPEC, Sfx } from '../../audio/sfx'
import { EMPTY_BASES } from '../../engine/bases'
import type { SubmitEvent } from '../../engine/types'
import { fakeClipPlayer } from '../../test/fakeClipPlayer'
import { playSequence } from './playSequence'

const word = { position: 0, text: 'cat', sentence: null, source: 'current' as const, sourceWordId: null, difficulty: 'medium' as const }
const done = (over: Partial<Extract<SubmitEvent, { kind: 'at-bat-complete' }>>): SubmitEvent => ({
  kind: 'at-bat-complete', outcome: 'double', attempts: [], runsScored: 0, basesBefore: EMPTY_BASES, basesAfter: EMPTY_BASES,
  outsAfter: 0, inningEnded: false, nextInning: 1, gameOver: false, correctSpelling: 'cat', word, visitorRunsThisInning: null, visitorsBefore: 0, homeTotal: 0, gameResult: null, ...over,
})
const quiet = async () => {}
const O = { pitchCall: 'mitt' as const, scale: 0 }
const folders = (p: ReturnType<typeof fakeClipPlayer>) => p.played.map((x) => x.url.split('/')[3])
const live = (pool: keyof typeof POOL_SPEC) => POOL_SPEC[pool].n > 0

describe('ballpark sound end to end', () => {
  it('home run: crack-hr, cheer-hr, fanfare, organ charge, cheers on the crowd bus', async () => {
    const p = fakeClipPlayer()
    await playSequence(null, new Sfx(p), quiet, done({ outcome: 'homeRun', runsScored: 2 }), quiet, O)
    expect(folders(p)).toEqual((['crack-hr', 'cheer-hr', 'fanfare', 'organ-charge'] as const).filter(live))
    expect(p.played.filter((x) => x.url.includes('cheer')).every((x) => x.bus === 'crowd')).toBe(true)
  })

  it('strike: mitt and umpire, never a UI beep', async () => {
    const p = fakeClipPlayer()
    await playSequence(null, new Sfx(p), quiet, { kind: 'strike', strike: 1, attemptsSoFar: [] }, quiet, O)
    expect(folders(p)).toEqual((['mitt', 'ump-strike'] as const).filter(live))
  })

  it('a stubbed umpire pool leaves the rest of the stack intact', async () => {
    const p = fakeClipPlayer()
    const spec = { ...POOL_SPEC, 'ump-strike3': { n: 0, bus: 'sfx' as const } }
    await playSequence(null, new Sfx(p, Math.random, spec), quiet, done({ outcome: 'strikeout' }), quiet, O)
    expect(folders(p)).toEqual((['groan'] as const).filter(live))
  })

  it('field beats drive the double at real speed: wall fires on the beat, not the 700 ms fallback', async () => {
    vi.useFakeTimers()
    const p = fakeClipPlayer()
    let beat: ((b: FieldBeat) => void) | null = null
    const run = playSequence(null, new Sfx(p), quiet, done({ outcome: 'double', runsScored: 1 }), quiet, {
      pitchCall: 'whiff', scale: 1, onBeatSink: (fn) => { beat = fn },
    })
    await vi.advanceTimersByTimeAsync(300)
    beat!('wall')
    beat!('runScored')
    await vi.advanceTimersByTimeAsync(1000)
    await run
    expect(folders(p).filter((f) => f === 'ball-wall')).toHaveLength(live('ball-wall') ? 1 : 0)
    expect(folders(p).filter((f) => f === 'organ-charge')).toHaveLength(live('organ-charge') ? 1 : 0)
    vi.useRealTimers()
  })

  it('ambience follows the bases and stops when sfx is disabled (mute)', async () => {
    const p = fakeClipPlayer()
    const s = new Sfx(p)
    const flush = () => new Promise((r) => setTimeout(r, 0))
    s.ambience(ambienceFor(EMPTY_BASES)); await flush()
    s.ambience(ambienceFor({ first: true, second: false, third: false })); await flush()
    s.enabled = false; await flush()
    expect(p.loops.map((l) => [l.url, l.stopped])).toEqual([[AMBIENCE_URLS.low, true], [AMBIENCE_URLS.high, true]])
  })

  it('a word on the real voice bus ducks a cheer on the crowd bus', async () => {
    type G = { gain: { value: number; calls: unknown[][]; cancelScheduledValues: (t: number) => void; setValueAtTime: (v: number, t: number) => void; linearRampToValueAtTime: (v: number, t: number) => void }; connect: () => void }
    const gains: G[] = []
    const mkGain = (): G => {
      const calls: unknown[][] = []
      const g: G = {
        gain: {
          value: 1, calls,
          cancelScheduledValues: (t) => { calls.push(['cancel', t]) },
          setValueAtTime: (v, t) => { calls.push(['set', v, t]) },
          linearRampToValueAtTime: (v, t) => { calls.push(['ramp', v, t]) },
        },
        connect: () => {},
      }
      gains.push(g)
      return g
    }
    const ctx = {
      state: 'running', currentTime: 0, destination: {}, resume: async () => {},
      createGain: mkGain,
      decodeAudioData: async () => ({ duration: 0.01 }),
      createBufferSource: () => {
        const s = { buffer: null, loop: false, onended: null as null | (() => void), connect: () => {}, start: () => { setTimeout(() => s.onended?.(), 5) }, stop: () => {} }
        return s
      },
    } as unknown as AudioContext
    const fetchImpl = (async (u: string) => (u.includes('/ir/') ? new Response('', { status: 404 }) : new Response(new ArrayBuffer(8)))) as typeof fetch
    const player = createClipPlayer({ fetchImpl, createContext: () => ctx })
    new Sfx(player).cheerBig()
    await player.play('/audio/words/abc.mp3', { bus: 'voice' })
    const crowd = gains[2]! // gains[0] master, then sfx, crowd, music, voice
    expect(crowd.gain.calls).toContainEqual(['ramp', DUCK_GAIN.crowd, 0.08])
    expect(crowd.gain.calls.at(-1)).toEqual(['ramp', 1, 0.4])
  })
})
