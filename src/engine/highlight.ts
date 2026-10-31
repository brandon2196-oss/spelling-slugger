/**
 * The end-of-game highlight pick (fun-overhaul brief 6.4). Pure: the home run with the most runs,
 * else the play that scored the most runs, else the first hit, else nothing.
 */
import { EMPTY_BASES, advance } from './bases'
import type { Bases, GameState, Outcome } from './types'

export interface HighlightPlay {
  position: number
  word: string
  outcome: Extract<Outcome, 'homeRun' | 'double' | 'single' | 'walk'>
  runs: number
  before: Bases
  after: Bases
}

/** Every finished at-bat with the bases before and after, rebuilt in order from the state's log. */
function plays(state: GameState): HighlightPlay[] {
  const byPos = new Map(state.words.map((w) => [w.position, w.text]))
  const out: HighlightPlay[] = []
  let bases: Bases = { ...EMPTY_BASES }
  let outs = 0
  for (const ab of state.atBats) {
    if (ab.outcome === null) continue
    const step = advance(bases, ab.outcome)
    if (ab.outcome !== 'strikeout') out.push({ position: ab.position, word: byPos.get(ab.position) ?? '', outcome: ab.outcome, runs: ab.runsScored, before: bases, after: step.bases })
    bases = step.bases
    if (ab.outcome === 'strikeout' && ++outs >= 3) {
      outs = 0
      bases = { ...EMPTY_BASES }
    }
  }
  return out
}

export function bestPlay(state: GameState): HighlightPlay | null {
  const all = plays(state)
  const most = (xs: HighlightPlay[]) => xs.reduce<HighlightPlay | null>((best, p) => (best === null || p.runs > best.runs ? p : best), null)
  const hr = most(all.filter((p) => p.outcome === 'homeRun'))
  if (hr) return hr
  const scoring = most(all.filter((p) => p.runs > 0))
  if (scoring) return scoring
  return all.find((p) => p.outcome !== 'walk') ?? null
}
