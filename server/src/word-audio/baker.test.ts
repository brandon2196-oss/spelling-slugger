// @vitest-environment node
import { clipHash } from '../../../src/audio/word-audio-profile'
import { createWordBaker, type Synth } from './baker'
import { createMemoryClipStorage } from './storage'

const noBackoff = () => 0

describe('word baker', () => {
  it('bakes word, slow, and sentence clips once each', async () => {
    const storage = createMemoryClipStorage()
    const synth = vi.fn<Synth>(async (t) => Buffer.from(t))
    const b = createWordBaker({ storage, synth, backoffMs: noBackoff })
    await b.enqueueWords([{ text: 'cat', sentence: 'The cat sat.' }, { text: 'cat', sentence: null }, { text: 'dog' }])
    await b.idle()
    expect(synth).toHaveBeenCalledTimes(5)
    expect((await storage.get(await clipHash('sentence', 'The cat sat.')))?.toString()).toBe('The cat sat.')
    expect(synth.mock.calls.find(([t, p]) => t === 'cat' && p.rate === '-45%')).toBeTruthy()
    expect(await b.status([{ text: 'cat', sentence: 'The cat sat.' }])).toEqual({ total: 3, ready: 3, pending: 0 })
  })

  it('skips clips already stored', async () => {
    const storage = createMemoryClipStorage()
    await storage.put(await clipHash('word', 'cat'), Buffer.from('x'))
    await storage.put(await clipHash('slow', 'cat'), Buffer.from('x'))
    const synth = vi.fn<Synth>(async () => Buffer.from('y'))
    const b = createWordBaker({ storage, synth })
    await b.enqueueWords([{ text: 'cat' }])
    await b.idle()
    expect(synth).not.toHaveBeenCalled()
  })

  it('caps concurrency', async () => {
    let live = 0
    let peak = 0
    const synth: Synth = async () => {
      live++
      peak = Math.max(peak, live)
      await new Promise((r) => setTimeout(r, 5))
      live--
      return Buffer.from('a')
    }
    const b = createWordBaker({ storage: createMemoryClipStorage(), synth, concurrency: 2 })
    await b.enqueueWords(['a', 'b', 'c', 'd', 'e'].map((text) => ({ text })))
    await b.idle()
    expect(peak).toBe(2)
  })

  it('retries then gives up without throwing', async () => {
    const storage = createMemoryClipStorage()
    let calls = 0
    const synth: Synth = async (t) => {
      calls++
      if (t === 'bad' || calls === 1) throw new Error('boom')
      return Buffer.from('ok')
    }
    const log = vi.fn()
    const b = createWordBaker({ storage, synth, attempts: 3, backoffMs: noBackoff, log, concurrency: 1 })
    await b.enqueueWords([{ text: 'good' }, { text: 'bad' }])
    await b.idle()
    expect(await storage.has(await clipHash('word', 'good'))).toBe(true)
    expect(await storage.has(await clipHash('word', 'bad'))).toBe(false)
    expect(log).toHaveBeenCalledTimes(2) // bad word + bad slow
    expect(await b.status([{ text: 'bad' }])).toEqual({ total: 2, ready: 0, pending: 0 })
  })

  it('reports pending while baking', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => { release = r })
    const b = createWordBaker({ storage: createMemoryClipStorage(), synth: async () => { await gate; return Buffer.from('a') } })
    await b.enqueueWords([{ text: 'cat' }])
    expect(await b.status([{ text: 'cat' }])).toEqual({ total: 2, ready: 0, pending: 2 })
    release()
    await b.idle()
  })
})
