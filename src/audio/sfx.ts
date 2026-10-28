/**
 * Sound effects from real recorded clips (CC0; see AUDIO-CREDITS.md) under public/audio/sfx/.
 * Each effect draws from a pool of 3–4 variants via the no-repeat picker, so a long game doesn't
 * sound like a loop, and plays through the shared ClipPlayer (volume/mute live there).
 */
import { clips, type ClipPlayer } from './clips'
import { createPicker } from './pool'

export type OrganRiff = 'charge' | 'inning' | 'walkup'

const pool = (folder: string, n: number) =>
  Array.from({ length: n }, (_, i) => `/audio/sfx/${folder}/${folder}-${i + 1}.ogg`)

export const SFX_POOLS = {
  crack: pool('crack', 4),
  whiff: pool('whiff', 4),
  cheer: pool('cheer', 4),
  groan: pool('groan', 3),
  walkChime: pool('walkChime', 4),
  strikeBuzz: pool('strikeBuzz', 4),
  fanfare: pool('fanfare', 3),
  'organ-charge': pool('organ-charge', 3),
  'organ-inning': pool('organ-inning', 3),
  'organ-walkup': pool('organ-walkup', 3),
} as const

export type SfxPool = keyof typeof SFX_POOLS

/** Every SFX URL, for preloading. */
export const ALL_SFX_URLS: string[] = Object.values(SFX_POOLS).flat()

type Player = ClipPlayer & { resume?: () => void }

export class Sfx {
  enabled = true
  private readonly pickers: Record<SfxPool, () => string>
  private readonly player: Player

  constructor(player: Player = clips, rng: () => number = Math.random) {
    this.player = player
    this.pickers = Object.fromEntries(
      (Object.keys(SFX_POOLS) as SfxPool[]).map((k) => [k, createPicker([...SFX_POOLS[k]], rng)]),
    ) as Record<SfxPool, () => string>
  }

  /** Create (or resume) the audio context. Call from a user gesture. */
  unlock(): void {
    this.player.resume?.()
  }

  setVolume(v: number): void {
    this.player.setVolume(Math.max(0, Math.min(1, v)))
  }

  private fire(p: SfxPool): void {
    if (!this.enabled) return
    void this.player.play(this.pickers[p]())
  }

  /** Bat on ball. */
  crack(): void { this.fire('crack') }
  /** Swing and a miss. */
  whiff(): void { this.fire('whiff') }
  /**
   * Crowd cheer. `durationMs` is kept for API compatibility but ignored: the recorded clips
   * (~2–3 s) have their own natural swell and fade.
   */
  cheer(_durationMs?: number): void { this.fire('cheer') }
  /** Ball four / take your base. */
  walkChime(): void { this.fire('walkChime') }
  /** Strike buzzer. */
  strikeBuzz(): void { this.fire('strikeBuzz') }
  /** Run scored / game over fanfare. */
  fanfare(): void { this.fire('fanfare') }
  /** Crowd "aww". */
  groan(): void { this.fire('groan') }
  /** Ballpark riffs. */
  organ(riff: OrganRiff): void { this.fire(`organ-${riff}`) }
}

export const sfx = new Sfx()
