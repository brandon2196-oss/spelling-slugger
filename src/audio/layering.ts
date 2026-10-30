/**
 * Timed SFX stacks per play (brief 5.3). Pure: given one SubmitEvent and the pitch call, returns the
 * cues, their fallback offsets, and the field beat (locked with Phase 1) that fires each one early.
 * Phase 3 can replay any event through driveLayers without the live game.
 */
import type { Bases, Outcome, SubmitEvent } from '../engine/types'

/** Owned by Phase 1 (src/field/controller.ts); the field calls onBeat(beat) when the scene hits it. */
import type { FieldBeat } from '../field/controller'
export type { FieldBeat }

export const CUES = [
  'crack', 'crackHomeRun', 'whiff', 'mitt', 'umpStrike', 'umpStrike3', 'umpBall4', 'ballWall',
  'cheerSmall', 'cheerBig', 'cheerHr', 'fanfare', 'groan',
] as const
export type Cue = (typeof CUES)[number]
export type OrganRiff = 'charge' | 'inning' | 'walkup'
export type SequenceSfx = Record<Cue, () => void> & { organ(riff: OrganRiff): void }

/** Strike sound: decided in playSequence, never by scene animation. */
export type PitchCall = 'whiff' | 'mitt'

export interface Layer {
  /** Fallback offset in ms, before motionScale. */
  at: number
  cue: Cue
  /** Field beat that fires this cue early, when the field reports beats. */
  beat?: FieldBeat
}

export const OFFSETS = { cheer: 120, cheerHr: 200, fanfare: 1200, ballWall: 700, umpCall: 250, groan: 300 } as const

/** One-cheer rule (Jack Dalton spec): hits only; big sizes only on a home run or 2+ runs. */
export function cheerFor(outcome: Outcome, runs: number): Cue | null {
  if (outcome === 'homeRun') return 'cheerHr'
  if (outcome === 'single' || outcome === 'double') return runs >= 2 ? 'cheerBig' : 'cheerSmall'
  return null
}

export function layersFor(event: SubmitEvent, call: PitchCall): Layer[] {
  if (event.kind === 'ignored') return []
  if (event.kind === 'strike') {
    const first: Layer = call === 'mitt' ? { at: 0, cue: 'mitt', beat: 'pitchArrival' } : { at: 0, cue: 'whiff' }
    return [first, { at: OFFSETS.umpCall, cue: 'umpStrike' }]
  }
  switch (event.outcome) {
    case 'strikeout':
      return [{ at: 0, cue: 'umpStrike3' }, { at: OFFSETS.groan, cue: 'groan' }]
    case 'walk':
      return [{ at: 0, cue: 'mitt', beat: 'pitchArrival' }, { at: OFFSETS.umpCall, cue: 'umpBall4' }]
    case 'homeRun':
      return [
        { at: 0, cue: 'crackHomeRun', beat: 'contact' },
        { at: OFFSETS.cheerHr, cue: 'cheerHr' },
        { at: OFFSETS.fanfare, cue: 'fanfare', beat: 'leavesYard' },
      ]
    default: {
      const out: Layer[] = [{ at: 0, cue: 'crack', beat: 'contact' }]
      const cheer = cheerFor(event.outcome, event.runsScored)
      if (cheer) out.push({ at: OFFSETS.cheer, cue: cheer })
      if (event.outcome === 'double') out.push({ at: OFFSETS.ballWall, cue: 'ballWall', beat: 'wall' })
      return out
    }
  }
}

export interface LayerDriver {
  /** Hand this to the field. Unknown or repeated beats are ignored. */
  onBeat(beat: FieldBeat): void
  /** organ('charge') at most once per play (runScored beat or the run moment, whichever first). */
  organCharge(): void
}

/**
 * Fire each layer once: on its beat if the field reports it first, otherwise at `at * scale` ms.
 * Anything whose fallback rounds to 0 fires now, in order.
 */
export function driveLayers(
  layers: Layer[],
  sfx: SequenceSfx,
  scale: number,
  setTimer: (fn: () => void, ms: number) => unknown = setTimeout,
): LayerDriver {
  const fired = new Set<Layer>()
  let organDone = false
  const fire = (l: Layer) => {
    if (fired.has(l)) return
    fired.add(l)
    sfx[l.cue]()
  }
  for (const l of layers) {
    const ms = l.at * scale
    if (ms <= 0) fire(l)
    else setTimer(() => fire(l), ms)
  }
  const organCharge = () => {
    if (organDone) return
    organDone = true
    sfx.organ('charge')
  }
  return {
    onBeat(beat) {
      if (beat === 'runScored') return organCharge()
      for (const l of layers) if (l.beat === beat) fire(l)
    },
    organCharge,
  }
}

export function pickPitchCall(rng: () => number = Math.random): PitchCall {
  return rng() < 0.5 ? 'whiff' : 'mitt'
}

export function ambienceFor(bases: Bases): 'low' | 'high' {
  return bases.first || bases.second || bases.third ? 'high' : 'low'
}
