/**
 * The ONE place that turns an engine event into motion, sound and board text, in order.
 * The field may be null (not mounted yet, or mocked in tests); announcements still run.
 */
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
}

export type Announce = (text: string) => Promise<void>

export async function playSequence(
  field: FieldController | null,
  sfx: SequenceSfx,
  announce: Announce,
  event: SubmitEvent,
): Promise<void> {
  if (event.kind === 'ignored') return
  const texts = announcementsFor(event)
  const next = async () => {
    const t = texts.shift()
    if (t) await announce(t)
  }

  await field?.playPitch()

  if (event.kind === 'strike') {
    sfx.whiff()
    await field?.playStrike(event.strike)
    await next() // STRIKE ONE! / STRIKE TWO!
    return
  }

  switch (event.outcome) {
    case 'strikeout':
      sfx.strikeBuzz()
      await field?.playStrike(3)
      await next() // STRIKE THREE!
      break
    case 'walk':
      sfx.walkChime()
      await next() // TAKE YOUR BASE!
      await field?.playWalk(event.basesBefore, event.basesAfter, event.runsScored)
      break
    default:
      sfx.crack()
      await next() // DOUBLE! / BASE HIT!
      await field?.playHit(event.outcome, event.basesBefore, event.basesAfter, event.runsScored)
  }

  if (event.runsScored > 0) {
    sfx.cheer()
    await next() // RUN SCORED!
  }

  if (event.inningEnded) await next() // THREE OUTS!

  if (event.gameOver) {
    sfx.fanfare()
    await field?.playGameOver(event.runsScored)
    await next() // GAME OVER!
  } else if (event.inningEnded) {
    await field?.playInningEnd(event.nextInning)
    await next() // NEW INNING!
  }
}
