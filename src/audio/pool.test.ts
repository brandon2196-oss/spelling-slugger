import { createPicker } from './pool'

describe('createPicker', () => {
  it('never returns the same item twice in a row over 200 draws', () => {
    const pick = createPicker(['a', 'b', 'c'])
    let prev = pick()
    for (let i = 0; i < 200; i++) {
      const cur = pick()
      expect(cur).not.toBe(prev)
      prev = cur
    }
  })
  it('draws every item eventually', () => {
    const pick = createPicker([1, 2, 3, 4])
    const seen = new Set<number>()
    for (let i = 0; i < 200; i++) seen.add(pick())
    expect(seen.size).toBe(4)
  })
  it('a single item is always returned', () => {
    const pick = createPicker(['only'])
    for (let i = 0; i < 5; i++) expect(pick()).toBe('only')
  })
  it('an empty pool throws', () => {
    expect(() => createPicker([])).toThrow()
  })
  it('is deterministic for a given rng', () => {
    const a = createPicker(['x', 'y', 'z'], () => 0.99)
    expect([a(), a(), a()]).toEqual(['z', 'y', 'z'])
  })
})

/** A minimal AudioContext stand-in that records the parameters of every node so variants can be compared. */
function installFakeAudioContext() {
  const log: string[] = []
  const param = (name: string) => {
    let v = 0
    return {
      get value() { return v },
      set value(x: number) { v = x; log.push(`${name}=${x}`) },
      setValueAtTime: (x: number) => { log.push(`${name}@${x}`) },
      exponentialRampToValueAtTime: (x: number) => { log.push(`${name}~${x}`) },
      linearRampToValueAtTime: (x: number) => { log.push(`${name}-${x}`) },
    }
  }
  const node = (extra: Record<string, unknown> = {}) => ({
    connect(target: unknown) { return target },
    disconnect() {},
    start(t?: number) { log.push(`start@${t ?? 0}`) },
    stop(t?: number) { log.push(`stop@${t ?? 0}`) },
    ...extra,
  })
  class FakeCtx {
    sampleRate = 8000
    currentTime = 0
    state = 'running'
    destination = node()
    resume() { return Promise.resolve() }
    createGain() { return node({ gain: param('g') }) }
    createBiquadFilter() { return node({ frequency: param('f'), Q: param('q'), type: '' }) }
    createOscillator() { return node({ frequency: param('o'), type: '' }) }
    createBuffer(_c: number, len: number) { return { getChannelData: () => new Float32Array(len) } }
    createBufferSource() { return node({ buffer: null }) }
  }
  Object.defineProperty(window, 'AudioContext', { value: FakeCtx, configurable: true, writable: true })
  return log
}

describe('Sfx', () => {
  afterEach(() => {
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true, writable: true })
  })

  it('every effect is safe to call when the browser has no AudioContext', async () => {
    Object.defineProperty(window, 'AudioContext', { value: undefined, configurable: true, writable: true })
    const { Sfx } = await import('./sfx')
    const s = new Sfx()
    s.enabled = true
    expect(() => {
      s.unlock(); s.setVolume(0.5)
      s.crack(); s.whiff(); s.cheer(); s.walkChime(); s.strikeBuzz(); s.fanfare(); s.groan()
      s.organ('charge'); s.organ('inning'); s.organ('walkup')
    }).not.toThrow()
  })

  it.each(['crack', 'whiff', 'cheer', 'walkChime', 'strikeBuzz', 'fanfare', 'groan'] as const)(
    '%s draws from a pool of at least 3 variants with no immediate repeat',
    async (method) => {
      const log = installFakeAudioContext()
      const { Sfx } = await import('./sfx')
      const s = new Sfx()
      // Pin Math.random so the noise buffers don't make every call look unique.
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
      const signatures: string[] = []
      let rngSeq = 0
      for (let i = 0; i < 40; i++) {
        // Drive the picker with a changing rng while keeping noise deterministic.
        vi.spyOn(Math, 'random').mockImplementation(() => ((rngSeq++ * 0.37) % 1))
        log.length = 0
        s[method]()
        signatures.push(log.join('|'))
      }
      vi.restoreAllMocks()
      expect(new Set(signatures).size).toBeGreaterThanOrEqual(3)
      for (let i = 1; i < signatures.length; i++) expect(signatures[i]).not.toBe(signatures[i - 1])
    },
  )

  it('organ riffs are distinct from each other', async () => {
    const log = installFakeAudioContext()
    const { Sfx } = await import('./sfx')
    const s = new Sfx()
    const sig = (riff: 'charge' | 'inning' | 'walkup') => { log.length = 0; s.organ(riff); return log.join('|') }
    const charge = sig('charge'), inning = sig('inning'), walkup = sig('walkup')
    expect(charge).not.toBe(inning)
    expect(inning).not.toBe(walkup)
    expect(charge).not.toBe(walkup)
  })
})
