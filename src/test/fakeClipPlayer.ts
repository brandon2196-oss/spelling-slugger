import { vi } from 'vitest'
import type { ClipPlayer, LoopHandle, LoopOptions, PlayOptions } from '../audio/clips'
import type { Bus } from '../audio/mixer'

export interface FakeClipPlayer extends ClipPlayer {
  played: Array<{ url: string; bus: Bus; gain: number }>
  loops: Array<{ url: string; bus: Bus; gain: number; stopped: boolean }>
  /** Resolvers for plays still in flight when `hold` is true. */
  finish: Array<() => void>
}

/** A ClipPlayer that records instead of playing. `missing` URLs reject load and never play. */
export function fakeClipPlayer(opts: { missing?: (url: string) => boolean; hold?: boolean } = {}): FakeClipPlayer {
  const missing = opts.missing ?? (() => false)
  const played: FakeClipPlayer['played'] = []
  const loops: FakeClipPlayer['loops'] = []
  const finish: Array<() => void> = []
  return {
    played,
    loops,
    finish,
    load: vi.fn(async (url: string) => {
      if (missing(url)) throw new Error(`missing ${url}`)
    }),
    play: vi.fn((url: string, o: PlayOptions = {}) => {
      if (missing(url)) return Promise.resolve()
      played.push({ url, bus: o.bus ?? 'sfx', gain: o.gain ?? 1 })
      return opts.hold ? new Promise<void>((r) => finish.push(r)) : Promise.resolve()
    }),
    loop: vi.fn(async (url: string, o: LoopOptions): Promise<LoopHandle | null> => {
      if (missing(url)) return null
      const entry = { url, bus: o.bus, gain: o.gain ?? 1, stopped: false }
      loops.push(entry)
      return { stop: () => { entry.stopped = true } }
    }),
    stopBus: vi.fn(),
    preload: vi.fn(async () => {}),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    resume: vi.fn(),
    duckStart: vi.fn(),
    duckEnd: vi.fn(),
  }
}
