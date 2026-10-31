/**
 * The ONE place that turns an engine event into motion, sound, board text and booth commentary, in
 * order. The field may be null (not mounted yet, or mocked in tests); announcements still run.
 *
 * Board text and commentary for the same moment run concurrently; the next moment waits for both.
 */
import type { AnnounceEvent, CommentaryContext } from '../../audio/announcer'
import { driveLayers, layersFor, pickPitchCall, type FieldBeat, type PitchCall, type SequenceSfx } from '../../audio/layering'
import type { SubmitEvent } from '../../engine/types'
import type { FieldController } from '../../field/controller'
import { announcementsFor, isWalkOff, retookLead, visitorsCall } from './announcements'
import { motionScale } from './timing'

export type { FieldBeat, PitchCall, SequenceSfx } from '../../audio/layering'

export interface SequenceOptions {
  /** Mitt or whiff on a strike. Decided here, never by the scene. */
  pitchCall?: PitchCall
  /** Multiplier for fallback offsets; defaults to motionScale(). */
  scale?: number
  /**
   * Where to hand this play's onBeat. Defaults to the field's onBeat slot (Phase 1), cleared after
   * the play. Any beat the field never reports falls back to its motionScale offset.
   */
  onBeatSink?: (onBeat: (beat: FieldBeat) => void) => void
  /** Phase 3: called when the Visitors' runs for this inning should appear on the line score. */
  revealVisitors?: () => void
}

export type Announce = (text: string) => Promise<void>
export type Commentary = (event: AnnounceEvent, ctx: CommentaryContext) => Promise<void>

export async function playSequence(
  field: FieldController | null,
  sfx: SequenceSfx,
  announce: Announce,
  event: SubmitEvent,
  commentary: Commentary,
  opts: SequenceOptions = {},
): Promise<void> {
  if (event.kind === 'ignored') return
  const call = opts.pitchCall ?? pickPitchCall()
  // Cast keeps TS from narrowing to null: stack() assigns it inside a closure.
  let driver = null as ReturnType<typeof driveLayers> | null
  /** The contact stack for this play (layering.ts). Field beats fire cues early; offsets are the fallback. */
  const stack = () => {
    driver = driveLayers(layersFor(event, call), sfx, opts.scale ?? motionScale())
    const sink = opts.onBeatSink ?? ((fn: (beat: FieldBeat) => void) => { if (field) field.onBeat = fn })
    sink(driver.onBeat)
  }
  const texts = announcementsFor(event)
  const next = async () => {
    const t = texts.shift()
    if (t) await announce(t)
  }
  const ctx: CommentaryContext =
    event.kind === 'strike'
      ? { runs: 0, inning: 0 }
      : { runs: event.runsScored, inning: event.nextInning, word: event.word.text }
  /** Board text and the booth line for the same moment, together. */
  const moment = (evt: AnnounceEvent) => Promise.all([next(), commentary(evt, ctx)])

  try {
    await field?.playPitch()

    // The field animates WHILE the board text shows and the booth talks: a play never waits on a line.
    if (event.kind === 'strike') {
      stack()
      await Promise.all([field?.playStrike(event.strike), moment(event.strike === 1 ? 'strike1' : 'strike2')]) // STRIKE ONE! / TWO!
      return
    }

    switch (event.outcome) {
      case 'strikeout':
        stack()
        await Promise.all([field?.playStrike(3), moment('strikeout')]) // STRIKE THREE!
        break
      case 'walk':
        stack()
        await Promise.all([field?.playWalk(event.basesBefore, event.basesAfter, event.runsScored), moment('walk')]) // TAKE YOUR BASE!
        break
      default: {
        stack() // one cheer per play (layering.ts cheerFor)
        const hit = event.outcome
        await Promise.all([field?.playHit(hit, event.basesBefore, event.basesAfter, event.runsScored), moment(hit)])
      } // HOME RUN! / DOUBLE! / BASE HIT!
    }

    if (event.runsScored > 0) {
      if (driver) driver.organCharge()
      else sfx.organ('charge')
      // Coming from behind gets its own booth call; the walk-off call waits for the final.
      const call = !event.gameOver && retookLead(event) ? 'kidRetakesLead' : event.runsScored === 1 ? 'run' : 'runs'
      await moment(call) // RUN SCORED! / N RUNS SCORED!
    }

    if (event.inningEnded) {
      if (event.gameOver) {
        await next() // THREE OUTS! (the booth saves its breath for the game-over call)
      } else {
        sfx.organ('inning')
        await moment('inningEnd') // THREE OUTS!
      }
    }

    // The Visitors bat at inning end only: their runs land on the line score now, never mid-inning.
    const visitors = async () => {
      opts.revealVisitors?.()
      const call = visitorsCall(event)
      if (call) await moment(call) // VISITORS SCORE N!
    }

    if (event.gameOver) {
      await visitors()
      if (event.gameResult === 'loss') {
        // A quiet finish: no fanfare, no celebration. The booth is kind (announcer-lines.json loss).
        await Promise.all([field?.banner('TOUGH LOSS'), moment('loss')]) // TOUGH LOSS
      } else {
        if (event.outcome !== 'homeRun') sfx.fanfare()
        await field?.playGameOver(event.runsScored)
        const call = event.gameResult === null ? 'gameOver' : isWalkOff(event) ? 'walkOff' : 'win'
        await moment(call) // GAME OVER! / WALK OFF! / HOME TEAM WINS!
      }
    } else if (event.inningEnded) {
      await Promise.all([field?.playInningEnd(event.nextInning), visitors()])
      await next() // NEW INNING!
    }
  } finally {
    // The field keeps no stale hook between plays.
    if (field && !opts.onBeatSink) field.onBeat = undefined
  }
}

/**
 * Walk-up organ for a new batter. Returns a function to call when an at-bat comes up; it plays
 * organ('walkup') once per at-bat index and ignores repeats (re-renders, Hear again, extra pitches).
 * The word that follows rides the voice bus, which ducks the organ under it.
 */
export function walkupOnce(sfx: Pick<SequenceSfx, 'organ'>): (atBatIndex: number) => boolean {
  let last = -1
  return (atBatIndex) => {
    if (atBatIndex === last) return false
    last = atBatIndex
    sfx.organ('walkup')
    return true
  }
}
