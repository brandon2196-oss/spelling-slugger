/**
 * Buffer playback for pre-recorded clips (SFX pools, baked announcer lines). One shared AudioContext,
 * decoded buffers cached by URL, and a master gain for volume/mute. `play` never throws and never waits
 * more than MAX_WAIT_MS, so a broken or stuck clip can't lock the game.
 */
export const MAX_WAIT_MS = 7000

export interface ClipPlayer {
  load(url: string): Promise<void>
  play(url: string): Promise<void>
  preload(urls: string[]): Promise<void>
  setVolume(v: number): void
  setMuted(m: boolean): void
  /** Create/resume the AudioContext. Call from a user gesture (iOS/Safari unlock). */
  resume(): void
}

export interface ClipPlayerOptions {
  fetchImpl?: typeof fetch
  /** Test seam; defaults to the browser AudioContext. */
  createContext?: () => AudioContext | null
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
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let volume = 1
  let muted = false

  const level = () => (muted ? 0 : volume)

  function context(): { ctx: AudioContext; master: GainNode } | null {
    if (!ctx) {
      ctx = makeCtx()
      if (!ctx) return null
      master = ctx.createGain()
      master.gain.value = level()
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    return master ? { ctx, master } : null
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

  async function play(url: string): Promise<void> {
    if (level() <= 0) return
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
      src.connect(c.master)
      const timer = setTimeout(() => {
        try { src.stop() } catch { /* already stopped */ }
        resolve()
      }, MAX_WAIT_MS)
      src.onended = () => { clearTimeout(timer); resolve() }
      try { src.start() } catch { clearTimeout(timer); resolve() }
    })
  }

  return {
    load,
    play,
    async preload(urls) {
      await Promise.allSettled(urls.map(load))
    },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v))
      if (master) master.gain.value = level()
    },
    resume() {
      context()
    },
    setMuted(m) {
      muted = m
      if (master) master.gain.value = level()
    },
  }
}

/** The app-wide player shared by SFX and baked announcer lines; settings drive its volume/mute. */
export const clips = createClipPlayer()
