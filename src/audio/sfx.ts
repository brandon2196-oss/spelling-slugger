/**
 * Ballpark sound effects from CC0 recordings (see AUDIO-CREDITS.md) under public/audio/sfx/.
 * Each cue draws from a pool via the no-repeat picker and plays on its mixer bus. A pool with n = 0
 * is a stub (CC0 search failed): its cue plays nothing. Ambience is one looped bed on the crowd bus.
 */
import { clips, type ClipPlayer, type LoopHandle } from './clips'
import type { Bus } from './mixer'
import { createPicker } from './pool'

export type OrganRiff = 'charge' | 'inning' | 'walkup'
export type AmbienceLevel = 'off' | 'low' | 'high'

/** Variants on disk per pool and the bus each plays on. Set n to 0 to stub a pool (Task 8). */
export const POOL_SPEC = {
  crack: { n: 4, bus: 'sfx' },
  'crack-hr': { n: 3, bus: 'sfx' },
  whiff: { n: 4, bus: 'sfx' },
  mitt: { n: 4, bus: 'sfx' },
  'ump-strike': { n: 4, bus: 'sfx' },
  'ump-strike3': { n: 3, bus: 'sfx' },
  'ump-ball4': { n: 3, bus: 'sfx' },
  'ball-wall': { n: 2, bus: 'sfx' },
  'cheer-small': { n: 3, bus: 'crowd' },
  'cheer-big': { n: 3, bus: 'crowd' },
  'cheer-hr': { n: 3, bus: 'crowd' },
  groan: { n: 3, bus: 'crowd' },
  fanfare: { n: 3, bus: 'music' },
  'organ-charge': { n: 3, bus: 'music' },
  'organ-walkup': { n: 4, bus: 'music' },
  'organ-inning': { n: 3, bus: 'music' },
} as const satisfies Record<string, { n: number; bus: Bus }>

export type SfxPool = keyof typeof POOL_SPEC
export type PoolSpec = Record<SfxPool, { n: number; bus: Bus }>

const urlsFor = (pool: string, n: number) => Array.from({ length: n }, (_, i) => `/audio/sfx/${pool}/${pool}-${i + 1}.ogg`)

export const SFX_POOLS = Object.fromEntries(
  (Object.keys(POOL_SPEC) as SfxPool[]).map((k) => [k, urlsFor(k, POOL_SPEC[k].n)]),
) as Record<SfxPool, string[]>

export const AMBIENCE_URLS = {
  low: '/audio/sfx/ambience/ambience-low.ogg',
  high: '/audio/sfx/ambience/ambience-high.ogg',
} as const

/** The bed sits under everything; cheers ride on top of it. */
export const AMBIENCE_GAIN = 0.5

/** Every SFX URL, for preloading. */
export const ALL_SFX_URLS: string[] = [...Object.values(SFX_POOLS).flat(), AMBIENCE_URLS.low, AMBIENCE_URLS.high]

export class Sfx {
  private _enabled = true
  private readonly player: ClipPlayer
  private readonly spec: PoolSpec
  private readonly pickers: Partial<Record<SfxPool, () => string>> = {}
  private wanted: AmbienceLevel = 'off'
  private playing: AmbienceLevel = 'off'
  private handle: LoopHandle | null = null
  private token = 0

  constructor(player: ClipPlayer = clips, rng: () => number = Math.random, spec: PoolSpec = POOL_SPEC) {
    this.player = player
    this.spec = spec
    for (const k of Object.keys(spec) as SfxPool[]) {
      if (spec[k].n > 0) this.pickers[k] = createPicker(urlsFor(k, spec[k].n), rng)
    }
  }

  get enabled(): boolean {
    return this._enabled
  }

  set enabled(on: boolean) {
    this._enabled = on
    this.syncAmbience()
  }

  /** Create (or resume) the audio context. Call from a user gesture. */
  unlock(): void {
    this.player.resume()
  }

  setVolume(v: number): void {
    this.player.setVolume(Math.max(0, Math.min(1, v)))
  }

  private fire(p: SfxPool): void {
    if (!this._enabled) return
    const pick = this.pickers[p]
    if (!pick) return // stub pool
    void this.player.play(pick(), { bus: this.spec[p].bus })
  }

  crack(): void { this.fire('crack') }
  crackHomeRun(): void { this.fire('crack-hr') }
  whiff(): void { this.fire('whiff') }
  mitt(): void { this.fire('mitt') }
  umpStrike(): void { this.fire('ump-strike') }
  umpStrike3(): void { this.fire('ump-strike3') }
  umpBall4(): void { this.fire('ump-ball4') }
  ballWall(): void { this.fire('ball-wall') }
  cheerSmall(): void { this.fire('cheer-small') }
  cheerBig(): void { this.fire('cheer-big') }
  cheerHr(): void { this.fire('cheer-hr') }
  groan(): void { this.fire('groan') }
  fanfare(): void { this.fire('fanfare') }
  organ(riff: OrganRiff): void { this.fire(`organ-${riff}`) }

  /** Crowd bed: 'low' on the game screen, 'high' with runners on, 'off' when leaving. */
  ambience(level: AmbienceLevel): void {
    this.wanted = level
    this.syncAmbience()
  }

  get ambienceLevel(): AmbienceLevel {
    return this.playing
  }

  private syncAmbience(): void {
    const target: AmbienceLevel = this._enabled ? this.wanted : 'off'
    if (target === this.playing) return
    this.handle?.stop()
    this.handle = null
    this.playing = target
    const token = ++this.token
    if (target === 'off') return
    void this.player.loop(AMBIENCE_URLS[target], { bus: 'crowd', gain: AMBIENCE_GAIN }).then((h) => {
      if (token === this.token) this.handle = h
      else h?.stop()
    })
  }
}

export const sfx = new Sfx()
