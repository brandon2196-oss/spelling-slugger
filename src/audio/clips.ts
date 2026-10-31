/**
 * Buffer playback for pre-recorded clips (SFX pools, booth lines, baked spelling words). One shared
 * AudioContext, decoded buffers cached by URL, a master gain for volume and mute, and four buses
 * (sfx, crowd, music, voice) into master. Anything on `voice` ducks crowd and music (see mixer.ts)
 * and gets a light stadium reverb. `play` never throws and never waits more than MAX_WAIT_MS.
 */
import { BUSES, DUCKED_BUSES, DUCK_GAIN, REVERB_IR_URL, REVERB_WET, createDucker, type Bus } from './mixer'

export const MAX_WAIT_MS = 7000

export interface PlayOptions {
  bus?: Bus
  /** Linear gain for this clip only (booth level match). Default 1. */
  gain?: number
}

export interface LoopOptions {
  bus: Bus
  gain?: number
}

export interface LoopHandle {
  stop(): void
}

export interface ClipPlayer {
  load(url: string): Promise<void>
  play(url: string, opts?: PlayOptions): Promise<void>
  preload(urls: string[]): Promise<void>
  setVolume(v: number): void
  setMuted(m: boolean): void
  /** Create/resume the AudioContext. Call from a user gesture (iOS/Safari unlock). */
  resume(): void
  /** Hold the voice duck (browser speech cannot enter the graph, so it ducks by hand). */
  duckStart(): void
  duckEnd(): void
  /** Start a seamless loop (ambience). Starts even while muted; master gain silences it. Null if unloadable. */
  loop(url: string, opts: LoopOptions): Promise<LoopHandle | null>
  /** Stop every clip and loop currently on the bus. */
  stopBus(bus: Bus): void
}

export interface ClipPlayerOptions {
  fetchImpl?: typeof fetch
  /** Test seam; defaults to the browser AudioContext. */
  createContext?: () => AudioContext | null
}

interface Graph {
  ctx: AudioContext
  master: GainNode
  buses: Record<Bus, GainNode>
}

function defaultContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx = (window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) as typeof AudioContext | undefined
  return Ctx ? new Ctx() : null
}

export function createClipPlayer(opts: ClipPlayerOptions = {}): ClipPlayer {
  const fetchImpl = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const makeCtx = opts.createContext ?? defaultContext
  const buffers = new Map<string, Promise<AudioBuffer>>()
  let graph: Graph | null = null
  let volume = 1
  let muted = false

  const level = () => (muted ? 0 : volume)
  const ducker = createDucker(
    () => (graph ? DUCKED_BUSES.map((b) => ({ param: graph!.buses[b].gain, gain: DUCK_GAIN[b] })) : []),
    () => graph?.ctx.currentTime ?? 0,
  )

  const active: Record<Bus, Set<AudioBufferSourceNode>> = { sfx: new Set(), crowd: new Set(), music: new Set(), voice: new Set() }

  /** Source into the bus, through its own gain node when gain is not 1. */
  function route(c: Graph, src: AudioBufferSourceNode, bus: Bus, gain = 1): void {
    if (gain === 1) {
      src.connect(c.buses[bus])
      return
    }
    const g = c.ctx.createGain()
    g.gain.value = gain
    src.connect(g)
    g.connect(c.buses[bus])
  }

  function context(): Graph | null {
    if (!graph) {
      const ctx = makeCtx()
      if (!ctx) return null
      const master = ctx.createGain()
      master.gain.value = level()
      master.connect(ctx.destination)
      const buses = Object.fromEntries(
        BUSES.map((b) => {
          const g = ctx.createGain()
          g.gain.value = 1
          g.connect(master)
          return [b, g]
        }),
      ) as Record<Bus, GainNode>
      graph = { ctx, master, buses }
      void attachReverb(graph)
    }
    if (graph.ctx.state === 'suspended') void graph.ctx.resume().catch(() => {})
    return graph
  }

  /** Voice bus: dry into master (already wired) plus a convolver at REVERB_WET. No IR means dry only. */
  async function attachReverb(g: Graph): Promise<void> {
    if (typeof g.ctx.createConvolver !== 'function') return
    try {
      await load(REVERB_IR_URL)
      const conv = g.ctx.createConvolver()
      conv.buffer = await buffers.get(REVERB_IR_URL)!
      const wet = g.ctx.createGain()
      wet.gain.value = REVERB_WET
      g.buses.voice.connect(conv)
      conv.connect(wet)
      wet.connect(g.master)
    } catch {
      /* spec open question 3: ship a dry voice bus */
    }
  }

  function load(url: string): Promise<void> {
    let p = buffers.get(url)
    if (!p) {
      p = (async () => {
        const c = context()
        if (!c) throw new Error('no AudioContext')
        const res = await fetchImpl(url)
        if (!res.ok) throw new Error(`clip ${url}: HTTP ${res.status}`)
        return c.ctx.decodeAudioData(await res.arrayBuffer())
      })()
      buffers.set(url, p)
      p.catch(() => buffers.delete(url)) // allow a later retry
    }
    return p.then(() => undefined)
  }

  async function play(url: string, o: PlayOptions = {}): Promise<void> {
    if (level() <= 0) return
    const bus = o.bus ?? 'sfx'
    let buffer: AudioBuffer
    try {
      await load(url)
      buffer = await buffers.get(url)!
    } catch {
      return
    }
    const c = context()
    if (!c) return
    await new Promise<void>((resolve) => {
      const src = c.ctx.createBufferSource()
      src.buffer = buffer
      route(c, src, bus, o.gain)
      active[bus].add(src)
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        active[bus].delete(src)
        clearTimeout(timer)
        if (bus === 'voice') ducker.end()
        resolve()
      }
      const timer = setTimeout(() => {
        try { src.stop() } catch { /* already stopped */ }
        finish()
      }, MAX_WAIT_MS)
      src.onended = finish
      if (bus === 'voice') ducker.start()
      try { src.start() } catch { finish() }
    })
  }

  async function loop(url: string, o: LoopOptions): Promise<LoopHandle | null> {
    let buffer: AudioBuffer
    try {
      await load(url)
      buffer = await buffers.get(url)!
    } catch {
      return null
    }
    const c = context()
    if (!c) return null
    const src = c.ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    route(c, src, o.bus, o.gain)
    active[o.bus].add(src)
    try {
      src.start()
    } catch {
      active[o.bus].delete(src)
      return null
    }
    return {
      stop() {
        active[o.bus].delete(src)
        try { src.stop() } catch { /* already stopped */ }
      },
    }
  }

  function stopBus(bus: Bus): void {
    for (const src of [...active[bus]]) {
      active[bus].delete(src)
      try { src.stop() } catch { /* already stopped */ }
    }
  }

  return {
    load,
    play,
    loop,
    stopBus,
    async preload(urls) {
      await Promise.allSettled(urls.map(load))
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v))
      if (graph) graph.master.gain.value = level()
    },
    setMuted(m) {
      muted = m
      if (graph) graph.master.gain.value = level()
    },
    resume() {
      context()
    },
    duckStart() {
      context()
      ducker.start()
    },
    duckEnd() {
      ducker.end()
    },
  }
}

/** The app-wide player shared by SFX, the booth and baked words; settings drive its volume/mute. */
export const clips = createClipPlayer()
