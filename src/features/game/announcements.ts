import type { SubmitEvent } from '../../engine/types'

/** The big board text for an event, in the order it should flash. */
export function announcementsFor(event: SubmitEvent): string[] {
  if (event.kind === 'ignored') return []
  if (event.kind === 'strike') return [event.strike === 1 ? 'STRIKE ONE!' : 'STRIKE TWO!']
  const out: string[] = []
  switch (event.outcome) {
    case 'double': out.push('DOUBLE!'); break
    case 'single': out.push('BASE HIT!'); break
    case 'walk': out.push('TAKE YOUR BASE!'); break
    case 'strikeout': out.push('STRIKE THREE!'); break
  }
  if (event.runsScored === 1) out.push('RUN SCORED!')
  else if (event.runsScored > 1) out.push(`${event.runsScored} RUNS SCORED!`)
  if (event.inningEnded) out.push('THREE OUTS!')
  if (event.gameOver) out.push('GAME OVER!')
  else if (event.inningEnded) out.push('NEW INNING!')
  return out
}
