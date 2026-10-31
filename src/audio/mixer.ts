/**
 * Mixer constants and the duck scheduler (brief 5.3). The bus GainNodes live on ClipPlayer; this file
 * owns the names and the curve so a test can assert it without a real AudioContext.
 */
export const BUSES = ['sfx', 'crowd', 'music', 'voice'] as const
export type Bus = (typeof BUSES)[number]

/** Buses that drop while anything plays on `voice`. */
export const DUCKED_BUSES = ['crowd', 'music'] as const satisfies readonly Bus[]
export type DuckedBus = (typeof DUCKED_BUSES)[number]
/** Duck depth per bus. Music (organ, fanfare) drops further so the word VO stays clear. */
export const DUCK_DB_CROWD = -9
export const DUCK_DB_MUSIC = -18
export const DUCK_DB: Record<DuckedBus, number> = { crowd: DUCK_DB_CROWD, music: DUCK_DB_MUSIC }
export const DUCK_GAIN: Record<DuckedBus, number> = {
  crowd: 10 ** (DUCK_DB_CROWD / 20),
  music: 10 ** (DUCK_DB_MUSIC / 20),
}
export const DUCK_ATTACK_S = 0.08
export const DUCK_RELEASE_S = 0.4

/** Wet level of the stadium impulse response on the voice bus. */
export const REVERB_WET = 0.12
export const REVERB_IR_URL = '/audio/ir/stadium.ogg'

/** The slice of AudioParam the ducker uses. */
export interface DuckParam {
  value: number
  cancelScheduledValues(t: number): unknown
  setValueAtTime(v: number, t: number): unknown
  linearRampToValueAtTime(v: number, t: number): unknown
}

/** One param to duck and the gain it ramps to while held. */
export interface DuckTarget {
  param: DuckParam
  gain: number
}

export interface Ducker {
  start(): void
  end(): void
  /** Voices currently holding the duck. */
  readonly holds: number
}

/** Reference-counted duck: the first start ramps down, the last end ramps back up. */
export function createDucker(targets: () => DuckTarget[], now: () => number): Ducker {
  let holds = 0
  const ramp = (down: boolean, over: number) => {
    const t = now()
    for (const { param: p, gain } of targets()) {
      p.cancelScheduledValues(t)
      p.setValueAtTime(p.value, t)
      p.linearRampToValueAtTime(down ? gain : 1, t + over)
    }
  }
  return {
    get holds() {
      return holds
    },
    start() {
      holds++
      if (holds === 1) ramp(true, DUCK_ATTACK_S)
    },
    end() {
      if (holds === 0) return
      holds--
      if (holds === 0) ramp(false, DUCK_RELEASE_S)
    },
  }
}
