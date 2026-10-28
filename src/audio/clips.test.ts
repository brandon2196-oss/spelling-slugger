import { describe, expect, it, vi } from 'vitest'
import { createClipPlayer } from './clips'

function fakeCtx() {
  const started: unknown[] = []
  const gain = { gain: { value: 1 }, connect: vi.fn() }
  const ctx = {
    state: 'running',
    destination: {},
    resume: vi.fn(async () => {}),
    createGain: () => gain,
    decodeAudioData: vi.fn(async (_b: ArrayBuffer) => ({ duration: 0.01 })),
    createBufferSource: () => {
      const src: { buffer: unknown; onended: null | (() => void); connect: () => void; start: () => void; stop: () => void } = {
        buffer: null, onended: null, connect: () => {},
        start: () => { started.push(src.buffer); setTimeout(() => src.onended?.(), 5) },
        stop: () => {},
      }
      return src
    },
  }
  return { ctx: ctx as unknown as AudioContext, started, gain }
}

const okFetch = vi.fn(async (url: string) =>
  url.includes('missing') ? new Response('nope', { status: 404 }) : new Response(new ArrayBuffer(8)),
) as unknown as typeof fetch

describe('ClipPlayer', () => {
  it('loads and plays, resolving when the clip ends', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: okFetch, createContext: () => f.ctx })
    await p.load('/a.mp3')
    await p.play('/a.mp3')
    expect(f.started).toHaveLength(1)
  })

  it('skips audio when muted or volume 0', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: okFetch, createContext: () => f.ctx })
    p.setMuted(true)
    await p.play('/a.mp3')
    p.setMuted(false)
    p.setVolume(0)
    await p.play('/a.mp3')
    expect(f.started).toHaveLength(0)
  })

  it('rejects load for a missing URL but play resolves without throwing', async () => {
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: okFetch, createContext: () => f.ctx })
    await expect(p.load('/missing.mp3')).rejects.toThrow()
    await expect(p.play('/missing.mp3')).resolves.toBeUndefined()
    expect(f.started).toHaveLength(0)
  })

  it('preload caches so each URL is fetched once', async () => {
    const fetchImpl = vi.fn(okFetch)
    const f = fakeCtx()
    const p = createClipPlayer({ fetchImpl: fetchImpl as unknown as typeof fetch, createContext: () => f.ctx })
    await p.preload(['/a.mp3', '/b.mp3', '/missing.mp3'])
    await p.play('/a.mp3')
    await p.play('/b.mp3')
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(f.started).toHaveLength(2)
  })

  it('caps the wait so a stuck clip cannot lock play', async () => {
    vi.useFakeTimers()
    const f = fakeCtx()
    ;(f.ctx as unknown as { createBufferSource: () => unknown }).createBufferSource = () => ({ buffer: null, onended: null, connect: () => {}, start: () => {}, stop: () => {} })
    const p = createClipPlayer({ fetchImpl: okFetch, createContext: () => f.ctx })
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
})
