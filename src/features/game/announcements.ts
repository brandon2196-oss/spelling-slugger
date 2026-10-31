import type { SubmitEvent } from '../../engine/types'

/** The big board text for an event, in the order it should flash. */
export function announcementsFor(event: SubmitEvent): string[] {
  if (event.kind === 'ignored') return []
  if (event.kind === 'strike') return [event.strike === 1 ? 'STRIKE ONE!' : 'STRIKE TWO!']
  const out: string[] = []
  switch (event.outcome) {
    case 'homeRun': out.push('HOME RUN!'); break
    case 'double': out.push('DOUBLE!'); break
    case 'single': out.push('BASE HIT!'); break
    case 'walk': out.push('TAKE YOUR BASE!'); break
    case 'strikeout': out.push('STRIKE THREE!'); break
  }
  if (event.runsScored === 1) out.push('RUN SCORED!')
  else if (event.runsScored > 1) out.push(`${event.runsScored} RUNS SCORED!`)
  if (event.inningEnded) out.push('THREE OUTS!')
  const v = event.visitorRunsThisInning ?? 0
  if (v > 0) out.push(`VISITORS SCORE ${v}!`)
  if (event.gameOver) out.push(resultBoard(event))
  else if (event.inningEnded) out.push('NEW INNING!')
  return out
}

type Done = Extract<SubmitEvent, { kind: 'at-bat-complete' }>

/** Visitors total after this play's reveal. */
const visitorsAfter = (e: Done) => e.visitorsBefore + (e.visitorRunsThisInning ?? 0)

/** A win where the last play's runs were what put the kid level or ahead. */
export function isWalkOff(e: Done): boolean {
  return e.gameResult === 'win' && e.runsScored > 0 && e.homeTotal - e.runsScored < visitorsAfter(e)
}

function resultBoard(e: Done): string {
  if (e.gameResult === 'loss') return 'TOUGH LOSS'
  if (e.gameResult === 'win') return isWalkOff(e) ? 'WALK OFF!' : 'HOME TEAM WINS!'
  return 'GAME OVER!'
}

/** The booth call for the Visitors' reveal, or null when they did not score. */
export function visitorsCall(e: Done): 'visitorsScore' | 'visitorsTie' | 'visitorsLead' | null {
  if (!e.visitorRunsThisInning) return null
  const after = visitorsAfter(e)
  if (after === e.homeTotal) return 'visitorsTie'
  if (after > e.homeTotal && e.visitorsBefore <= e.homeTotal) return 'visitorsLead'
  return 'visitorsScore'
}

/** The kid went from behind to ahead on this play (the Visitors' reveal for this inning comes after). */
export function retookLead(e: Done): boolean {
  return e.runsScored > 0 && e.homeTotal - e.runsScored < e.visitorsBefore && e.homeTotal > e.visitorsBefore
}
