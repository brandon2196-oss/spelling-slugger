import { describe, expect, it, vi } from 'vitest'
import { createClipPlayer } from './clips'
import { DUCK_GAIN, REVERB_IR_URL, REVERB_WET } from './mixer'

type Param = { value: number; calls: Array<[string, number, number?]>; cancelScheduledValues: (t: number) => void; setValueAtTime: (v: number, t: number) => void; linearRampToValueAtTime: (v: number, t: number) => void }
type Node = { kind: string; gain: Param; connects: unknown[]; connect: (n: unknown) => void; buffer?: unknown }
type Src = { buffer: unknown; loop: boolean; onended: null | (() => void); connects: unknown[]; connect: (n: unknown) => void; start: () => void; stop: () => void }

function fakeCtx(opts: { endAfterMs?: number | null } = {}) {
  const endAfter = opts.endAfterMs === undefined ? 5 : opts.endAfterMs
  const started: unknown[] = []
  const gains: Node[] = []
  const convolvers: Node[] = []
  const sources: Src[] = []
  const mkParam = (): Param => {
    const p: Param = {
      value: 1, calls: [],
      cancelScheduledValues: (t) => { p.calls.push(['cancel', t]) },
      setValueAtTime: (v, t) => { p.calls.push(['set', v, t]) },
      linearRampToValueAtTime: (v, t) => { p.calls.push(['ramp', v, t]); p.value = v },
    }
    return p
  }
  const mkNode = (kind: string): Node => {
    const n: Node = { kind, gain: mkParam(), connects: [], connect: (to) => { n.connects.push(to) } }
    return n
  }
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: { kind: 'destination' },
    resume: vi.fn(async () => {}),
    createGain: () => { const g = mkNode('gain'); gains.push(g); return g },
    createConvolver: () => { const c = mkNode('convolver'); convolvers.push(c); return c },
    decodeAudioData: vi.fn(async (_b: ArrayBuffer) => ({ duration: 0.01 })),
    createBufferSource: () => {
      const src: Src = {
        buffer: null, loop: false, onended: null, connects: [],
        connect: (to) => { src.connects.push(to) },
        start: () => { started.push(src.buffer); if (endAfter !== null && !src.loop) setTimeout(() => src.onended?.(), endAfter) },
        stop: () => { src.onended?.() },
      }
      sources.push(src)
      return src
    },
  }
  /** gains[0] is master; gains[1..4] are the buses in BUSES order. */
  const bus = (name: 'sfx' | 'crowd' | 'music' | 'voice') => gains[1 + ['sfx', 'crowd', 'music', 'voice'].indexOf(name)]!
  return { ctx: ctx as unknown as AudioContext, started, gains, convolvers, sources, bus }
}

const okFetch = vi.fn(async (url: string) =>
  url.includes('missing') ? new Response('nope', { status: 404 }) : new Response(new ArrayBuffer(8)),
) as unknown as typeof fetch
const noIrFetch = vi.fn(async (url: string) =>
  url === REVERB_IR_URL || url.includes('missing') ? new Response('nope', { status: 404 }) : new Response(new ArrayBuffer(8)),
) as unknown as typeof fetch
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('ClipPlayer', () => {
  it('loads and plays, resolving when the clip ends', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.load('/a.mp3')
    await p.play('/a.mp3')
    expect(f.started).toHaveLength(1)
  })

  it('skips audio when muted or volume 0', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    p.setMuted(true)
    await p.play('/a.mp3')
    p.setMuted(false)
    p.setVolume(0)
    await p.play('/a.mp3')
    expect(f.started).toHaveLength(0)
  })

  it('rejects load for a missing URL but play resolves without throwing', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await expect(p.load('/missing.mp3')).rejects.toThrow()
    await expect(p.play('/missing.mp3')).resolves.toBeUndefined()
    expect(f.started).toHaveLength(0)
  })

  it('preload caches so each URL is fetched once', async () => {
    const fetchImpl = vi.fn(noIrFetch)
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: fetchImpl as unknown as typeof fetch, createContext: () => f.ctx })
    await p.preload(['/a.mp3', '/b.mp3', '/missing.mp3'])
    await p.play('/a.mp3')
    await p.play('/b.mp3')
    const clipFetches = fetchImpl.mock.calls.filter(([u]) => u !== REVERB_IR_URL)
    expect(clipFetches).toHaveLength(3)
    expect(f.started).toHaveLength(2)
  })

  it('caps the wait so a stuck clip cannot lock play', async () => {
    vi.useFakeTimers()
    const f = fakeCtx({ endAfterMs: null })
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.load('/a.mp3')
    let done = false
    const run = p.play('/a.mp3').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(6900)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    await run
    expect(done).toBe(true)
    vi.useRealTimers()
  })

  it('builds four buses into master and routes clips to their bus (sfx by default)', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.play('/a.ogg')
    await p.play('/b.ogg', { bus: 'crowd' })
    const master = f.gains[0]!
    for (const b of ['sfx', 'crowd', 'music', 'voice'] as const) expect(f.bus(b).connects).toContain(master)
    expect(f.sources[0]!.connects).toEqual([f.bus('sfx')])
    expect(f.sources[1]!.connects).toEqual([f.bus('crowd')])
  })

  it('a voice clip ducks crowd and music 9 dB, then recovers when it ends', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    await p.load('/w.mp3')
    const run = p.play('/w.mp3', { bus: 'voice' })
    await flush()
    expect(f.bus('crowd').gain.calls).toContainEqual(['ramp', DUCK_GAIN, 0.08])
    expect(f.bus('music').gain.calls).toContainEqual(['ramp', DUCK_GAIN, 0.08])
    expect(f.bus('sfx').gain.calls).toEqual([])
    await run
    expect(f.bus('crowd').gain.calls.at(-1)).toEqual(['ramp', 1, 0.4])
  })

  it('duckStart and duckEnd drive the same curve (browser speech fallback)', () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    p.resume()
    p.duckStart()
    expect(f.bus('music').gain.calls).toContainEqual(['ramp', DUCK_GAIN, 0.08])
    p.duckEnd()
    expect(f.bus('music').gain.calls.at(-1)).toEqual(['ramp', 1, 0.4])
  })

  it('adds a 12 percent wet convolver on the voice bus when the IR loads', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: okFetch, createContext: () => f.ctx })
    p.resume()
    await flush(); await flush()
    expect(f.convolvers).toHaveLength(1)
    expect(f.bus('voice').connects).toContain(f.convolvers[0])
    const wet = f.gains.find((g) => f.convolvers[0]!.connects.includes(g))!
    expect(wet.gain.value).toBe(REVERB_WET)
    expect(wet.connects).toContain(f.gains[0])
  })

  it('keeps the voice bus dry when the IR is missing', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: noIrFetch, createContext: () => f.ctx })
    p.resume()
    await flush(); await flush()
    expect(f.convolvers).toHaveLength(0)
  })
})
