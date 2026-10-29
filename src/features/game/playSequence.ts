/**
 * The ONE place that turns an engine event into motion, sound, board text and booth commentary, in
 * order. The field may be null (not mounted yet, or mocked in tests); announcements still run.
 *
 * Board text and commentary for the same moment run concurrently; the next moment waits for both.
 */
import type { AnnounceEvent, CommentaryContext } from '../../audio/announcer'
import type { SubmitEvent } from '../../engine/types'
import type { FieldController } from '../../field/controller'
import { announcementsFor } from './announcements'

export interface SequenceSfx {
  crack(): void
  whiff(): void
  cheer(): void
  walkChime(): void
  strikeBuzz(): void
  fanfare(): void
  groan(): void
  organ(riff: 'charge' | 'inning' | 'walkup'): void
}

export type Announce = (text: string) => Promise<void>
export type Commentary = (event: AnnounceEvent, ctx: CommentaryContext) => Promise<void>

export async function playSequence(
  field: FieldController | null,
  sfx: SequenceSfx,
  announce: Announce,
  event: SubmitEvent,
  commentary: Commentary,
): Promise<void> {
  if (event.kind === 'ignored') return
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

  await field?.playPitch()

  // The field animates WHILE the board text shows and the booth talks: a play never waits on a line.
  if (event.kind === 'strike') {
    sfx.whiff()
    await Promise.all([field?.playStrike(event.strike), moment(event.strike === 1 ? 'strike1' : 'strike2')]) // STRIKE ONE! / TWO!
    return
  }

  switch (event.outcome) {
    case 'strikeout':
      sfx.strikeBuzz()
      sfx.groan()
      await Promise.all([field?.playStrike(3), moment('strikeout')]) // STRIKE THREE!
      break
    case 'walk':
      sfx.walkChime()
      await Promise.all([field?.playWalk(event.basesBefore, event.basesAfter, event.runsScored), moment('walk')]) // TAKE YOUR BASE!
      break
    default: {
      sfx.crack()
      // Home-run animation/call lands in a later task; until then it plays as a double.
      const hit = event.outcome === 'homeRun' ? 'double' : event.outcome
      await Promise.all([field?.playHit(hit, event.basesBefore, event.basesAfter, event.runsScored), moment(hit)])
    } // DOUBLE! / BASE HIT!
  }

  if (event.runsScored > 0) {
    sfx.cheer()
    sfx.organ('charge')
    await moment(event.runsScored === 1 ? 'run' : 'runs') // RUN SCORED! / N RUNS SCORED!
  }

  if (event.inningEnded) {
    if (event.gameOver) {
      await next() // THREE OUTS! (the booth saves its breath for the game-over call)
    } else {
      sfx.organ('inning')
      await moment('inningEnd') // THREE OUTS!
    }
  }

  if (event.gameOver) {
    sfx.fanfare()
    await field?.playGameOver(event.runsScored)
    await moment('gameOver') // GAME OVER!
  } else if (event.inningEnded) {
    await field?.playInningEnd(event.nextInning)
    await next() // NEW INNING!
  }
}
